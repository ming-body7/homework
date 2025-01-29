package com.example.demo.datamodel.service;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TransactionFraudDetectionResponse {
    private String transactionId;
    private boolean isFraudulent;
    private String message;
}