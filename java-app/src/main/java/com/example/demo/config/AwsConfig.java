package com.example.demo.config;

import io.awspring.cloud.sqs.operations.SqsTemplate;
import io.micrometer.core.instrument.Clock;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.val;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cloudwatch.CloudWatchAsyncClient;
import software.amazon.awssdk.services.sqs.SqsAsyncClient;
import io.micrometer.cloudwatch2.CloudWatchConfig;
import io.micrometer.cloudwatch2.CloudWatchMeterRegistry;

import java.time.Duration;
import java.util.Map;

@Configuration
public class AwsConfig {

    @Value("${cloud.aws.region.static}")
    private String region;

    private static final int AWS_CLOUDWATCH_DEFAULT_STEP_SECONDS = 30;

    private static final Map<String, String> CLOUDWATCH_CONFIGURATION = Map.of(
            "cloudwatch.numThreads", "2",
            "cloudwatch.connectTimeout", Duration.ofSeconds(5).toString(),
            "cloudwatch.readTimeout", Duration.ofSeconds(5).toString(),
            "cloudwatch.batchSize", "10",
            "cloudwatch.namespace", "MySpringbootApp",
            "cloudwatch.step", Duration.ofSeconds(AWS_CLOUDWATCH_DEFAULT_STEP_SECONDS).toString());

    @Bean
    @Primary
    public CloudWatchAsyncClient cloudWatchClient() throws Exception {
        return CloudWatchAsyncClient
                .builder()
                .region(Region.of(region))
                .build();
    }

    @Bean
    public MeterRegistry cloudWatchMeterRegistry(
            final CloudWatchAsyncClient cloudWatchClient) {
        val cloudWatchConfig = new CloudWatchConfig() {
            @Override
            public String get(final String key) {
                return CLOUDWATCH_CONFIGURATION.get(key);
            }
        };
        return new CloudWatchMeterRegistry(cloudWatchConfig, Clock.SYSTEM, cloudWatchClient);
    }

    @Bean
    @Primary
    public SqsAsyncClient amazonSQSAsync() {
        return SqsAsyncClient
                .builder()
                .region(Region.of(region))
                .build();
    }

    @Bean
    public SqsTemplate sqsTemplate(SqsAsyncClient amazonSQSAsync) {
        return SqsTemplate.newTemplate(amazonSQSAsync);
    }
}