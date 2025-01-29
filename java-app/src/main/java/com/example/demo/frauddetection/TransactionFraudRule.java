package com.example.demo.frauddetection;

import com.example.demo.datamodel.frauddetection.Transaction;
import com.example.demo.datamodel.frauddetection.TransactionFraudDetectionResult;

public interface TransactionFraudRule {
    TransactionFraudDetectionResult evaluate(Transaction transaction);
}
