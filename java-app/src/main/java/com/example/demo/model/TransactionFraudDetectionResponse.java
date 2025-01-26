package com.example.demo.model;

import lombok.Data;

@Data
public class TransactionFraudDetectionResponse {
    private String transactionId;
    private boolean fraudulent;
    private String riskScore;
    private String message;
}