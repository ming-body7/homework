## Tech Stack
1. use CDK to manage the infrastructure
2. use maven to manage java application
3. use fluent bit to enable log to cloudwatch
4. use cloudwatch to emit metrics
5. use AWS FIS to run resilience test

## Code Structure
1. java-app contains springboot service which have both api and sqs listener
2. cdk-app contains infra setup
3. integration-test contains test springboot app