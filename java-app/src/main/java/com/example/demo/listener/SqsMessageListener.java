package com.example.demo.listener;

import io.awspring.cloud.sqs.annotation.SqsListener;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Component;

@Component
public class SqsMessageListener {

    private static final Logger logger = LogManager.getLogger(SqsMessageListener.class);

    public SqsMessageListener() {
        logger.info("SqsMessageListener initialized");
    }

    @SqsListener(value = "${cloud.aws.sqs.queue-name}")
    public void processMessage(String message) {
        logger.info("Received message: " + message );
        // Add your message processing logic here
    }
}