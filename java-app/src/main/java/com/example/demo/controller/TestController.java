package com.example.demo.controller;

import io.micrometer.core.annotation.Counted;
import io.micrometer.core.annotation.Timed;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageResponse;

@RestController
public class TestController {


    private static final Logger logger = LogManager.getLogger(TestController.class);
    private final MeterRegistry meterRegistry;
    private final Counter requestCounter;

    @Autowired
    public TestController(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.requestCounter = meterRegistry.counter("test.controller.requests");
    }

    @GetMapping("/test")
    public String test() {
        logger.info("test controller");
        requestCounter.increment();
        return "Hello from Test Controller!";
    }
}