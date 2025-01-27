package com.example.demo.controller;

import com.example.demo.frauddetection.TransactionFraudDetector;
import com.example.demo.model.TransactionFraudDetectionRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;


@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
public class FraudDetectionControllerTest {

    @Mock
    private TransactionFraudDetector transactionFraudDetector;

    @InjectMocks
    private FraudDetectionController toTest;

    @Test
    public void testDetectFraudWhenInvalidInput() {
        when(transactionFraudDetector.detectFraud(any(TransactionFraudDetectionRequest.class)))
                .thenThrow(new IllegalArgumentException());
        TransactionFraudDetectionRequest emptyRequest = new TransactionFraudDetectionRequest();

        assertThrows(IllegalArgumentException.class,
                ()->{toTest.detectFraud(emptyRequest);} );
    }
}