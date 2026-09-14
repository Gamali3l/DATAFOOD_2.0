package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "SupplyDailySnapshot")
public class SupplyDailySnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "supplyDailySnapshotId")
    private Integer supplyDailySnapshotId;

    @Column(name = "snapshotDate", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "stockAtClose", nullable = false, precision = 10, scale = 3)
    private BigDecimal stockAtClose;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supply_supplyId", nullable = false)
    private Supply supply;
}