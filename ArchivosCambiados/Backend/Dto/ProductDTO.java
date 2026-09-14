package com.datafood_backend.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductDTO {
    private Integer    productId;
    private String     name;
    private BigDecimal price;

    // 1 = ACTIVO, 0 = INACTIVO  (se convierte a String para el frontend)
    private Integer status;
    private String imageUrl;

    private String description;

    // Relación
    private Integer productCategoryId;
    private String  categoryName;
}
