package com.example.demo.controller;

import com.example.demo.model.TransactionFraudDetectionRequest;
import com.example.demo.model.TransactionFraudDetectionResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class FraudDetectionController {

    @PostMapping("/detect")
    public ResponseEntity<TransactionFraudDetectionResponse> detectFraud(
            @RequestBody TransactionFraudDetectionRequest request) {
        
        // Create response object
        TransactionFraudDetectionResponse response = new TransactionFraudDetectionResponse();
        response.setTransactionId(request.getTransactionId());
        
        // TODO: Add actual fraud detection logic here
        // This is a placeholder implementation
        response.setFraudulent(false);
        response.setRiskScore("LOW");
        response.setMessage("Transaction appears legitimate");
        
        return ResponseEntity.ok(response);
    }
}