package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "SaleChangeLog")
public class Salechangelog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "logId")
    private Integer logId;

    @Column(name = "logDate", nullable = false)
    private LocalDateTime logDate;

    @Column(name = "action", nullable = false, length = 50)
    private String action;

    @Column(name = "detail", nullable = false, length = 500)
    private String detail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "saleHeader_id", nullable = false)
    private SaleHeader saleHeader;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_employeeId", nullable = false)
    private Employee employee;
}