package com.example.demo.frauddetection;

import com.example.demo.datamodel.frauddetection.Transaction;
import com.example.demo.datamodel.frauddetection.TransactionFraudDetectionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionFraudDetectorTest {

    @Mock
    private AmountRule amountRule;

    @Mock
    private MerchantIdRule merchantIdRule;

    private TransactionFraudDetector fraudDetector;

    @BeforeEach
    void setUp() {
        fraudDetector = new TransactionFraudDetector(Arrays.asList(amountRule, merchantIdRule));
    }

    @Test
    void detect_whenNoRulesTriggered_shouldNotBeFraudulent() {
        // Arrange
        Transaction transaction = Transaction.builder()
                .amount(100.0)
                .merchantId("VALID-MERCHANT")
                .build();

        when(amountRule.evaluate(transaction))
                .thenReturn(TransactionFraudDetectionResult.builder()
                        .isFraudulent(false)
                        .build());

        when(merchantIdRule.evaluate(transaction))
                .thenReturn(TransactionFraudDetectionResult.builder()
                        .isFraudulent(false)
                        .build());

        // Act
        TransactionFraudDetectionResult result = fraudDetector.detectFraud(transaction);

        // Assert
        assertFalse(result.isFraudulent());
        assertEquals(RuleConstants.NO_FRAUDULENT_DEFAULT_MESSAGE, result.getMessage());
        verify(amountRule).evaluate(transaction);
        verify(merchantIdRule).evaluate(transaction);
    }

    @Test
    void detect_whenAmountRuleTriggered_shouldBeFraudulent() {
        // Arrange
        Transaction transaction = Transaction.builder()
                .amount(15000.0)
                .merchantId("VALID-MERCHANT")
                .build();

        when(amountRule.evaluate(transaction))
                .thenReturn(TransactionFraudDetectionResult.builder()
                        .isFraudulent(true)
                        .message(RuleConstants.FRAUDULENT_AMOUNT_MESSAGE)
                        .build());
        when(merchantIdRule.evaluate(transaction))
                .thenReturn(TransactionFraudDetectionResult.builder()
                        .isFraudulent(false)
                        .message(RuleConstants.FRAUDULENT_MERCHANT_ID_MESSAGE)
                        .build());


        // Act
        TransactionFraudDetectionResult result = fraudDetector.detectFraud(transaction);

        // Assert
        assertTrue(result.isFraudulent());
        assertTrue(result.getMessage().contains(RuleConstants.FRAUDULENT_AMOUNT_MESSAGE));
        verify(amountRule).evaluate(transaction);
        verify(merchantIdRule).evaluate(transaction);
    }

    @Test
    void detect_whenMerchantIdRuleTriggered_shouldBeFraudulent() {
        // Arrange
        Transaction transaction = Transaction.builder()
                .amount(100.0)
                .merchantId("BLACKLISTED-1")
                .build();

        when(amountRule.evaluate(transaction))
                .thenReturn(TransactionFraudDetectionResult.builder()
                        .isFraudulent(false)
                        .build());

        when(merchantIdRule.evaluate(transaction))
                .thenReturn(TransactionFraudDetectionResult.builder()
                        .isFraudulent(true)
                        .message(RuleConstants.FRAUDULENT_MERCHANT_ID_MESSAGE)
                        .build());

        // Act
        TransactionFraudDetectionResult result = fraudDetector.detectFraud(transaction);

        // Assert
        assertTrue(result.isFraudulent());
        assertEquals(RuleConstants.FRAUDULENT_MERCHANT_ID_MESSAGE, result.getMessage());
        verify(amountRule).evaluate(transaction);
        verify(merchantIdRule).evaluate(transaction);
    }

    @Test
    void detect_whenMultipleRulesTriggered_shouldBeFraudulentWithAllMessage() {
        // Arrange
        Transaction transaction = Transaction.builder()
                .amount(15000.0)
                .merchantId("BLACKLISTED-1")
                .build();

        when(amountRule.evaluate(transaction))
                .thenReturn(TransactionFraudDetectionResult.builder()
                        .isFraudulent(true)
                        .message(RuleConstants.FRAUDULENT_AMOUNT_MESSAGE)
                        .build());
        when(merchantIdRule.evaluate(transaction))
                .thenReturn(TransactionFraudDetectionResult.builder()
                        .isFraudulent(true)
                        .message(RuleConstants.FRAUDULENT_MERCHANT_ID_MESSAGE)
                        .build());

        // Act
        TransactionFraudDetectionResult result = fraudDetector.detectFraud(transaction);

        // Assert
        assertTrue(result.isFraudulent());
        assertTrue(result.getMessage().contains(RuleConstants.FRAUDULENT_AMOUNT_MESSAGE));
        assertTrue(result.getMessage().contains(RuleConstants.FRAUDULENT_MERCHANT_ID_MESSAGE));
        verify(amountRule).evaluate(transaction);
        verify(merchantIdRule).evaluate(transaction);
    }

    @Test
    void detect_whenNoRulesConfigured_shouldNotBeFraudulent() {
        // Arrange
        fraudDetector = new TransactionFraudDetector(Collections.emptyList());
        Transaction transaction = Transaction.builder()
                .amount(100.0)
                .merchantId("VALID-MERCHANT")
                .build();

        // Act
        TransactionFraudDetectionResult result = fraudDetector.detectFraud(transaction);

        // Assert
        assertFalse(result.isFraudulent());
        assertEquals(RuleConstants.NO_FRAUDULENT_DEFAULT_MESSAGE, result.getMessage());
        verifyNoInteractions(amountRule, merchantIdRule);
    }

    @Test
    void detect_whenTransactionIsNull_shouldThrowException() {
        // Act & Assert
        assertThrows(NullPointerException.class, () -> fraudDetector.detectFraud(null));
        verifyNoInteractions(amountRule, merchantIdRule);
    }

    @Test
    void constructor_whenRulesAreNull_shouldThrowException() {
        // Act & Assert
        assertThrows(NullPointerException.class, () -> new TransactionFraudDetector(null));
    }
}
