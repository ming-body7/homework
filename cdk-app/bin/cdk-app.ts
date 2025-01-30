#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BaseStack } from '../lib/base-stack';
import { BootstrapStack } from '../lib/bootstrap-stack';

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
    account: '651706779316',
    region: 'us-west-2',
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