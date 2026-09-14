package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "PurchaseHeader")
public class PurchaseHeader {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "purchaseHeaderId")
    private Integer purchaseHeaderId;

    // Columna calculada — solo lectura
    @Column(name = "purchaseNumber", insertable = false, updatable = false)
    private String purchaseNumber;

    @Column(name = "purchaseDate", nullable = false)
    private LocalDateTime purchaseDate;

    @Column(name = "paymentMethod", nullable = false, length = 30)
    private String paymentMethod = "Efectivo";

    @Column(name = "status", nullable = false, length = 20)
    private String status = "Recibido";

    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "tax", nullable = false, precision = 10, scale = 2)
    private BigDecimal tax = BigDecimal.ZERO;

    @Column(name = "total", nullable = false, precision = 10, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "taxRate", nullable = false, precision = 5, scale = 2)  // ← campo que faltaba
    private BigDecimal taxRate = BigDecimal.ZERO;

    @Column(name = "invoiceNumber", length = 20)
    private String invoiceNumber;

    @Column(name = "notes", length = 200)
    private String notes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplier_supplierId", nullable = false)
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_employeeId", nullable = false)
    private Employee employee;

    @OneToMany(mappedBy = "purchaseHeader", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<PurchaseDetail> details;

    @OneToMany(
            mappedBy = "purchaseHeader",
            cascade = CascadeType.ALL,
            fetch = FetchType.EAGER
    )
    @OrderBy("logDate DESC")
    private List<PurchaseChangeLog> changeLogs;
}