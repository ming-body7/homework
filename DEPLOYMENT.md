# Deployment Guide

This guide explains how to deploy the Spring Boot application that processes SQS messages on EKS.

## Prerequisites

1. AWS CLI installed and configured
2. Docker installed
3. kubectl installed
4. Maven installed
5. Node.js and npm installed (for CDK)
6. Add User: cdk-user in AWS IAM with Admin Policy: AdministratorAccess, get Access keys
7. Config AWS with command: aws configure, enter access key id, access key, region as us-west-2

## Bootstrap setup
change aws account and region in cdk-app/cdk-app/ts for BootstrapStack and required stack like BetaStack
```bash
cdk bootstrap
```

## Deployment Steps

1. Build the Spring Boot application:
```bash
cd java-app
mvn clean package
```

2. Build and push Docker image:
```bash
./build-and-push.sh 651706779316.dkr.ecr.us-west-2.amazonaws.com/my-springboot-app us-west-2
```

4. Deploy infrastructure using CDK:
```bash
cd ../cdk-app
npm install
# deploy BetaStack or ProdStack
cdk deploy BetaStack
```

5. Verify deployment:
find cluster in AWS Console
```bash
aws eks update-kubeconfig --name <cluster-name> --region $REGION
kubectl get pods
kubectl logs -f -l app=spring-app
```
6. Remove stack
```bash
cdk destroy --all
```

## Monitoring
- Monitor SQS queue: AWS Console -> SQS
- View EKS cluster status: AWS Console -> EKS
- Log: AWS Console -> Cloudwatch -> Logs -> LogGroup: /aws/eks/fluentbit-cloudwatch/logs