import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export interface BaseStackProps extends cdk.StackProps {
  stage: string;
}

export class BaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    // Create SQS Queue
    const queue = new sqs.Queue(this, 'MessageQueue', {
      queueName: `${props.stage}-demo-message-queue`,
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    // Create EKS Cluster
    const cluster = new eks.Cluster(this, `${props.stage}Cluster`, {
      version: eks.KubernetesVersion.V1_27,
      defaultCapacity: 2,
      defaultCapacityInstance: cdk.aws_ec2.InstanceType.of(
        cdk.aws_ec2.InstanceClass.T3,
        cdk.aws_ec2.InstanceSize.MICRO
      ),
    });

    // EKS deployment (Kubernetes manifest) for Spring Boot app
    const appDeployment = cluster.addHelmChart('springboot-app', {
      chart: 'my-springboot-app',
      namespace: 'default',
      values: {
        stage: props.stage, // 'beta' or 'prod' pass to k8s
        image: 'my-springboot-app:latest',
        replicas: 3,
      },
    });

    // Create service account for pod identity
    const serviceAccount = cluster.addServiceAccount('app-service-account', {
      name: 'app-service-account',
      namespace: 'default'
    });

    // Grant SQS permissions to the service account
    queue.grantConsumeMessages(serviceAccount);

    // Add deployment manifest
    cluster.addManifest('app-deployment', {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: 'spring-app', namespace: 'default' },
      spec: {
        replicas: 2,
        selector: { matchLabels: { app: 'spring-app' } },
        template: {
          metadata: { labels: { app: 'spring-app' } },
          spec: {
            serviceAccountName: 'app-service-account',
            containers: [{
              name: 'spring-app',
              image: `${props.env?.account}.dkr.ecr.${props.env?.region}.amazonaws.com/spring-app:latest`,
              ports: [{ containerPort: 8080 }],
              env: [
                { name: 'CLOUD_AWS_REGION_STATIC', value: props.env?.region },
                { name: 'CLOUD_AWS_SQS_QUEUE_NAME', value: queue.queueName }
              ]
            }]
          }
        }
      }
    });


    const repository = new ecr.Repository(this, 'MyRepository', {
      repositoryName: 'my-springboot-app',
    });
  }
}