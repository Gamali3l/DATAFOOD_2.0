package com.datafood_backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class CashRegisterSummaryDTO {
    private BigDecimal cashSales;        // ventas en efectivo (Local)
    private BigDecimal deliverySales;    // ventas domicilio
    private BigDecimal totalSales;       // total de todas las ventas del período
    private BigDecimal deliveryFees;     // cargos de domicilio cobrados
    private BigDecimal expectedAmount;   // openingAmount + cashSales (efectivo esperado en caja)
    private Integer    totalOrders;      // número de ventas completadas
}