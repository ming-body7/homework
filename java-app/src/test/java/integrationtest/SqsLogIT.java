package integrationtest;

import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import software.amazon.awssdk.services.cloudwatchlogs.CloudWatchLogsClient;
import software.amazon.awssdk.services.cloudwatchlogs.model.GetLogEventsRequest;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeAll;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;

import java.net.URI;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import static org.awaitility.Awaitility.await;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Tag("integration")
public class SqsLogIT {

    private static final int LOCALSTACK_PORT = 4566;

    private static final GenericContainer<?> localstack = new GenericContainer<>("localstack/localstack:latest")
            .withEnv("SERVICES", "sqs,logs")
            .withExposedPorts(LOCALSTACK_PORT);

    private static SqsClient sqsClient;
    private static CloudWatchLogsClient logsClient;
    private static String queueUrl;

    @BeforeAll
    static void setup() {
        localstack.start();

        String endpoint = String.format("http://%s:%d",
                localstack.getHost(),
                localstack.getMappedPort(LOCALSTACK_PORT));

        // Initialize SQS client
        sqsClient = SqsClient.builder()
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create("test", "test")))
                .region(Region.US_EAST_1)
                .httpClient(UrlConnectionHttpClient.builder().build())
                .build();

        // Initialize CloudWatch Logs client
        logsClient = CloudWatchLogsClient.builder()
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create("test", "test")))
                .region(Region.US_EAST_1)
                .httpClient(UrlConnectionHttpClient.builder().build())
                .build();
    }

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("aws.sqs.endpoint", () ->
                String.format("http://%s:%d",
                        localstack.getHost(),
                        localstack.getMappedPort(LOCALSTACK_PORT)));
        registry.add("aws.region", () -> "us-east-1");
    }

    @Test
    void shouldProcessSQSMessageAndLogToCloudWatch() {
        // Send test message
        String testMessage = "{\"id\":\"123\",\"content\":\"test message\"}";
        sqsClient.sendMessage(SendMessageRequest.builder()
                .queueUrl(queueUrl)
                .messageBody(testMessage)
                .build());

        // Wait for message processing and log generation
        await()
                .atMost(30, TimeUnit.SECONDS)
                .pollInterval(Duration.ofSeconds(2))
                .untilAsserted(() -> {
                    // Check CloudWatch logs
                    var logEvents = logsClient.getLogEvents(GetLogEventsRequest.builder()
                                    .logGroupName("/aws/eks/your-service-name")
                                    .logStreamName("your-pod-name")
                                    .build())
                            .events();

                    assertThat(logEvents)
                            .anyMatch(event -> event.message().contains("Message processed successfully"))
                            .anyMatch(event -> event.message().contains("123")); // Check for message ID
                });
    }

    @Test
    void shouldHandleInvalidMessage() {
        // Send invalid message
        String invalidMessage = "invalid json";
        sqsClient.sendMessage(SendMessageRequest.builder()
                .queueUrl(queueUrl)
                .messageBody(invalidMessage)
                .build());

        // Verify error handling in logs
        await()
                .atMost(30, TimeUnit.SECONDS)
                .pollInterval(Duration.ofSeconds(2))
                .untilAsserted(() -> {
                    var logEvents = logsClient.getLogEvents(GetLogEventsRequest.builder()
                                    .logGroupName("/aws/eks/your-service-name")
                                    .logStreamName("your-pod-name")
                                    .build())
                            .events();

                    assertThat(logEvents)
                            .anyMatch(event -> event.message().contains("Error processing message"));
                });
    }
}