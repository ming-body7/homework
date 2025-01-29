package com.example.demo.controller;

import com.example.demo.datamodel.frauddetection.Transaction;
import com.example.demo.datamodel.frauddetection.TransactionFraudDetectionResult;
import com.example.demo.datamodel.service.TransactionFraudDetectionRequest;
import com.example.demo.datamodel.service.TransactionFraudDetectionResponse;
import com.example.demo.listener.SqsMessageListener;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.frauddetection.TransactionFraudDetector;

@RestController
@RequestMapping("/api")
public class FraudDetectionController {

    private final TransactionFraudDetector fraudDetector;
    private static final Logger logger = LogManager.getLogger(FraudDetectionController.class);

    public FraudDetectionController() {
        this.fraudDetector = new TransactionFraudDetector();
    }

    // testing only
    public FraudDetectionController(TransactionFraudDetector transactionFraudDetector) {
        this.fraudDetector = transactionFraudDetector;
    }

    @PostMapping("/detect")
    public ResponseEntity<TransactionFraudDetectionResponse> detectFraud(
            @RequestBody TransactionFraudDetectionRequest request) {
        Transaction transaction = request.getTransaction();
        TransactionFraudDetectionResult result = fraudDetector.detectFraud(transaction);
        logger.info("result: {}", result);
        TransactionFraudDetectionResponse response = TransactionFraudDetectionResponse.builder()
                .isFraudulent(result.isFraudulent())
                .message(result.getMessage())
                .build();
        return ResponseEntity.ok(response);
    }
}