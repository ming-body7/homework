package com.example.demo.datamodel.frauddetection;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class TransactionFraudDetectionResult {
    boolean isFraudulent;
    String message;
}
