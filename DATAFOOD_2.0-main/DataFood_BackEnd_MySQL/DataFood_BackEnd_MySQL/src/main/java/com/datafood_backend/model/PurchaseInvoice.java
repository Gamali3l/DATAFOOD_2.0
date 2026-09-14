package com.datafood_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "PurchaseInvoice")
public class PurchaseInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "invoiceId")
    private Integer invoiceId;

    @Column(name = "invoiceNumber", insertable = false, updatable = false)
    private String invoiceNumber;

    @Column(name = "generatedAt", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "taxRate", nullable = false, precision = 5, scale = 2)
    private BigDecimal taxRate;

    @Column(name = "taxAmount", nullable = false, precision = 10, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "totalAmount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "supplierName", nullable = false, length = 100)
    private String supplierName;

    @Column(name = "supplierCompany", nullable = false, length = 100)
    private String supplierCompany;

    @JsonIgnore
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchaseHeader_id", nullable = false)
    private PurchaseHeader purchaseHeader;
}
