package com.example.demo.controller;

import com.example.demo.datamodel.service.TransactionFraudDetectionRequest;
import com.example.demo.frauddetection.TransactionFraudDetector;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;


@ExtendWith(MockitoExtension.class)
public class FraudDetectionControllerTest {


    @Mock
    private TransactionFraudDetector transactionFraudDetector;
    private FraudDetectionController toTest;

    @BeforeEach
    public void setUp() {
        toTest = new FraudDetectionController(transactionFraudDetector);
    }

    @Test
    public void testDetectFraudWhenInvalidInput() {
        when(transactionFraudDetector.detectFraud(null))
                .thenThrow(new IllegalArgumentException());
        TransactionFraudDetectionRequest emptyRequest = new TransactionFraudDetectionRequest();

        assertThrows(IllegalArgumentException.class,
                ()-> toTest.detectFraud(emptyRequest));
    }
}