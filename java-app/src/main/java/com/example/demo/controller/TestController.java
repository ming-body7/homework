package com.example.demo.controller;

import io.micrometer.core.annotation.Counted;
import io.micrometer.core.annotation.Timed;
import io.micrometer.core.instrument.MeterRegistry;
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

    @Timed(value = "test.timed.endpoint", description = "Time taken to handle the request")
    @Counted(value = "test.counted.endpoint", description = "Count of calls to this endpoint")
    @GetMapping("/test")
    public String test() {
        logger.info("test controller");
        return "Hello from Test Controller!";
    }
}