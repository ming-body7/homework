package com.example.demo.frauddetection;

import com.example.demo.datamodel.frauddetection.Transaction;
import com.example.demo.datamodel.frauddetection.TransactionFraudDetectionResult;

public class AmountRule implements TransactionFraudRule {
    private final static double HIGH_RISK_AMOUNT = 10000.0;

    @Override
    public TransactionFraudDetectionResult evaluate(Transaction transaction) {
        if (transaction.getAmount() > HIGH_RISK_AMOUNT) {
            return TransactionFraudDetectionResult.builder()
                    .isFraudulent(true)
                    .message(RuleConstants.FRAUDULENT_AMOUNT_MESSAGE)
                    .build();
        }
        return TransactionFraudDetectionResult.builder()
                .isFraudulent(false)
                .build();
    }
}

