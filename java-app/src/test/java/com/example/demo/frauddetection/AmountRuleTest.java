package com.example.demo.frauddetection;

import com.example.demo.datamodel.frauddetection.Transaction;
import com.example.demo.datamodel.frauddetection.TransactionFraudDetectionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AmountRuleTest {

    private AmountRule amountRule;

    @BeforeEach
    void setUp() {
        amountRule = new AmountRule();
    }

    @Test
    void evaluate_whenAmountBelowThreshold_shouldNotBeFraudulent() {
        // Arrange
        Transaction transaction = Transaction.builder()
                .amount(5000.0)
                .build();

        // Act
        TransactionFraudDetectionResult result = amountRule.evaluate(transaction);

        // Assert
        assertFalse(result.isFraudulent());
        assertNull(result.getMessage());
    }

    @Test
    void evaluate_whenAmountAboveThreshold_shouldBeFraudulent() {
        // Arrange
        Transaction transaction = Transaction.builder()
                .amount(15000.0)
                .build();

        // Act
        TransactionFraudDetectionResult result = amountRule.evaluate(transaction);

        // Assert
        assertTrue(result.isFraudulent());
        assertEquals(RuleConstants.FRAUDULENT_AMOUNT_MESSAGE, result.getMessage());
    }

    @Test
    void evaluate_whenAmountEqualsThreshold_shouldNotBeFraudulent() {
        // Arrange
        Transaction transaction = Transaction.builder()
                .amount(10000.0)
                .build();

        // Act
        TransactionFraudDetectionResult result = amountRule.evaluate(transaction);

        // Assert
        assertFalse(result.isFraudulent());
        assertNull(result.getMessage());
    }
}
