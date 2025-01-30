package com.example.demo.controller;

import com.example.demo.datamodel.frauddetection.TransactionFraudDetectionResult;
import com.example.demo.datamodel.service.TransactionFraudDetectionRequest;
import com.example.demo.datamodel.service.TransactionFraudDetectionResponse;
import com.example.demo.frauddetection.TransactionFraudDetector;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;


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
    public void testConstructor() {
        assertNotNull(toTest);
    }

    @Test
    public void testDetectFraudWhenValidInput() {
        TransactionFraudDetectionRequest request = new TransactionFraudDetectionRequest();
        TransactionFraudDetectionResult result = new TransactionFraudDetectionResult(true, "Fraud detected");
        when(transactionFraudDetector.detectFraud(any())).thenReturn(result);

        // Call method
        ResponseEntity<TransactionFraudDetectionResponse> responseEntity = toTest.detectFraud(request);

        // Verify response
        assertNotNull(responseEntity);
        assertEquals(200, responseEntity.getStatusCodeValue());
        assertTrue(responseEntity.getBody().isFraudulent());
        assertEquals("Fraud detected", responseEntity.getBody().getMessage());

        // Verify interactions
        verify(transactionFraudDetector, times(1)).detectFraud(any());
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