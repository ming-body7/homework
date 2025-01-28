import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { KubectlV28Layer } from '@aws-cdk/lambda-layer-kubectl-v28';
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
      version: eks.KubernetesVersion.V1_28,
      kubectlLayer: new KubectlV28Layer(this, 'KubectlLayer'),
      vpc: vpc,
      vpcSubnets: [{ subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      defaultCapacity: 1,
      defaultCapacityInstance: cdk.aws_ec2.InstanceType.of(
        cdk.aws_ec2.InstanceClass.T3,
        cdk.aws_ec2.InstanceSize.XLARGE
      ),
    });

    // T3 type host use EBS, need EBS CSI Driver
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

    // Attach the IAM policy to the service account
    const ebsServiceAccount = cluster.addServiceAccount('EBSServiceAccount', {
      name: 'ebs-csi-controller-sa',
      namespace: 'kube-system'
    });
    ebsServiceAccount.addToPrincipalPolicy(ebsPolicy);

    // Add the Helm chart for the EBS CSI Driver
    const ebsCsiDriver = cluster.addHelmChart('aws-ebs-csi-driver', {
      chart: 'aws-ebs-csi-driver',
      repository: 'https://kubernetes-sigs.github.io/aws-ebs-csi-driver',
      namespace: 'kube-system',
      release: 'aws-ebs-csi-driver',
      values: {
        controller: {
          replicas: 1,
          serviceAccount: {
            create: false,
            name: 'ebs-csi-controller-sa',
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

    // Reference the existing IAM user by its name
    const existingIamUser = iam.User.fromUserName(this, `arn:aws:iam::${props.env?.account}:user/cdk-user`, 'cdk-user'); // Replace with your IAM user name

    // Add the IAM user to the aws-auth ConfigMap with system:masters (admin access)
    cluster.awsAuth.addUserMapping(existingIamUser, {
      username: 'cdk-user',
      groups: ['system:masters'], // Full cluster admin access
    });

    // Define Kubernetes deployment and service manifest
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
            serviceAccountName: 'app-service-account',
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

    // ClusterIP Service for Prometheus
    const metricsServiceManifest = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: 'springboot-app-internal' },
      spec: {
        type: 'ClusterIP',
        ports: [{ protocol: 'TCP', port: 8080, targetPort: 8080 }],
        selector: { app: 'springboot-app' },
      },
    };

    // Apply the Kubernetes manifest to the cluster
    const springBootApp = cluster.addManifest('SpringBootApp', appManifest, serviceManifest, metricsServiceManifest);


    // Grant the EKS node group permissions to pull from ECR
    const repository = ecr.Repository.fromRepositoryArn(this, "id", "arn:aws:ecr:us-west-2:651706779316:repository/my-springboot-app");
    repository.grantPull(cluster.defaultNodegroup?.role!);

    // Create service account for pod identity
    const serviceAccount = cluster.addServiceAccount('app-service-account', {
      name: 'app-service-account',
      namespace: 'default'
    });

    // Grant SQS permissions to the service account
    queue.grantConsumeMessages(serviceAccount);

    springBootApp.node.addDependency(serviceAccount);

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
          tail: {
            enabled: true,
            path: '/var/log/containers/*.log',
          },
        },
        cloudWatch: {
          enabled: true,
          region: props.env?.region,
          logGroup: '/aws/container-logs/application',
          logStreamPrefix: 'kube/',
          autoCreateGroup: true,
        }
      }
    });

    // Add Prometheus Helm chart with custom config
    const monitoringNameSpace = cluster.addManifest('MonitoringNamespace', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'monitoring' },
    });


    // Deploy Prometheus using Helm and mount the ConfigMap
    const prometheusChart = cluster.addHelmChart('PrometheusChart', {
      chart: 'prometheus',
      repository: 'https://prometheus-community.github.io/helm-charts',
      release: 'prometheus',
      namespace: 'monitoring',
      createNamespace: true,
      values: {
        server: {
          service: {
            type: 'ClusterIP', // Change to LoadBalancer if external access is required
            port: 9090,
            targetPort: 9090,
          },
        },
        extraScrapeConfigs: `
- job_name: "springboot"
  metrics_path: "/actuator/prometheus"
  static_configs:
    - targets: 
      - springboot-app-internal.default.svc.cluster.local:8080`
      },
    });
    prometheusChart.node.addDependency(monitoringNameSpace);

    //Integration test setup
    repository.grantPull(cluster.defaultNodegroup?.role!);
  }
}