package com.datafood_backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class RecipeItemDTO {
    private Integer    supplyId;
    private String     supplyName;
    private String     unitOfMeasure;
    private BigDecimal quantity;
    private BigDecimal unitCost;   // = averageCost del insumo al momento de consultar
    private BigDecimal subtotal;   // = quantity * unitCost
}