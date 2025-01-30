package com.example.demo.listener;

import com.example.demo.datamodel.frauddetection.Transaction;
import com.example.demo.datamodel.frauddetection.TransactionFraudDetectionResult;
import com.example.demo.frauddetection.TransactionFraudDetector;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.apache.logging.log4j.Logger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;

import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SqsMessageListenerTest {

    @Mock
    private MeterRegistry meterRegistry;

    @Mock
    private Counter processedMessageCounter;

    @Mock
    private Counter processedMessageFailureCounter;

    @Mock
    private Counter transactionFraudCounter;

    @Mock
    private Counter transactionNonFraudCounter;

    @Mock
    private TransactionFraudDetector fraudDetector;

    @Mock
    private Logger logger;

    private SqsMessageListener toTest;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    public void setUp() {
        toTest = new SqsMessageListener(fraudDetector, meterRegistry,
                processedMessageCounter,
                processedMessageFailureCounter,
                transactionFraudCounter,
                transactionNonFraudCounter);
    }

    @Test
    public void testConstructor() {
        toTest = new SqsMessageListener(meterRegistry);
        assertNotNull(toTest);
    }

    @Test
    public void testProcessMessage_SuccessfulFraudTransaction() throws Exception {
        Transaction transaction = buildTransaction();
        TransactionFraudDetectionResult result = new TransactionFraudDetectionResult(true, "fraud");
        String message = objectMapper.writeValueAsString(transaction);

        when(fraudDetector.detectFraud(any(Transaction.class))).thenReturn(result);

        toTest.processMessage(message);

        verify(transactionFraudCounter, times(1)).increment();
        verify(transactionNonFraudCounter, never()).increment();
        verify(processedMessageCounter, times(1)).increment();
    }

    @Test
    public void testProcessMessage_SuccessfulNonFraudTransaction() throws Exception {
        Transaction transaction = new Transaction();  // Set fields as needed
        TransactionFraudDetectionResult result = new TransactionFraudDetectionResult(false, "not fraud");
        String message = objectMapper.writeValueAsString(transaction);

        when(fraudDetector.detectFraud(any(Transaction.class))).thenReturn(result);

        toTest.processMessage(message);

        verify(transactionFraudCounter, never()).increment();
        verify(transactionNonFraudCounter, times(1)).increment();
        verify(processedMessageCounter, times(1)).increment();
    }

    @Test
    public void testProcessMessage_InvalidMessage() {
        String invalidMessage = "invalid json";

        toTest.processMessage(invalidMessage);

        verify(processedMessageFailureCounter, times(1)).increment();
        verify(processedMessageCounter, times(1)).increment();
    }

    private Transaction buildTransaction() {
        Transaction transaction = new Transaction();
        transaction.setTransactionId("123");
        transaction.setAmount(100.0);
        transaction.setMerchantId("merchant");
        return transaction;
    }
}
