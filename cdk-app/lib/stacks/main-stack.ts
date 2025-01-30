import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { KubectlV31Layer } from '@aws-cdk/lambda-layer-kubectl-v31';

export interface MainStackProps extends cdk.StackProps {
    stage: string;
}

export class MainStack extends cdk.NestedStack {
    public readonly vpc: ec2.Vpc;
    public readonly cluster: eks.Cluster;
    public readonly sqsQueue: sqs.Queue;
    public readonly baseIamUser: iam.IUser;
    public readonly repository: ecr.IRepository

    constructor(scope: Construct, id: string, props: MainStackProps) {
        super(scope, id, props);

        this.vpc = new ec2.Vpc(this, 'EksVpc', {
            maxAzs: 2,
            natGateways: 1,
            subnetConfiguration: [
                { cidrMask: 24, name: 'Public', subnetType: ec2.SubnetType.PUBLIC },
                { cidrMask: 24, name: 'Private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            ],
        });

        this.cluster = new eks.Cluster(this, 'EKSCluster', {
            version: eks.KubernetesVersion.V1_31,
            kubectlLayer: new KubectlV31Layer(this, 'KubectlLayer'),
            vpc: this.vpc,
            vpcSubnets: [{ subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS }],
            defaultCapacity: 3,
            defaultCapacityInstance: cdk.aws_ec2.InstanceType.of(
                cdk.aws_ec2.InstanceClass.T3,
                cdk.aws_ec2.InstanceSize.XLARGE
            ),
        });

        // Create SQS Queue
        this.sqsQueue = new sqs.Queue(this, 'MessageQueue', {
            queueName: `${props.stage}-demo-message-queue`,
            visibilityTimeout: cdk.Duration.seconds(300),
        });
        this.cluster.env.region
        this.baseIamUser = iam.User.fromUserName(this, `arn:aws:iam::${this.cluster.env.region}:user/cdk-user`, 'cdk-user');

        // Add the IAM user to the aws-auth ConfigMap with system:masters (admin access)
        this.cluster.awsAuth.addUserMapping(this.baseIamUser, {
            username: 'cdk-user',
            groups: ['system:masters'], // Full cluster admin access
        });

        // Grant the EKS node group permissions to pull from ECR
        this.repository = ecr.Repository.fromRepositoryArn(this, "id", "arn:aws:ecr:us-west-2:651706779316:repository/my-springboot-app");
        this.repository.grantPull(this.cluster.defaultNodegroup?.role!);


        //Springboot
        const appServiceAccount = this.cluster.addServiceAccount('app-service-account', {
            name: 'app-service-account',
            namespace: 'default'
        });
        appServiceAccount.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentAdminPolicy'));

        appServiceAccount.node.addDependency(this.cluster.awsAuth);
        // Grant SQS permissions to the service account
        this.sqsQueue.grantConsumeMessages(appServiceAccount);
        const springBootAppDeployment = {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: { name: 'springboot-app', namespace: 'default' },
            spec: {
                replicas: 2,
                selector: { matchLabels: { app: 'springboot-app' } },
                template: {
                    metadata: { labels: { app: 'springboot-app' } },
                    spec: {
                        serviceAccountName: appServiceAccount.serviceAccountName,
                        containers: [{
                            name: 'springboot-app',
                            image: `${props.env?.account}.dkr.ecr.${this.cluster.env.region}.amazonaws.com/my-springboot-app:latest`,
                            ports: [{ containerPort: 8080 }],
                            env: [
                                { name: 'CLOUD_AWS_REGION_STATIC', value: this.cluster.env.region },
                                { name: 'CLOUD_AWS_SQS_QUEUE_NAME', value: this.sqsQueue.queueName }
                            ]
                        }]
                    }
                }
            }
        };


        //required by HPA
        const metricsService = this.cluster.addHelmChart('MetricsServer', {
            chart: 'metrics-server',
            repository: 'https://kubernetes-sigs.github.io/metrics-server/',
            namespace: 'kube-system',
        });

        const springBootAppHPA = {
            apiVersion: 'autoscaling/v2',
            kind: 'HorizontalPodAutoscaler',
            metadata: {
                name: 'springboot-hpa',
                namespace: 'default', // Change if using a different namespace
            },
            spec: {
                scaleTargetRef: {
                    apiVersion: 'apps/v1',
                    kind: 'Deployment',
                    name: 'springboot-app', // Ensure this matches your Deployment name
                },
                minReplicas: 2,
                maxReplicas: 10,
                metrics: [
                    {
                        type: 'Resource',
                        resource: {
                            name: 'cpu',
                            target: {
                                type: 'Utilization',
                                averageUtilization: 50, // Scale if CPU utilization exceeds 50%
                            },
                        },
                    },
                ],
            },
        };


        const springBootAppService = {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: { name: 'springboot-app-service' },
            spec: {
                selector: { app: 'springboot-app' },
                ports: [
                    {protocol: 'TCP', port: 80, targetPort: 8080 }
                ],
                type: 'LoadBalancer',
            },
        };

        // Apply the Kubernetes manifest to the cluster
        const springBootApp = this.cluster.addManifest('SpringBootApp', springBootAppDeployment, springBootAppHPA, springBootAppService);
        springBootApp.node.addDependency(appServiceAccount);
        appServiceAccount.node.addDependency(this.cluster.awsAuth);

    }
}