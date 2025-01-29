package com.example.demo.datamodel.service;

import com.example.demo.datamodel.frauddetection.Transaction;
import lombok.Data;

@Data
public class TransactionFraudDetectionRequest {
    private Transaction transaction;
}