import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export class BootstrapStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        //move eks to bootstrap stack to enable springboot app push image
        const repository = new ecr.Repository(this, 'MyRepository', {
            repositoryName: 'my-springboot-app',
        });
    }
}