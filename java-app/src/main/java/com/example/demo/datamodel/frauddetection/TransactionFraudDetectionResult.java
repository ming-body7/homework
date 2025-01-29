package com.example.demo.datamodel.frauddetection;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TransactionFraudDetectionResult {
    boolean isFraudulent;
    String message;
}
