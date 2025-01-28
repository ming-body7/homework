#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BaseStack } from '../lib/base-stack';
import { BootstrapStack } from '../lib/bootstrap-stack';
import { CloudWatchStack } from '../lib/cloudwatch-stack';

const app = new cdk.App();

new BootstrapStack(app, 'BoostrapStack', {
  env: {
    account: '651706779316',
    region: 'us-west-2',
  },
});

// Deploy beta stage
new BaseStack(app, 'BetaStack', {
  stage: 'beta',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new CloudWatchStack(app, 'BetaCloudWatchStack', {
  stage: 'beta',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Deploy prod stage
new BaseStack(app, 'ProdStack', {
  stage: 'prod',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new CloudWatchStack(app, 'ProdCloudWatchStack', {
  stage: 'prod',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});