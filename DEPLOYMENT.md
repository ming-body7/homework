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

## CDK Bootstrap setup
change aws account and region in cdk-app/cdk-app/ts for BootstrapStack and required stack like BetaStack
```bash
cd cdk-app
cdk bootstrap
cdk deploy BoostrapStack
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
cdk deploy BetaStackTest
```

5. Verify deployment:
find cluster in AWS Console, replace with your cluster name and region
```bash
aws eks update-kubeconfig --name <cluster-name> --region us-west-2
kubectl get pods
kubectl get all --all-namespaces
```
6. Remove stack
```bash
kubectl delete deployment,statefulset,daemonset,job,cronjob,svc,ingress --all --all-namespaces
kubectl delete serviceaccount --all --all-namespaces --grace-period=0 --force
kubectl delete rolebinding --all --all-namespaces
kubectl delete clusterrolebinding --all
helm list -A --output json | jq -r '.[] | .name + " " + .namespace' | while read name namespace; do
  echo "Uninstalling Helm release: $name in namespace: $namespace"
  helm uninstall "$name" -n "$namespace" --no-hooks
done
kubectl get crd | awk '{print $1}' | xargs kubectl delete crd
kubectl delete pvc --all --all-namespaces
kubectl delete pv --all
cdk destroy --all
```

## Monitoring
- Monitor SQS queue: AWS Console -> SQS
- View EKS cluster status: AWS Console -> EKS
- Log: AWS Console -> Cloudwatch -> Logs -> LogGroup: /aws/eks/fluentbit-cloudwatch/logs