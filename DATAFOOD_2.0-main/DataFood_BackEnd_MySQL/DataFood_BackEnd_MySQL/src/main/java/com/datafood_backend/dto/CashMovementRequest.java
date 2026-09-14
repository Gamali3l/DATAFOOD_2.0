package com.datafood_backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class CashMovementRequest {
    private Integer    cashRegisterId;
    private Integer    employeeId;
    private String     movementType;   // 'Retiro' | 'Deposito'
    private BigDecimal amount;
    private String     reason;
    private String     note;
}