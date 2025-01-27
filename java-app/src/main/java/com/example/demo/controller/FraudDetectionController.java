package com.example.demo.controller;

import com.example.demo.model.TransactionFraudDetectionRequest;
import com.example.demo.model.TransactionFraudDetectionResponse;
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

    public FraudDetectionController(TransactionFraudDetector fraudDetector) {
        this.fraudDetector = fraudDetector;
    }

    @PostMapping("/detect")
    public ResponseEntity<TransactionFraudDetectionResponse> detectFraud(
            @RequestBody TransactionFraudDetectionRequest request) {
        TransactionFraudDetectionResponse response = fraudDetector.detectFraud(request);
        return ResponseEntity.ok(response);
    }
}