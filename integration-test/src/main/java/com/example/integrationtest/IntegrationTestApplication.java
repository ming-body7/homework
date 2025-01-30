package com.example.integrationtest;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cloudwatchlogs.CloudWatchLogsClient;
import software.amazon.awssdk.services.cloudwatchlogs.model.FilterLogEventsRequest;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import java.util.UUID;

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

        // Create clients
        SqsClient sqsClient = SqsClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();

        CloudWatchLogsClient logsClient = CloudWatchLogsClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();

        // Send message to SQS
        sendMessage(sqsClient, sqsQueueUrl);

        // wait for log processed
        Thread.sleep(30000);

        // Verify logs in CloudWatch
        boolean logFound = verifyLog(logsClient, logGroupName);
        if (!logFound) {
            System.out.println("Expected log not found in CloudWatch");
            System.exit(1); // Exit to ensure the pod terminates
        }


        System.out.println("Integration test passed.");
        System.exit(0); // Exit to ensure the pod terminates
    }

    private static void sendMessage(SqsClient sqsClient, String queueUrl) {
        String messageBody = "{\"transactionId\":\"TXN123456789\",\"amount\":12501.75,\"currency\":\"USD\",\"merchantId\":\"MERCHANT987654\",\"cardNumber\":\"4111111111111111\",\"timestamp\":\"2025-01-24T10:15:30Z\"}";
        sqsClient.sendMessage(SendMessageRequest.builder()
                .queueUrl(queueUrl)
                .messageBody(messageBody)
                .build());
        System.out.println("Message sent to SQS.");
    }

    private static boolean verifyLog(CloudWatchLogsClient logsClient, String logGroupName) {
        // Query CloudWatch logs for the test message
        FilterLogEventsRequest request = FilterLogEventsRequest.builder()
                .logGroupName(logGroupName)
                .filterPattern("TXN123456789")
                .startTime(System.currentTimeMillis() - 300000) // 5 minute ago
                .endTime(System.currentTimeMillis() + 60000)
                .build();
        return !logsClient.filterLogEvents(request).events().isEmpty();
    }
}
