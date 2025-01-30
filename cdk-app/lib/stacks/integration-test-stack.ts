import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export class IntegrationTestStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: cdk.StackProps & { cluster: eks.Cluster, queue:  sqs.Queue}) {
        super(scope, id, props);

        const integrationTestServiceAccount = props.cluster.addServiceAccount('IntegrationTestServiceAccount', {
            name: 'integration-test-sa',
            namespace: 'default',
        });
        const sqsAdminPolicy = new iam.PolicyStatement({
            actions:  [
                "sqs:*"
            ],
            resources: [props.queue.queueArn]
        });
        const cloudWatchLogsPolicy = new iam.PolicyStatement({
            actions: [
                'logs:DescribeLogStreams',
                'logs:FilterLogEvents' //add for integration test
            ],
            resources: ["arn:aws:logs:*:*:*"]
        });
        integrationTestServiceAccount.addToPrincipalPolicy(cloudWatchLogsPolicy);
        integrationTestServiceAccount.addToPrincipalPolicy(sqsAdminPolicy);
        integrationTestServiceAccount.node.addDependency(props.cluster);
    }
}