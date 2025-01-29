// MerchantIdRule.java
package com.example.demo.frauddetection;

import com.example.demo.datamodel.frauddetection.Transaction;
import com.example.demo.datamodel.frauddetection.TransactionFraudDetectionResult;

import java.util.Set;

public class MerchantIdRule implements TransactionFraudRule {
    private final static Set<String> BLACK_LISTED_MERCHANT_ID_SET = Set.of("BLACKLISTED-1", "BLACKLISTED-2");

    @Override
    public TransactionFraudDetectionResult evaluate(Transaction transaction) {
        if (BLACK_LISTED_MERCHANT_ID_SET.contains(transaction.getMerchantId())) {
            return TransactionFraudDetectionResult.builder()
                    .isFraudulent(true)
                    .message(RuleConstants.FRAUDULENT_MERCHANT_ID_MESSAGE)
                    .build();
        }
        return TransactionFraudDetectionResult.builder()
                .isFraudulent(false)
                .build();
    }
}
