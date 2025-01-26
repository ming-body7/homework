package com.example.demo.listener;

import io.awspring.cloud.messaging.listener.SqsMessageDeletionPolicy;
import io.awspring.cloud.messaging.listener.annotation.SqsListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class SqsMessageListener {
    
    private static final Logger logger = LoggerFactory.getLogger(SqsMessageListener.class);

    public SqsMessageListener() {
        logger.info("SqsMessageListener initialized");
    }

    @SqsListener(value = "${cloud.aws.sqs.queue-name}", deletionPolicy = SqsMessageDeletionPolicy.ON_SUCCESS)
    public void processMessage(String message) {
        logger.info("Received message: {}", message);
        // Add your message processing logic here
    }
}