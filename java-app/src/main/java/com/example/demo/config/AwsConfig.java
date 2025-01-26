package com.example.demo.config;

import io.awspring.cloud.sqs.operations.SqsTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsAsyncClient;

@Configuration
public class AwsConfig {

    @Value("${cloud.aws.region.static}")
    private String region;

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