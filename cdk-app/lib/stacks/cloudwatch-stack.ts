import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'

export class CloudWatchStack extends cdk.NestedStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // alarm and sns to notify fraud transaction
    const fraudMetric = new cloudwatch.Metric({
      namespace: 'MySpringbootApp', // Replace with your CloudWatch namespace
      metricName: 'transaction.detector.count',
      dimensionsMap: {
        status: 'fraud', // Filters only data points with status=fraud
      },
      statistic: 'Sum', // Aggregates the sum
      period: cdk.Duration.minutes(5), // 5-minute evaluation window
    });
    new cloudwatch.Alarm(this, 'FraudTransactionAlarm', {
      metric: fraudMetric,
      threshold: 1, // Alarm triggers when sum > 1
      evaluationPeriods: 1, // Evaluates over 1 period (5 minutes)
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'Alarm when transaction.detector.count with status=fraud exceeds 1',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING, // Prevents false alarms
    });
    // Create an SNS Topic for alarm notifications
    const alarmTopic = new sns.Topic(this, 'FraudTransactionTopic', {
      displayName: 'CloudWatch Alarm Notifications',
    });
  }
}