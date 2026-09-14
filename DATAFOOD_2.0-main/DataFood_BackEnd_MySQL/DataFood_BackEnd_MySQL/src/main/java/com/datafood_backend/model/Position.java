package com.datafood_backend.model;

import jakarta.persistence.*;
import lombok.Data;

/**
 * Mapea la tabla Position (Cargo) del SQL.
 * Requerido por Employee.
 */
@Data
@Entity
@Table(name = "Position")
public class Position {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "positionId")
    private Integer positionId;

    @Column(name = "positionName", nullable = false, length = 45)
    private String positionName;
}