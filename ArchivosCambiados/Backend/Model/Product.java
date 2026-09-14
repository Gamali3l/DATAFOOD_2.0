package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "Product")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "productId")
    private Integer productId;

    @Column(name = "name", nullable = false, length = 45)
    private String name;
    private String imageUrl;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    // TINYINT en SQL Server: 1 = ACTIVO, 0 = INACTIVO
    @Column(name = "status", nullable = false)
    private Integer status = 0; // ── inactivo por defecto ──

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "lastActivationDate")
    private LocalDate lastActivationDate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "productCategory_productCategoryId", nullable = false)
    private ProductCategory productCategory;
}