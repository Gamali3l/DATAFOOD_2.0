package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "SupplierAddress")
public class SupplierAddress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "supplierAddressId")
    private Integer supplierAddressId;

    @Column(name = "address", nullable = false, length = 45)
    private String address;

    @ManyToOne
    @JoinColumn(name = "supplier_supplierId", nullable = false)
    private Supplier supplier;
}