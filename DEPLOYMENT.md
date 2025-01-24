# Deployment Guide

This guide explains how to deploy the Spring Boot application that processes SQS messages on EKS.

## Prerequisites

1. AWS CLI installed and configured
2. Docker installed
3. kubectl installed
4. Maven installed
5. Node.js and npm installed (for CDK)

## Deployment Steps

1. Build the Spring Boot application:
```bash
cd java-app
mvn clean package
```

2. Create an ECR repository (first time only):
```bash
aws ecr create-repository --repository-name spring-app
```

3. Build and push Docker image:
```bash
export ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export REGION=$(aws configure get region)

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com

docker build -t spring-app .
docker tag spring-app:latest $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/spring-app:latest
docker push $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/spring-app:latest
```

4. Deploy infrastructure using CDK:
```bash
cd ../cdk-app
npm install
cdk deploy
```

5. Verify deployment:
```bash
aws eks update-kubeconfig --name <cluster-name> --region $REGION
kubectl get pods
kubectl logs -f -l app=spring-app
```

## Architecture

The application consists of:
- Amazon EKS cluster running the Spring Boot application
- Amazon SQS queue for message processing
- IAM roles and service accounts for secure access
- Container image stored in Amazon ECR

## Monitoring

- View application logs: `kubectl logs -f -l app=spring-app`
- Monitor SQS queue: AWS Console -> SQS
- View EKS cluster status: `kubectl get pods,svc`