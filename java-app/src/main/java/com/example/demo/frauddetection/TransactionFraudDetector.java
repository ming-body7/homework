package com.example.demo.frauddetection;

import com.example.demo.datamodel.frauddetection.Transaction;
import com.example.demo.datamodel.frauddetection.TransactionFraudDetectionResult;
import lombok.NonNull;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TransactionFraudDetector {

    private final List<TransactionFraudRule> ruleChain;

    public TransactionFraudDetector() {
        this.ruleChain = List.of(new AmountRule(), new MerchantIdRule());
    }

    //only use for testing
    public TransactionFraudDetector(@NonNull List<TransactionFraudRule> ruleChain) {
        this.ruleChain = ruleChain;
    }

    public TransactionFraudDetectionResult detectFraud(@NonNull Transaction transaction) {
        boolean isFraudulent = false;
        StringBuilder fraudulentMessageBuilder = new StringBuilder();
        for (TransactionFraudRule  rule : ruleChain) {
            TransactionFraudDetectionResult result = rule.evaluate(transaction);
            if (result.isFraudulent()) {
                isFraudulent = true;
                fraudulentMessageBuilder.append((result.getMessage()));
            }
        }
        if (isFraudulent) {
            return TransactionFraudDetectionResult.builder()
                .isFraudulent(true)
                .message(fraudulentMessageBuilder.toString())
                .build();
        }

        return TransactionFraudDetectionResult.builder()
                .isFraudulent(false)
                .message(RuleConstants.NO_FRAUDULENT_DEFAULT_MESSAGE)
                .build();
    }
}