import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';

export class ObservabilityStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: cdk.StackProps & { cluster: eks.Cluster }) {
        super(scope, id, props);

        const fluentBitServiceAccount = props.cluster.addServiceAccount('FluentBitServiceAccount', {
            name: 'fluent-bit',
            namespace: 'kube-system',
        });
        // Define CloudWatch Logs policy
        const cloudWatchLogsPolicy = new iam.PolicyStatement({
            actions: [
                "logs:CreateLogGroup",
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogStreams',
                'logs:FilterLogEvents' //add for integration test
            ],
            resources: ["arn:aws:logs:*:*:*"]
        });
        fluentBitServiceAccount.addToPrincipalPolicy(cloudWatchLogsPolicy);
        fluentBitServiceAccount.node.addDependency(props.cluster.awsAuth);

        const fluentBitHelmChart = props.cluster.addHelmChart('FluentBit', {
            chart: 'aws-for-fluent-bit',
            release: 'fluent-bit',
            repository: 'https://aws.github.io/eks-charts',
            namespace: 'kube-system',
            values: {
                serviceAccount: {
                    create: false,
                    name: fluentBitServiceAccount.serviceAccountName,
                },
                cloudWatch: {
                    enabled: true,
                    region: props.env?.region,
                    autoCreateGroup: true,
                }
            }
        });

        // cloudwatch metrics
        const cloudWatchServiceAccount = props.cluster.addServiceAccount('cloudwatch-sa', {
            name: 'cloudwatch-service-account',
            namespace: 'kube-system'
        });

        cloudWatchServiceAccount.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentAdminPolicy'));
        cloudWatchServiceAccount.node.addDependency(props.cluster.awsAuth);

        const cloudwatchChart = props.cluster.addHelmChart('CloudwatchAgent', {
            chart: 'aws-cloudwatch-metrics',
            repository: 'https://aws.github.io/eks-charts',
            namespace: 'kube-system',
            createNamespace: false,
            values: {
                clusterName: props.cluster.clusterName,
                serviceAccount: {
                    create: false,
                    name: cloudWatchServiceAccount.serviceAccountName,
                },
            }
        });
        cloudwatchChart.node.addDependency(cloudWatchServiceAccount);
    }
}