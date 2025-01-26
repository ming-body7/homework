package com.example.demo.model;

import lombok.Data;

@Data
public class TransactionFraudDetectionRequest {
    private String transactionId;
    private Double amount;
    private String currency;
    private String merchantId;
    private String cardNumber;
    private String timestamp;
}