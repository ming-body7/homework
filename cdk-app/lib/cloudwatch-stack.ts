import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { BaseStack, BaseStackProps } from './base-stack';

export interface CloudWatchStackProps extends BaseStackProps {
  // Add any CloudWatch-specific props here
}

export class CloudWatchStack extends BaseStack {
  constructor(scope: Construct, id: string, props: CloudWatchStackProps) {
    super(scope, id, props);

    // Create CloudWatch dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'MainDashboard', {
      dashboardName: 'MainDashboard'
    });

    // Add CPU utilization widget
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'CPU Utilization',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/EC2',
            metricName: 'CPUUtilization',
            statistic: 'Average',
            period: cdk.Duration.minutes(5)
          })
        ],
        width: 12
      }),
      new cloudwatch.GraphWidget({
        title: 'Memory Usage',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/EC2',
            metricName: 'MemoryUtilization',
            statistic: 'Average',
            period: cdk.Duration.minutes(5)
          })
        ],
        width: 12
      })
    );
  }
}