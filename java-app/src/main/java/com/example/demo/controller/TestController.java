package com.example.demo.controller;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageResponse;

@RestController
public class TestController {


    private static final Logger logger = LogManager.getLogger(TestController.class);

    @GetMapping("/test")
    public String test() {
        String queueUrl = "https://sqs.us-west-2.amazonaws.com/651706779316/beta-demo-message-queue";
        SqsClient sqsClient = SqsClient.create();

        ReceiveMessageRequest request = ReceiveMessageRequest.builder()
                .queueUrl(queueUrl)
                .maxNumberOfMessages(10)
                .waitTimeSeconds(10)
                .build();
        System.out.println("Polling for messages from " + queueUrl);
        ReceiveMessageResponse response = sqsClient.receiveMessage(request);

        response.messages().forEach(message -> {
            System.out.println("Received message: " + message.body());
            // Process message here
        });
        logger.info("test controller");
        return "Hello from Test Controller!";
    }
}