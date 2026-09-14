package com.datafood_backend.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class DailyStatsDTO {
    private long       ventasHoy;
    private long       ventasAyer;
    private BigDecimal ingresosHoy;
    private BigDecimal ingresosAyer;
    private long       domiciliosHoy;
    private long       domiciliosAyer;
    private boolean    cajaAbierta;
    private String     horaApertura;   // "08:00 AM" o null
    private String     ultimaVenta;    // ISO-8601 o null
}