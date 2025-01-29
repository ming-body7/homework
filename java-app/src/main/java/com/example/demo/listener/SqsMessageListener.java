package com.example.demo.listener;

import com.example.demo.datamodel.frauddetection.Transaction;
import com.example.demo.datamodel.frauddetection.TransactionFraudDetectionResult;
import com.example.demo.frauddetection.TransactionFraudDetector;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.awspring.cloud.sqs.annotation.SqsListener;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class SqsMessageListener {

    private static final Logger logger = LogManager.getLogger(SqsMessageListener.class);

    private final TransactionFraudDetector fraudDetector;
    private MeterRegistry meterRegistry;
    private Counter processedMessageCounter;
    private Counter processedMessageFailureCounter;
    private Counter transactionFraudCounter;
    private Counter transactionNonFraudCounter;

    @Autowired
    public SqsMessageListener(MeterRegistry meterRegistry) {
        logger.info("SqsMessageListener initialized");
        this.fraudDetector = new TransactionFraudDetector();
        this.meterRegistry = meterRegistry;
        this.processedMessageCounter = meterRegistry.counter("sqs.listener.message");
        this.processedMessageFailureCounter = meterRegistry.counter("sqs.listener.message.failure");
        this.transactionFraudCounter = meterRegistry.counter("transaction.detector", "status", "fraud");
        this.transactionNonFraudCounter = meterRegistry.counter("transaction.detector", "status", "nonfraud");
    }

    @SqsListener(value = "${cloud.aws.sqs.queue-name}")
    public void processMessage(String message) {
        logger.info("Received message: {}", message);

        Transaction transaction;
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            transaction = objectMapper.readValue(message, Transaction.class);
        } catch (Exception e) {
            logger.error("transaction deserialize error:", e);
            //TODO: send to dlq for further process
            //emit metrics
            processedMessageFailureCounter.increment();
            processedMessageCounter.increment();
            return;
        }
        TransactionFraudDetectionResult result = fraudDetector.detectFraud(transaction);
        logger.info("result: {}", result);
        if (result.isFraudulent()) {
            // TODO: call external service to handle
            //emit metrics
            transactionFraudCounter.increment();
        } else {
            //emit metrics
            transactionNonFraudCounter.increment();
        }
        processedMessageCounter.increment();
    }
}