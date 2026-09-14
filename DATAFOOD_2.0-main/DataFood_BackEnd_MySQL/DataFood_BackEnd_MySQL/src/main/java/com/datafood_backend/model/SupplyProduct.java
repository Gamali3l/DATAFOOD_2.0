package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Entity
@IdClass(SupplyProductId.class)
@Table(name = "SupplyProduct")
public class SupplyProduct {

    @Id
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supply_supplyId")
    private Supply supply;

    @Id
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_productId")
    private Product product;

    @Column(name = "quantity", nullable = false, precision = 10, scale = 3)
    private BigDecimal quantity;
}