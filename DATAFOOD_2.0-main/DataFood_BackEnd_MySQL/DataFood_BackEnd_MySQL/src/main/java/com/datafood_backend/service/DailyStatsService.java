package com.datafood_backend.service;

import com.datafood_backend.dto.CashRegisterDTO;
import com.datafood_backend.dto.DailyStatsDTO;
import com.datafood_backend.model.SaleHeader;
import com.datafood_backend.repository.SaleHeaderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DailyStatsService {

    private final SaleHeaderRepository saleRepo;
    private final CashRegisterService  cashRegisterService; // FIX: usar este en lugar de CashMovementService

    private static final DateTimeFormatter TIME_FMT =
            DateTimeFormatter.ofPattern("hh:mm a");

    public DailyStatsDTO getStats() {

        List<SaleHeader> all = saleRepo.findAll();

        LocalDateTime todayStart     = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd       = todayStart.plusDays(1);
        LocalDateTime yesterdayStart = todayStart.minusDays(1);

        // ── Ventas activas de hoy (excluye CANCELLED / ANULADA) ──
        List<SaleHeader> hoy = all.stream()
                .filter(s -> s.getSaleDate() != null
                        && !s.getSaleDate().isBefore(todayStart)
                        &&  s.getSaleDate().isBefore(todayEnd)
                        && !isCancelled(s))
                .collect(Collectors.toList());

        // ── Ventas activas de ayer ──
        List<SaleHeader> ayer = all.stream()
                .filter(s -> s.getSaleDate() != null
                        && !s.getSaleDate().isBefore(yesterdayStart)
                        &&  s.getSaleDate().isBefore(todayStart)
                        && !isCancelled(s))
                .collect(Collectors.toList());

        // ── Ingresos ──
        BigDecimal ingresosHoy = hoy.stream()
                .map(s -> s.getTotal() != null ? s.getTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal ingresosAyer = ayer.stream()
                .map(s -> s.getTotal() != null ? s.getTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ── Domicilios ──
        long domHoy  = hoy .stream().filter(this::isDelivery).count();
        long domAyer = ayer.stream().filter(this::isDelivery).count();

        // ── Última venta de hoy ──
        String ultimaVenta = hoy.stream()
                .max(Comparator.comparing(SaleHeader::getSaleDate))
                .map(s -> s.getSaleDate().toString())
                .orElse(null);

        // ── Estado de caja ────────────────────────────────────────────────────
        // FIX: usar getAnyActive() que llama SP_GetActiveCashRegister @employeeId = NULL
        // Devuelve null si no hay ninguna caja abierta, o el DTO si hay una activa.
        boolean cajaAbierta  = false;
        String  horaApertura = null;
        try {
            CashRegisterDTO cajaActiva = cashRegisterService.getAnyActive();

            if (cajaActiva != null) {
                cajaAbierta = true;

                // Formatear hora de apertura desde openTime (viene como String ISO)
                if (cajaActiva.getOpenTime() != null) {
                    try {
                        // openTime puede ser "2025-01-15T08:30:00" o "2025-01-15 08:30:00.0"
                        String raw = cajaActiva.getOpenTime().replace(" ", "T");
                        // Truncar milisegundos si los tiene: "2025-01-15T08:30:00.123" -> "2025-01-15T08:30:00"
                        if (raw.contains(".")) {
                            raw = raw.substring(0, raw.indexOf("."));
                        }
                        LocalDateTime openDT = LocalDateTime.parse(raw);
                        horaApertura = openDT.format(TIME_FMT); // "08:30 AM"
                    } catch (Exception ignored) {
                        // Si el formato es inesperado dejamos horaApertura como null
                        horaApertura = cajaActiva.getOpenTime();
                    }
                }
            }
        } catch (Exception ignored) {
            // Si el SP falla no rompemos el endpoint, cajaAbierta queda false
        }

        // ── Armar respuesta ──
        DailyStatsDTO dto = new DailyStatsDTO();
        dto.setVentasHoy(hoy.size());
        dto.setVentasAyer(ayer.size());
        dto.setIngresosHoy(ingresosHoy);
        dto.setIngresosAyer(ingresosAyer);
        dto.setDomiciliosHoy(domHoy);
        dto.setDomiciliosAyer(domAyer);
        dto.setCajaAbierta(cajaAbierta);   // true/false real basado en SP
        dto.setHoraApertura(horaApertura);
        dto.setUltimaVenta(ultimaVenta);
        return dto;
    }

    // ── Helpers ──────────────────────────────────────────────────
    private boolean isCancelled(SaleHeader s) {
        if (s.getStatus() == null) return false;
        String st = s.getStatus().trim().toUpperCase();
        return st.equals("CANCELLED") || st.equals("ANULADA") || st.equals("ANULADO");
    }

    private boolean isDelivery(SaleHeader s) {
        if (s.getSaleType() == null) return false;
        String t = s.getSaleType().trim().toUpperCase();
        return t.equals("DELIVERY") || t.equals("DOMICILIO");
    }
}