package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "SaleHeader")
public class SaleHeader {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "saleHeaderId")
    private Integer saleHeaderId;

    /** Columna calculada en SQL: V-000001. No insertable ni updatable. */
    @Column(name = "saleNumber", insertable = false, updatable = false)
    private String saleNumber;

    @Column(name = "saleDate", nullable = false)
    private LocalDateTime saleDate;

    @Column(name = "clientName", length = 100)
    private String clientName;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "deliveryFee", precision = 10, scale = 2)
    private BigDecimal deliveryFee = BigDecimal.ZERO;

    @Column(name = "isDelivery", nullable = false)
    private Boolean isDelivery = false;

    /** Local | Domicilio */
    @Column(name = "saleType", length = 20)
    private String saleType;

    /** Completado | Anulado */
    @Column(name = "status", length = 20)
    private String status = "Completado";

    @Column(name = "invoiceNumber", length = 30)
    private String invoiceNumber;

    @Column(name = "total", nullable = false, precision = 10, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_employeeId", nullable = false)
    private Employee employee;

    @OneToMany(mappedBy = "saleHeader", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<SaleDetail> details;

    @OneToMany(mappedBy = "saleHeader", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Salechangelog> changeLogs;
}