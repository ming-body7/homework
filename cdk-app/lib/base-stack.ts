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
        cdk.aws_ec2.InstanceSize.SMALL
      ),
    });

    // Reference the existing IAM user by its name
    const existingIamUser = iam.User.fromUserName(this, 'arn:aws:iam::651706779316:user/cdk-user', 'cdk-user'); // Replace with your IAM user name

    // Add the IAM user to the aws-auth ConfigMap with system:masters (admin access)
    cluster.awsAuth.addUserMapping(existingIamUser, {
      username: 'cdk-user',
      groups: ['system:masters'], // Full cluster admin access
    });

    // Define Kubernetes deployment and service manifest
    const appManifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: 'spring-app', namespace: 'default' },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: 'spring-app' } },
        template: {
          metadata: { labels: { app: 'spring-app' } },
          spec: {
            serviceAccountName: 'app-service-account',
            containers: [{
              name: 'spring-app',
              image: `${props.env?.account}.dkr.ecr.${props.env?.region}.amazonaws.com/my-springboot-app:latest`,
              ports: [{ containerPort: 8080 }],
              env: [
                { name: 'CLOUD_AWS_REGION_STATIC', value: props.env?.region }
                //{ name: 'CLOUD_AWS_SQS_QUEUE_NAME', value: queue.queueName }
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
        ports: [{ protocol: 'TCP', port: 80, targetPort: 8080 }],
        type: 'LoadBalancer',
      },
    };

    // Apply the Kubernetes manifest to the cluster
    cluster.addManifest('SpringBootApp', appManifest, serviceManifest);

    const repository = new ecr.Repository(this, 'MyRepository', {
      repositoryName: 'my-springboot-app',
    });
    // Grant the EKS node group permissions to pull from ECR
    repository.grantPull(cluster.defaultNodegroup?.role!);

    // Create service account for pod identity
    const serviceAccount = cluster.addServiceAccount('app-service-account', {
      name: 'app-service-account',
      namespace: 'default'
    });
    // Create SQS Queue
    // const queue = new sqs.Queue(this, 'MessageQueue', {
    //   queueName: `${props.stage}-demo-message-queue`,
    //   visibilityTimeout: cdk.Duration.seconds(300),
    // });

    // Grant SQS permissions to the service account
    // queue.grantConsumeMessages(serviceAccount);
  }
}