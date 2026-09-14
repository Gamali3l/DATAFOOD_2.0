package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "Employee")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "employeeId")
    private Integer employeeId;

    @Column(name = "firstName", nullable = false, length = 45)
    private String firstName;

    @Column(name = "lastName", nullable = false, length = 45)
    private String lastName;

    @Column(name = "email", nullable = false, length = 45, unique = true)
    private String email;

    @Column(name = "nationalId", nullable = false, length = 45, unique = true)
    private String nationalId;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "status", nullable = false)
    private Byte status = 1;

    @Column(name = "salary", nullable = false, precision = 10, scale = 2)
    private java.math.BigDecimal salary;

    @Column(name = "hireDate", nullable = false)
    private LocalDate hireDate;

    @Column(name = "inactiveDate")
    private LocalDateTime inactiveDate;

    @Column(name = "reactivationDate")
    private LocalDateTime reactivationDate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "position_positionId", nullable = false)
    private Position position;




    @Column(name = "inactiveReason", length = 255)
    private String inactiveReason;


    // En tu Employee.java (entidad)

    @Column(name = "reset_token")
    private String resetToken;

    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;
}