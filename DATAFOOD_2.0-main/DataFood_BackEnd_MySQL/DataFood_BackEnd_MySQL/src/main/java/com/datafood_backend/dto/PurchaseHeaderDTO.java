package com.datafood_backend.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class PurchaseHeaderDTO {
    // Salida
    private Integer    purchaseHeaderId;
    private String     purchaseNumber;
    private String     purchaseDate;
    private String     paymentMethod;
    private String     status;
    private BigDecimal subtotal;
    private BigDecimal tax;
    private BigDecimal total;
    private BigDecimal taxRate;        // ← campo que faltaba
    private String     invoiceNumber;
    private String     notes;
    private Integer    supplierId;
    private String     supplierName;
    private Integer    employeeId;
    private String     employeeName;
    private List<PurchaseDetailDTO>    details;
    private List<PurchaseChangeLogDTO> changeLogs;
}