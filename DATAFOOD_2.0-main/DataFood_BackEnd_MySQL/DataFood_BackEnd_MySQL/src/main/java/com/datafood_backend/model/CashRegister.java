package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "CashRegister")
public class CashRegister {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer cashRegisterId;

    @ManyToOne
    @JoinColumn(name = "employeeId", nullable = false)
    private Employee employee;

    private LocalDateTime openTime;
    private LocalDateTime closeTime;
    private BigDecimal    openingAmount;
    private BigDecimal    closingAmount;
    private BigDecimal    difference;
    private String        status;      // 'Abierta' | 'Cerrada'
    private String        openNote;
    private String        closeNote;
}