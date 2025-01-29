package com.example.demo.datamodel.frauddetection;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Transaction {
    private String transactionId;
    private Double amount;
    private String currency;
    private String merchantId;
    private String cardNumber;
    private String timestamp;
}
