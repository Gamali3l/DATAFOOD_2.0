package com.datafood_backend.dto;

import lombok.Data;

@Data
public class SupplyDTO {

    private Integer supplyCategoryId;
    private Integer supplyId;
    private String name;
    private Integer availableQuantity;
    private Integer minimumQuantity;
    private String unitOfMeasure;
    private Boolean stockAlert;

    // Datos de categoría
    private String categoryName;

    // Datos de última compra
    private String lastPurchaseDate;
    private String lastSupplierName;
    private Double lastUnitPrice;
    private Double averageCost;
}