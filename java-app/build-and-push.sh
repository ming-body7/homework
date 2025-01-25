#!/bin/bash

# Variables
ECR_REPO=$1
AWS_REGION=$2
TAG=latest

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

# Build and push the Docker image
docker build -t springboot-app .
docker tag springboot-app:latest $ECR_REPO:$TAG
docker push $ECR_REPO:$TAG