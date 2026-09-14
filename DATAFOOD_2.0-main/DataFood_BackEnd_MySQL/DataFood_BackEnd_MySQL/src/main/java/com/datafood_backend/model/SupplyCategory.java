package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "SupplyCategory")
public class SupplyCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "supplyCategoryId")
    private Integer supplyCategoryId;

    @Column(name = "name", nullable = false, length = 45)
    private String name;
}
