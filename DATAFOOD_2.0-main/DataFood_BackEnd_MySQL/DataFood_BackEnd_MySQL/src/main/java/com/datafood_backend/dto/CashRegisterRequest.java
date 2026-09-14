package com.datafood_backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class CashRegisterRequest {
    private Integer    employeeId;      // empleado que realiza la acción (de la sesión activa)
    private BigDecimal openingAmount;   // para apertura
    private BigDecimal closingAmount;   // para cierre
    private Integer    cashRegisterId;  // para cierre
    private String     note;
}