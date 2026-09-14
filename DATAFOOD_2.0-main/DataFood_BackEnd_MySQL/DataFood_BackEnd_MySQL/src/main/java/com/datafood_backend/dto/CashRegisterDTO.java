package com.datafood_backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class CashRegisterDTO {
    private Integer    cashRegisterId;
    private Integer    employeeId;        // ← ID del empleado que abrió la caja
    private String     employeeName;
    private String     openTime;
    private String     closeTime;
    private BigDecimal openingAmount;
    private BigDecimal closingAmount;
    private BigDecimal expectedAmount;    // ← efectivo esperado al cierre
    private BigDecimal difference;
    private String     status;
    private String     openNote;
    private String     closeNote;
}