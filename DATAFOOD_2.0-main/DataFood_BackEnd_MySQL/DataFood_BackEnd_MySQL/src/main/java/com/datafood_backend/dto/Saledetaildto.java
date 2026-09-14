package com.datafood_backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class Saledetaildto {

    private Integer    saleDetailId;
    private Integer    productId;
    private String     productName;
    private String     categoryName;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal subtotal;
}