import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseStack, BaseStackProps } from './base-stack';
import * as logs from 'aws-cdk-lib/aws-logs';


export interface CloudWatchStackProps extends BaseStackProps {
  // Add any CloudWatch-specific props here
}

export class CloudWatchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CloudWatchStackProps) {
    super(scope, id, props);

    // Create a CloudWatch Log Group
    // const logGroup = new logs.LogGroup(this, 'MyApplicationLogGroup', {
    //   logGroupName: '/MyApplicationLogs',
    //   retention: logs.RetentionDays.ONE_WEEK, // Automatically delete logs older than one week
    //   removalPolicy: cdk.RemovalPolicy.DESTROY, // Automatically delete the log group when the stack is deleted
    // });
  }
}