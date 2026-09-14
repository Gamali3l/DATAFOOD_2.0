package com.datafood_backend.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class ProductCostingDTO {
    private Integer    productId;
    private String     productName;
    private BigDecimal salePrice;
    private BigDecimal productionCost;
    private BigDecimal marginAmount;
    private BigDecimal marginPercent;
    private List<RecipeItemDTO> recipe;
}