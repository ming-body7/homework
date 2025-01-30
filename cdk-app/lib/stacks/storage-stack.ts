import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as eks from 'aws-cdk-lib/aws-eks';

export class StorageStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: cdk.StackProps & { cluster: eks.Cluster }) {
        super(scope, id, props);

        // T3 type host use EBS, need EBS CSI Driver
        const ebsServiceAccount = props.cluster.addServiceAccount('EBSServiceAccount', {
            name: 'ebs-csi-controller-sa',
            namespace: 'kube-system',
        });
        // need eks cluster awsauth ready to execute service account creation
        ebsServiceAccount.node.addDependency(props.cluster);

        const ebsPolicy = new iam.PolicyStatement({
            actions: [
                'ec2:CreateVolume',
                'ec2:AttachVolume',
                'ec2:DeleteVolume',
                'ec2:DetachVolume',
                'ec2:DescribeVolumes',
                'ec2:DescribeVolumeAttribute',
                'ec2:DescribeVolumeStatus',
                'ec2:DescribeInstances',
                'ec2:DescribeSnapshots',
                'ec2:CreateTags',
                'ec2:DeleteTags',
            ],
            resources: ['*'],
        });
        ebsServiceAccount.addToPrincipalPolicy(ebsPolicy);

        const ebsCsiDriver = props.cluster.addHelmChart('aws-ebs-csi-driver', {
            chart: 'aws-ebs-csi-driver',
            repository: 'https://kubernetes-sigs.github.io/aws-ebs-csi-driver',
            namespace: 'kube-system',
            release: 'aws-ebs-csi-driver',
            values: {
                controller: {
                    replicaCount: 1,  //increase if need
                    serviceAccount: {
                        create: false,
                        name: ebsServiceAccount.serviceAccountName,
                    },
                },
            },
        });
        ebsCsiDriver.node.addDependency(ebsServiceAccount);
    }
}