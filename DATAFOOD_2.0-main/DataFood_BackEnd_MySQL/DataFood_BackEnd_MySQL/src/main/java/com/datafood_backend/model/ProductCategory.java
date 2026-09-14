package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "ProductCategory")
public class ProductCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "productCategoryId")
    private Integer productCategoryId;

    @Column(name = "name", nullable = false, length = 30)
    private String name;
}
