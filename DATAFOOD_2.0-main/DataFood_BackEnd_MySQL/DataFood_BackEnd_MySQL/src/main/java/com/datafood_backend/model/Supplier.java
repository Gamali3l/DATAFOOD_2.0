package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "Supplier")
public class Supplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "supplierId")
    private Integer supplierId;

    @Column(name = "name", nullable = false, length = 45)
    private String name;

    @Column(name = "status", nullable = false)
    private Byte status = 1;

    @Column(name = "company", nullable = false, length = 45)
    private String company;

    @Column(name = "description", length = 45)
    private String description;

    //  orphanRemoval=true: cuando se elimina un phone de la colección,
    //    JPA  borra también de la base de datos automáticamente muejeje
    @OneToMany(mappedBy = "supplier", cascade = CascadeType.ALL,
            orphanRemoval = true, fetch = FetchType.LAZY)
    private List<SupplierPhone> phones = new ArrayList<>();

    // fix para addresses
    @OneToMany(mappedBy = "supplier", cascade = CascadeType.ALL,
            orphanRemoval = true, fetch = FetchType.LAZY)
    private List<SupplierAddress> addresses = new ArrayList<>();
}