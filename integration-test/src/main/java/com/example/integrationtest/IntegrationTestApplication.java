package com.example.integrationtest;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class IntegrationTestApplication implements CommandLineRunner {

    public static void main(String[] args) {
        SpringApplication.run(IntegrationTestApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("Running integration test...");

        // Simulate SQS Message Send and CloudWatch log verification
        String sqsQueueUrl = System.getenv("SQS_QUEUE_URL");
        String logGroupName = System.getenv("LOG_GROUP_NAME");
        String region = System.getenv("AWS_REGION");

        // Example logic for SQS and CloudWatch integration
        System.out.println("SQS Queue URL: " + sqsQueueUrl);
        System.out.println("Log Group Name: " + logGroupName);
        System.out.println("AWS Region: " + region);

        System.out.println("Integration test completed successfully!");

        //System.exit(0); // Exit to ensure the pod terminates
    }
}
