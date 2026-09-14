package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "StockAdjustment")
public class StockAdjustment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "adjustmentId")
    private Integer adjustmentId;

    @Column(name = "adjustmentDate", nullable = false)
    private LocalDateTime adjustmentDate;

    @Column(name = "quantityDecreased", nullable = false, precision = 10, scale = 3)
    private BigDecimal quantityDecreased;

    @Column(name = "reason", nullable = false, length = 200)
    private String reason;

    @Column(name = "adjustmentType", nullable = false, length = 20)
    private String adjustmentType = "CORRECTION"; // CORRECTION | EXPIRED | KITCHEN_ACCIDENT | STAFF_CONSUMPTION

    @Column(name = "lossAmount", precision = 10, scale = 2)
    private BigDecimal lossAmount;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supply_supplyId", nullable = false)
    private Supply supply;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_employeeId", nullable = false)
    private Employee employee;
}