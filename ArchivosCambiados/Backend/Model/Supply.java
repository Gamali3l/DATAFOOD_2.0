package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Entity
@Table(name = "Supply")
public class Supply {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "supplyId")
    private Integer supplyId;

    @Column(name = "name", nullable = false, length = 45)
    private String name;

    @Column(name = "availableQuantity", nullable = false)
    private Integer availableQuantity;

    @Column(name = "minimumQuantity", nullable = false)
    private Integer minimumQuantity;

    @Column(name = "unitOfMeasure", nullable = false, length = 45)
    private String unitOfMeasure;

    @Column(name = "stockAlert")
    private Boolean stockAlert = false;

    @Column(name = "averageCost", nullable = false, precision = 10, scale = 2)
    private BigDecimal averageCost = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplyCategory_supplyCategoryId", nullable = false)
    private SupplyCategory supplyCategory;
}

