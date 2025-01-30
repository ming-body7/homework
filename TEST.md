


## Integration Test Steps

1. Build the Spring Boot application:
```bash
cd integration-test
mvn clean package
```
2. Build and push Docker image:
note: change to your aws account
```bash
./build-and-push.sh 651706779316.dkr.ecr.us-west-2.amazonaws.com/my-springboot-integration-test us-west-2
```
3. Trigger Integration Test
```bash
./trigger-integration-test.sh 
```
4. Check results in terminal
expect results: "integration test succeed."

## Resilience Test Steps
1. login AWS Console
2. go to AWS FIS service
3. find experiment template and execute FIS

## Unit Test and coverage report
```bash
cd java-app
mvn clean test
mvn jacoco:report
```
report in path target/site/index.html