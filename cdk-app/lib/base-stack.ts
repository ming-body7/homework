import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { MainStack } from './stacks/main-stack';
import { ObservabilityStack } from './stacks/observability-stack';
import { ResilienceTestStack } from './stacks/resilience-test-stack';
import { StorageStack } from './stacks/storage-stack';
import { CloudWatchStack } from './stacks/cloudwatch-stack';
import { IntegrationTestStack } from './stacks/integration-test-stack';


export interface BaseStackProps extends cdk.StackProps {
  stage: string;
}

export class BaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const infraStack = new MainStack(this, 'MainStack', {
      stage: props.stage,
      env: props.env
    });

    const storageStack = new StorageStack(this, 'StorageStack', {
      cluster: infraStack.cluster,
    });

    const cloudwatchStack = new CloudWatchStack(this, 'CloudWatchStack');
    const observabilityStack = new ObservabilityStack(this, 'ObservabilityStack', {
      cluster: infraStack.cluster
    });

    // Create Integration Test Stack, depends on EKS Stack
    const integrationTestStack = new IntegrationTestStack(this, 'IntegrationTestStack', {
      cluster: infraStack.cluster,
      queue: infraStack.sqsQueue
    });


    // Create Resilience Test Stack, depends on EKS Stack
    const resilienceTestStack = new ResilienceTestStack(this, 'ResilienceTestStack', {
      cluster: infraStack.cluster,
    });

    storageStack.addDependency(infraStack);
    observabilityStack.addDependency(infraStack);
    cloudwatchStack.addDependency(infraStack);
    integrationTestStack.addDependency(infraStack);
    resilienceTestStack.addDependency(infraStack);
  }
}