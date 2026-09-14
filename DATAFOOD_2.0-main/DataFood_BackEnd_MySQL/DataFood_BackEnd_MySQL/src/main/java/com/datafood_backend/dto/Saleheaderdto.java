package com.datafood_backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class Saleheaderdto {

    private Integer    saleHeaderId;
    private String     saleNumber;
    private String     saleDate;
    private String     saleType;       // "Local" | "Domicilio"
    private String     clientName;
    private String     address;
    private BigDecimal deliveryFee;
    private BigDecimal subtotal;       // total sin envío (para mostrar desglose)
    private BigDecimal total;

    private String     invoiceNumber;      // Número de factura editable
    private String     status;            // "Completado" | "Anulado"

    private Integer    employeeId;
    private String     employeeName;

    private List<Saledetaildto> details;
}