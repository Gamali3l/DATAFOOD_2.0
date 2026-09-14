package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "PurchaseDetail")
public class PurchaseDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "purchaseDetailId")
    private Integer purchaseDetailId;

    @Column(name = "quantity", nullable = false)
    private BigDecimal quantity;

    @Column(name = "unitPrice", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "subtotal", nullable = false)
    private BigDecimal subtotal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchaseHeader_id", nullable = false)
    private PurchaseHeader purchaseHeader;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supply_supplyId", nullable = false)
    private Supply supply;

    //  Proveedor por ítem nullable (solo en modo multi-proveedor, pero para cuando es uno, no va salir)
    // Si es null, el ítem hereda el proveedor del PurchaseHeader
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_supplierId", nullable = true)
    private Supplier supplier;
}