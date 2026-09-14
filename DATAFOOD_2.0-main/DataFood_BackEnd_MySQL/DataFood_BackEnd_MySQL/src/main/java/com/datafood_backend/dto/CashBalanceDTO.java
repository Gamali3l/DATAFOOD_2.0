package com.datafood_backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class CashBalanceDTO {
    private BigDecimal totalClosings;       // sum of all closingAmount from closed registers
    private BigDecimal openingAmount;       // opening amount of the currently active register (if any)
    private BigDecimal activeSales;         // cash sales during the current shift
    private BigDecimal movements;           // deposits minus withdrawals (historical)
    private BigDecimal totalBalance;        // sum of all the above
}