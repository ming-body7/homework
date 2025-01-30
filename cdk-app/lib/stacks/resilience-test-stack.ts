import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as fis from 'aws-cdk-lib/aws-fis';
import * as eks from 'aws-cdk-lib/aws-eks';

// FIS resilience test
export class ResilienceTestStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: cdk.StackProps & { cluster: eks.Cluster }) {
        super(scope, id, props);

        const fisExperimentRole = new iam.Role(this, 'FISExperimentRole', {
            assumedBy: new iam.ServicePrincipal('fis.amazonaws.com'), // FIS service assumes this role
            description: 'Role for AWS Fault Injection Simulator (FIS) experiments',
        });
        fisExperimentRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    'fis:CreateExperimentTemplate',
                    'fis:StartExperiment',
                    'fis:StopExperiment',
                    'fis:ListExperiments',
                    'fis:GetExperiment',
                ],
                resources: ['*'], // Restrict resource access as needed
            })
        );

        fisExperimentRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    'eks:*',
                    'ec2:*',
                ],
                resources: ['*'], // Restrict resource access as needed
            })
        );

        // Targets
        const targetEKSCluster: fis.CfnExperimentTemplate.ExperimentTemplateTargetProperty =
            {
                resourceType: "aws:eks:nodegroup",
                selectionMode: "ALL",
                resourceArns: [props.cluster.defaultNodegroup?.nodegroupArn || 'should not reach here'],
            };

        // Actions
        const terminateNodeGroupInstance: fis.CfnExperimentTemplate.ExperimentTemplateActionProperty =
            {
                actionId: "aws:eks:terminate-nodegroup-instances",
                parameters: {
                    instanceTerminationPercentage: "50",
                },
                targets: {
                    Nodegroups: "nodeGroupTarget",
                },
            };

        // Experiments
        const templateEksTerminateNodeGroup = new fis.CfnExperimentTemplate(
            this,
            "fis-eks-terminate-node-group",
            {
                description:
                    "Terminate 50 per cent instances on the EKS target node group.",
                roleArn: fisExperimentRole.roleArn,
                stopConditions: [
                    //TODO: update to other alarm like CPU/MEM/Availibality
                    {
                        "source": "none"
                    },
                ],
                tags: {
                    Name: "Terminate 50 per cent instances on the EKS target node group",
                    Stackname: props.cluster.clusterName,
                },
                actions: {
                    nodeGroupActions: terminateNodeGroupInstance,
                },
                targets: {
                    nodeGroupTarget: targetEKSCluster,
                },
            }
        );

        templateEksTerminateNodeGroup.node.addDependency(props.cluster.awsAuth);
    }
}