package com.datafood_backend.dto;

import lombok.Data;

@Data
public class InventoryAnalyticsDTO {
    private Integer supplyId;
    private String  name;
    private Integer availableQuantity;
    private Integer minimumQuantity;
    private String  unitOfMeasure;
    private Boolean stockAlert;
    private Integer supplyCategoryId;
    private String  categoryName;
    private String  lastPurchaseDate;
    private String  lastSupplierName;

    private Double  daysRemaining;
    private String  semaphoreColor;
    private Double  suggestedQuantity;
    private String  suggestReason;
}