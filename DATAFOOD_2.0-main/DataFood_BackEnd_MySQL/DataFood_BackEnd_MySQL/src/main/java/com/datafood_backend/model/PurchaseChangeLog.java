package com.datafood_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "PurchaseChangeLog")
public class PurchaseChangeLog {

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
    @JoinColumn(name = "purchaseHeader_id", nullable = false)
    private PurchaseHeader purchaseHeader;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_employeeId", nullable = false)
    private Employee employee;
}
