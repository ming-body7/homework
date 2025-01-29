#!/bin/bash

# Replace this with your Job name
JOB_NAME="integration-test-job"
NAMESPACE="default" # Update if your Job is in a different namespace

# Get the pod name associated with the Job
POD_NAME=$(kubectl get pods --namespace "$NAMESPACE" --selector=job-name="$JOB_NAME" --output=jsonpath='{.items[0].metadata.name}')

# Check if a pod was found
if [ -z "$POD_NAME" ]; then
  echo "No pod found for Job: $JOB_NAME in namespace: $NAMESPACE"
  exit 1
fi

# Get the exit code of the container in the pod
EXIT_CODE=$(kubectl get pod "$POD_NAME" --namespace "$NAMESPACE" -o jsonpath='{.status.containerStatuses[0].state.terminated.exitCode}')

# Display the exit code
if [ -z "$EXIT_CODE" ]; then
  echo "Pod $POD_NAME has not terminated yet."
else
  echo "Pod $POD_NAME exited with code: $EXIT_CODE"
fi