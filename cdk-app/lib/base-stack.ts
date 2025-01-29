import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
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
      defaultCapacity: 1,
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
        replicas: 1,
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
        input: {
          enabled: true,
          path: '/var/log/containers/application*.log',
        },
        cloudWatchLogs: {
          enabled: true,
          region: props.env?.region,
          logGroupName: '/MySpringbootApp',
          logStreamName: 'application-logs',
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

    // Create an SNS Topic for alarm notifications
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: 'CloudWatch Alarm Notifications',
    });

    // Add an email subscription to the SNS topic
    // alarmTopic.addSubscription(
    //     new snsSubscriptions.EmailSubscription('your-email@example.com')
    // );

    // Define a CloudWatch metric (e.g., CPUUtilization)
    const cpuUtilizationMetric = new cloudwatch.Metric({
      namespace: 'AWS/EC2',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        InstanceId: 'i-1234567890abcdef', // Replace with your instance ID
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    // Create a CloudWatch alarm for the metric
   const highCpuAlarm = new cloudwatch.Alarm(this, 'HighCpuAlarm', {
      metric: cpuUtilizationMetric,
      threshold: 80, // Trigger when CPU utilization is >80%
      evaluationPeriods: 3, // Number of periods to evaluate before triggering
      datapointsToAlarm: 2, // Number of datapoints within evaluation periods to trigger the alarm
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'Alarm if CPU utilization exceeds 80% for EC2 instance.',
      actionsEnabled: true
    });

    const stopConditionArn = highCpuAlarm.alarmArn; //need update to eks or service alarm

    // Targets
    const targetEKSCluster: fis.CfnExperimentTemplate.ExperimentTemplateTargetProperty =
        {
          resourceType: "aws:eks:nodegroup",
          selectionMode: "ALL",
          resourceTags: {
            "eksctl.cluster.k8s.io/v1alpha1/cluster-name":
                cluster.toString(),
          },
        };

    // Actions
    const terminateNodeGroupInstance: fis.CfnExperimentTemplate.ExperimentTemplateActionProperty =
        {
          actionId: "aws:eks:terminate-nodegroup-instances",
          parameters: {
            instanceTerminationPercentage: "50",
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
            {
              source: "aws:cloudwatch:alarm",
              value: stopConditionArn.toString(),
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