import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface BaseStackProps extends cdk.StackProps {
  stage: string;
}

export class BaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    // Create EKS Cluster
    const cluster = new eks.Cluster(this, `${props.stage}Cluster`, {
      version: eks.KubernetesVersion.V1_27,
      defaultCapacity: 2,
      defaultCapacityInstance: cdk.aws_ec2.InstanceType.of(
        cdk.aws_ec2.InstanceClass.T3,
        cdk.aws_ec2.InstanceSize.MICRO
      ),
    });

    // Create SQS Queue
    const queue = new sqs.Queue(this, `${props.stage}Queue`, {
      visibilityTimeout: cdk.Duration.seconds(300),
      queueName: `${props.stage}-queue`,
    });
  }
}