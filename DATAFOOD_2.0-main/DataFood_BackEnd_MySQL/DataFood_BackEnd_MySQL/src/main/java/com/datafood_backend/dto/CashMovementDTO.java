package com.datafood_backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class CashMovementDTO {
    private Integer    movementId;
    private String     movementType;   // 'Retiro' | 'Deposito'
    private BigDecimal amount;
    private String     reason;
    private String     note;
    private String     movementDate;
    private String     employeeName;
    private Integer    cashRegisterId;
}