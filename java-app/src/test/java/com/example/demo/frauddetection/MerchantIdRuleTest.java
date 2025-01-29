package com.example.demo.frauddetection;

import com.example.demo.datamodel.frauddetection.Transaction;
import com.example.demo.datamodel.frauddetection.TransactionFraudDetectionResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class MerchantIdRuleTest {

    private MerchantIdRule merchantIdRule;

    @BeforeEach
    void setUp() {
        merchantIdRule = new MerchantIdRule();
    }

    @Test
    void evaluate_whenMerchantIdIsInBlacklist_shouldBeFraudulent() {
        // Arrange
        Transaction transaction = Transaction.builder()
                .merchantId("BLACKLISTED-1")
                .build();

        // Act
        TransactionFraudDetectionResult result = merchantIdRule.evaluate(transaction);

        // Assert
        assertTrue(result.isFraudulent());
        assertEquals(RuleConstants.FRAUDULENT_MERCHANT_ID_MESSAGE, result.getMessage());
    }

    @Test
    void evaluate_whenMerchantIdIsNotInBlacklist_shouldNotBeFraudulent() {
        // Arrange
        Transaction transaction = Transaction.builder()
                .merchantId("NOT-BLACKLISTED-1")
                .build();

        // Act
        TransactionFraudDetectionResult result = merchantIdRule.evaluate(transaction);

        // Assert
        assertFalse(result.isFraudulent());
        assertNull(result.getMessage());
    }
}
