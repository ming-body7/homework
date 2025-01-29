import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import { aws_fis as fis } from "aws-cdk-lib";
import { KubectlV31Layer } from '@aws-cdk/lambda-layer-kubectl-v31';
import { Construct } from 'constructs';

export interface BaseStackProps extends cdk.StackProps {
  stage: string;
}

export class BaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    // Create VPC for EKS
    const vpc = new cdk.aws_ec2.Vpc(this, `${props.stage}EksVpc`, {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Create EKS Cluster
    const cluster = new eks.Cluster(this, `${props.stage}Cluster`, {
      version: eks.KubernetesVersion.V1_31,
      kubectlLayer: new KubectlV31Layer(this, 'KubectlLayer'),
      vpc: vpc,
      vpcSubnets: [{ subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      defaultCapacity: 3,
      defaultCapacityInstance: cdk.aws_ec2.InstanceType.of(
        cdk.aws_ec2.InstanceClass.T3,
        cdk.aws_ec2.InstanceSize.XLARGE
      ),
    });

    // Reference the existing IAM user by its name
    const existingIamUser = iam.User.fromUserName(this, `arn:aws:iam::${props.env?.account}:user/cdk-user`, 'cdk-user'); // Replace with your IAM user name

    // Add the IAM user to the aws-auth ConfigMap with system:masters (admin access)
    cluster.awsAuth.addUserMapping(existingIamUser, {
      username: 'cdk-user',
      groups: ['system:masters'], // Full cluster admin access
    });

    // T3 type host use EBS, need EBS CSI Driver
    const ebsServiceAccount = cluster.addServiceAccount('EBSServiceAccount', {
      name: 'ebs-csi-controller-sa',
      namespace: 'kube-system',
    });
    // Create IAM Policy for the EBS CSI Driver
    const ebsPolicy = new iam.PolicyStatement({
      actions: [
        'ec2:CreateVolume',
        'ec2:AttachVolume',
        'ec2:DeleteVolume',
        'ec2:DetachVolume',
        'ec2:DescribeVolumes',
        'ec2:DescribeVolumeAttribute',
        'ec2:DescribeVolumeStatus',
        'ec2:DescribeInstances',
        'ec2:DescribeSnapshots',
        'ec2:CreateTags',
        'ec2:DeleteTags',
      ],
      resources: ['*'],
    });
    ebsServiceAccount.addToPrincipalPolicy(ebsPolicy);
    ebsServiceAccount.node.addDependency(cluster.awsAuth);
    // Add the Helm chart for the EBS CSI Driver
    const ebsCsiDriver = cluster.addHelmChart('aws-ebs-csi-driver', {
      chart: 'aws-ebs-csi-driver',
      repository: 'https://kubernetes-sigs.github.io/aws-ebs-csi-driver',
      namespace: 'kube-system',
      release: 'aws-ebs-csi-driver',
      values: {
        controller: {
          replicaCount: 1,  //increase if need
          serviceAccount: {
            create: false,
            name: ebsServiceAccount.serviceAccountName,
          },
        },
      },
    });
    ebsCsiDriver.node.addDependency(ebsServiceAccount);

    // Create SQS Queue
    const queue = new sqs.Queue(this, 'MessageQueue', {
      queueName: `${props.stage}-demo-message-queue`,
      visibilityTimeout: cdk.Duration.seconds(300),
    });


    // Define Kubernetes deployment and service manifest
    // Create service account for pod identity
    const appServiceAccount = cluster.addServiceAccount('app-service-account', {
      name: 'app-service-account',
      namespace: 'default'
    });
    appServiceAccount.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentAdminPolicy'));
    appServiceAccount.node.addDependency(cluster.awsAuth);
    // Grant SQS permissions to the service account
    queue.grantConsumeMessages(appServiceAccount);
    const appManifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: 'springnoot-app', namespace: 'default' },
      spec: {
        replicas: 2,
        selector: { matchLabels: { app: 'springboot-app' } },
        template: {
          metadata: { labels: { app: 'springboot-app' } },
          spec: {
            serviceAccountName: appServiceAccount.serviceAccountName,
            containers: [{
              name: 'springboot-app',
              image: `${props.env?.account}.dkr.ecr.${props.env?.region}.amazonaws.com/my-springboot-app:latest`,
              ports: [{ containerPort: 8080 }],
              env: [
                { name: 'CLOUD_AWS_REGION_STATIC', value: props.env?.region },
                { name: 'CLOUD_AWS_SQS_QUEUE_NAME', value: queue.queueName }
              ]
            }]
          }
        }
      }
    };

    const serviceManifest = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: 'springboot-app-service' },
      spec: {
        selector: { app: 'springboot-app' },
        ports: [
            {protocol: 'TCP', port: 80, targetPort: 8080 }
        ],
        type: 'LoadBalancer',
      },
    };


    // Apply the Kubernetes manifest to the cluster
    const springBootApp = cluster.addManifest('SpringBootApp', appManifest, serviceManifest);
    springBootApp.node.addDependency(appServiceAccount);

    // Grant the EKS node group permissions to pull from ECR
    const repository = ecr.Repository.fromRepositoryArn(this, "id", "arn:aws:ecr:us-west-2:651706779316:repository/my-springboot-app");
    repository.grantPull(cluster.defaultNodegroup?.role!);


    const fluentBitServiceAccount = cluster.addServiceAccount('FluentBitServiceAccount', {
      name: 'fluent-bit',
      namespace: 'kube-system',
    });
    // Define CloudWatch Logs policy
    const cloudWatchLogsPolicy = new iam.PolicyStatement({
      actions: [
        "logs:CreateLogGroup",
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogStreams',
        'logs:FilterLogEvents' //add for integration test
      ],
      resources: ["arn:aws:logs:*:*:*"]
    });
    fluentBitServiceAccount.addToPrincipalPolicy(cloudWatchLogsPolicy);
    fluentBitServiceAccount.node.addDependency(cluster.awsAuth);
    //use helm to install fluent-bit
    const fluentBitHelmChart = cluster.addHelmChart('FluentBit', {
      chart: 'aws-for-fluent-bit',
      release: 'fluent-bit',
      repository: 'https://aws.github.io/eks-charts',
      namespace: 'kube-system',
      values: {
        serviceAccount: {
          create: false,
          name: fluentBitServiceAccount.serviceAccountName,
        },
        cloudWatch: {
          enabled: true,
          region: props.env?.region,
          autoCreateGroup: true,
        }
      }
    });

    const integrationTestServiceAccount = cluster.addServiceAccount('IntegrationTestServiceAccount', {
      name: 'integration-test-sa',
      namespace: 'default',
    });
    const sqsAdminPolicy = new iam.PolicyStatement({
      actions:  [
        "sqs:*"
      ],
      resources: [queue.queueArn]
    });
    integrationTestServiceAccount.addToPrincipalPolicy(cloudWatchLogsPolicy);
    integrationTestServiceAccount.addToPrincipalPolicy(sqsAdminPolicy);
    integrationTestServiceAccount.node.addDependency(cluster.awsAuth);
    // cloudwatch metrics
    const cloudWatchServiceAccount = cluster.addServiceAccount('cloudwatch-sa', {
      name: 'cloudwatch-service-account',
      namespace: 'kube-system'
    });

    cloudWatchServiceAccount.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentAdminPolicy'));
    cloudWatchServiceAccount.node.addDependency(cluster.awsAuth);

    const cloudwatchChart = cluster.addHelmChart('CloudwatchAgent', {
      chart: 'aws-cloudwatch-metrics',
      repository: 'https://aws.github.io/eks-charts',
      namespace: 'kube-system',
      createNamespace: false,
      values: {
        clusterName: cluster.clusterName,
        serviceAccount: {
          create: false,
          name: cloudWatchServiceAccount.serviceAccountName,
        },
      }
    });
    cloudwatchChart.node.addDependency(cloudWatchServiceAccount);

    //Integration test setup
    repository.grantPull(cluster.defaultNodegroup?.role!);

    //Resilience test setup
    // Import FIS Role and Stop Condition
    // Create a new IAM Role
    const fisExperimentRole = new iam.Role(this, 'FISExperimentRole', {
      assumedBy: new iam.ServicePrincipal('fis.amazonaws.com'), // FIS service assumes this role
      description: 'Role for AWS Fault Injection Simulator (FIS) experiments',
    });

    // Add permissions to the role
    fisExperimentRole.addToPolicy(
        new iam.PolicyStatement({
          actions: [
            'fis:CreateExperimentTemplate',
            'fis:StartExperiment',
            'fis:StopExperiment',
            'fis:ListExperiments',
            'fis:GetExperiment',
          ],
          resources: ['*'], // Restrict resource access as needed
        })
    );

    // Optional: Add additional permissions, such as for managing EKS resources
    fisExperimentRole.addToPolicy(
        new iam.PolicyStatement({
          actions: [
            'eks:DescribeCluster',
            'eks:ListClusters',
            'eks:AccessKubernetesApi',
          ],
          resources: ['*'], // Restrict resource access as needed
        })
    );

    // alarm and sns to notify fraud transaction
    const fraudMetric = new cloudwatch.Metric({
      namespace: 'MySpringbootApp', // Replace with your CloudWatch namespace
      metricName: 'transaction.detector.count',
      dimensionsMap: {
        status: 'fraud', // Filters only data points with status=fraud
      },
      statistic: 'Sum', // Aggregates the sum
      period: cdk.Duration.minutes(5), // 5-minute evaluation window
    });
    new cloudwatch.Alarm(this, 'FraudTransactionAlarm', {
      metric: fraudMetric,
      threshold: 1, // Alarm triggers when sum > 1
      evaluationPeriods: 1, // Evaluates over 1 period (5 minutes)
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'Alarm when transaction.detector.count with status=fraud exceeds 1',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING, // Prevents false alarms
    });
    // Create an SNS Topic for alarm notifications
    const alarmTopic = new sns.Topic(this, 'FraudTransactionTopic', {
      displayName: 'CloudWatch Alarm Notifications',
    });


    // FIS resilience test
    // Targets
    const targetEKSCluster: fis.CfnExperimentTemplate.ExperimentTemplateTargetProperty =
        {
          resourceType: "aws:eks:nodegroup",
          selectionMode: "ALL",
          resourceTags: {
            "aws:cloudformation:stack-name":
                this.stackId,
          },
        };


    // Actions
    const terminateNodeGroupInstance: fis.CfnExperimentTemplate.ExperimentTemplateActionProperty =
        {
          actionId: "aws:eks:terminate-nodegroup-instances",
          parameters: {
            instanceTerminationPercentage: "40",
          },
          targets: {
            Nodegroups: "nodeGroupTarget",
          },
        };

    // Experiments
    const templateEksTerminateNodeGroup = new fis.CfnExperimentTemplate(
        this,
        "fis-eks-terminate-node-group",
        {
          description:
              "Terminate 50 per cent instances on the EKS target node group.",
          roleArn: fisExperimentRole.roleArn.toString(),
          stopConditions: [
              //TODO: update to other alarm like CPU/MEM/Availibality
            {
              "source": "aws:fis:experiment",
              "value": "duration=300"
            },
          ],
          tags: {
            Name: "Terminate 50 per cent instances on the EKS target node group",
            Stackname: this.stackName,
          },
          actions: {
            nodeGroupActions: terminateNodeGroupInstance,
          },
          targets: {
            nodeGroupTarget: targetEKSCluster,
          },
        }
    );
  }
}