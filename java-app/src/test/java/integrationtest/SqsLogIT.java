package integrationtest;

import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cloudwatchlogs.CloudWatchLogsClient;
import software.amazon.awssdk.services.cloudwatchlogs.model.FilterLogEventsRequest;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

public class SqsLogIT {

    public static void main(String[] args) {
        String sqsQueueUrl = System.getenv("SQS_QUEUE_URL");
        String logGroupName = System.getenv("LOG_GROUP_NAME");
        String region = System.getenv("REGION");

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

        // Verify logs in CloudWatch
        boolean logFound = verifyLog(logsClient, logGroupName);
        if (!logFound) {
            throw new RuntimeException("Expected log not found in CloudWatch");
        }

        System.out.println("Integration test passed.");
    }

    private static void sendMessage(SqsClient sqsClient, String queueUrl) {
        sqsClient.sendMessage(SendMessageRequest.builder()
                .queueUrl(queueUrl)
                .messageBody("Integration Test Message")
                .build());
        System.out.println("Message sent to SQS.");
    }

    private static boolean verifyLog(CloudWatchLogsClient logsClient, String logGroupName) {
        // Query CloudWatch logs for the test message
        FilterLogEventsRequest request = FilterLogEventsRequest.builder()
                .logGroupName(logGroupName)
                .filterPattern("Integration Test Message")
                .build();
        return !logsClient.filterLogEvents(request).events().isEmpty();
    }
}