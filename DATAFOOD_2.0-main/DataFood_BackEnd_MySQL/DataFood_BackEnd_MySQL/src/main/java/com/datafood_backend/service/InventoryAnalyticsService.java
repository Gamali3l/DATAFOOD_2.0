package com.datafood_backend.service;

import com.datafood_backend.dto.AdjustStockRequest;
import com.datafood_backend.dto.InventoryAnalyticsDTO;
import com.datafood_backend.model.Supply;
import com.datafood_backend.model.SupplyDailySnapshot;
import com.datafood_backend.model.StockAdjustment;
import com.datafood_backend.model.Employee;
import com.datafood_backend.repository.SupplyRepository;
import com.datafood_backend.repository.SupplyDailySnapshotRepository;
import com.datafood_backend.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InventoryAnalyticsService {

    private static final int    LOOKBACK_DAYS       = 14; // ventana máxima para buscar el snapshot más viejo
    private static final double GREEN_THRESHOLD     = 7.0;
    private static final double YELLOW_THRESHOLD    = 3.0;
    private static final int    SUGGESTED_TARGET_DAYS = 14; // "compra para cubrir 14 días"

    private final SupplyRepository               supplyRepo;
    private final SupplyDailySnapshotRepository  snapshotRepo;
    private final EmployeeRepository             employeeRepo;
    private final JdbcTemplate                   jdbc;

    // ── Job diario: guarda el stock de cierre de cada insumo ──────────────
    @Scheduled(cron = "0 0 0 * * *") // todos los días a medianoche
    @Transactional
    public void generateSnapshotScheduled() {
        generateSnapshotNow();
    }

    // Método público separado para poder dispararlo manualmente en pruebas
    @Transactional
    public void generateSnapshotNow() {
        LocalDate today = LocalDate.now();
        List<Supply> supplies = supplyRepo.findAll();

        for (Supply s : supplies) {
            SupplyDailySnapshot snap = snapshotRepo
                    .findBySupply_SupplyIdAndSnapshotDate(s.getSupplyId(), today)
                    .orElseGet(SupplyDailySnapshot::new);

            snap.setSupply(s);
            snap.setSnapshotDate(today);
            snap.setStockAtClose(BigDecimal.valueOf(s.getAvailableQuantity()));
            snapshotRepo.save(snap);
        }
    }

    // ── Cálculo de días restantes para UN insumo ───────────────────────────
    private Double calculateDaysRemaining(Supply s) {
        LocalDate from = LocalDate.now().minusDays(LOOKBACK_DAYS);

        Optional<SupplyDailySnapshot> oldestOpt = snapshotRepo
                .findFirstBySupply_SupplyIdAndSnapshotDateGreaterThanEqualOrderBySnapshotDateAsc(
                        s.getSupplyId(), from);

        if (oldestOpt.isEmpty()) {
            return null; // todavía no hay suficiente historial — necesita al menos 1 snapshot previo
        }

        SupplyDailySnapshot oldest = oldestOpt.get();
        long periodDays = ChronoUnit.DAYS.between(oldest.getSnapshotDate(), LocalDate.now());
        if (periodDays <= 0) periodDays = 1; // evita división entre cero si es el mismo día

        // Entradas (compras recibidas) de este insumo desde la fecha del snapshot más viejo
        Double entries = jdbc.queryForObject(
                "SELECT IFNULL(SUM(pd.quantity), 0) " +
                        "FROM PurchaseDetail pd " +
                        "INNER JOIN PurchaseHeader ph ON ph.purchaseHeaderId = pd.purchaseHeader_id " +
                        "WHERE pd.supply_supplyId = ? AND ph.status <> 'Anulado' " +
                        "AND ph.purchaseDate >= ?",
                Double.class, s.getSupplyId(), oldest.getSnapshotDate().atStartOfDay()
        );
        if (entries == null) entries = 0.0;

        double initialStock = oldest.getStockAtClose().doubleValue();
        double currentStock = s.getAvailableQuantity();

        double consumption = initialStock + entries - currentStock;
        if (consumption <= 0) return null; // no hubo consumo neto — no se puede proyectar

        double dailyAvg = consumption / periodDays;
        if (dailyAvg <= 0) return null;

        return currentStock / dailyAvg;
    }

    private String colorFor(Double daysRemaining, Supply s) {
        if (daysRemaining == null) {
            // sin datos suficientes: usa el criterio simple que ya tenían (stockAlert)
            return Boolean.TRUE.equals(s.getStockAlert()) ? "RED" : null;
        }
        if (daysRemaining > GREEN_THRESHOLD) return "GREEN";
        if (daysRemaining >= YELLOW_THRESHOLD) return "YELLOW";
        return "RED";
    }

    // ── Trae en un solo query la última compra de CADA insumo, para no hacer N+1 ──
    private Map<Integer, Object[]> fetchLastPurchaseInfo() {
        Map<Integer, Object[]> map = new HashMap<>();
        jdbc.query("SELECT supplyId, lastPurchaseDate, lastSupplierName FROM vw_SupplyInventory", rs -> {
            map.put(rs.getInt("supplyId"), new Object[]{
                    rs.getTimestamp("lastPurchaseDate"),
                    rs.getString("lastSupplierName")
            });
        });
        return map;
    }

    private InventoryAnalyticsDTO toDTO(Supply s, Map<Integer, Object[]> lastPurchaseMap) {
        InventoryAnalyticsDTO dto = new InventoryAnalyticsDTO();
        dto.setSupplyId(s.getSupplyId());
        dto.setName(s.getName());
        dto.setAvailableQuantity(s.getAvailableQuantity());
        dto.setMinimumQuantity(s.getMinimumQuantity());
        dto.setUnitOfMeasure(s.getUnitOfMeasure());
        dto.setStockAlert(s.getStockAlert());
        dto.setSupplyCategoryId(s.getSupplyCategory() != null ? s.getSupplyCategory().getSupplyCategoryId() : null);
        dto.setCategoryName(s.getSupplyCategory() != null ? s.getSupplyCategory().getName() : null);

        Object[] lp = lastPurchaseMap.get(s.getSupplyId());
        if (lp != null) {
            dto.setLastPurchaseDate(lp[0] != null ? lp[0].toString() : null);
            dto.setLastSupplierName((String) lp[1]);
        }

        Double daysRemaining = calculateDaysRemaining(s);
        dto.setDaysRemaining(daysRemaining);
        dto.setSemaphoreColor(colorFor(daysRemaining, s));
        return dto;
    }

    // ── Endpoints ────────────────────────────────────────────────────────
    public List<InventoryAnalyticsDTO> getAll() {
        Map<Integer, Object[]> lastPurchaseMap = fetchLastPurchaseInfo();
        List<InventoryAnalyticsDTO> list = new ArrayList<>();
        for (Supply s : supplyRepo.findAll()) {
            list.add(toDTO(s, lastPurchaseMap));
        }
        return list;
    }

    public List<InventoryAnalyticsDTO> getLowStock() {
        List<InventoryAnalyticsDTO> all = getAll();
        all.removeIf(d -> !"RED".equals(d.getSemaphoreColor()) && !"YELLOW".equals(d.getSemaphoreColor()));
        all.sort((a, b) -> {
            if (a.getDaysRemaining() == null) return 1;
            if (b.getDaysRemaining() == null) return -1;
            return Double.compare(a.getDaysRemaining(), b.getDaysRemaining());
        });
        return all;
    }

    public List<InventoryAnalyticsDTO> getSuggestedPurchases() {
        List<InventoryAnalyticsDTO> all = getAll();
        List<InventoryAnalyticsDTO> suggested = new ArrayList<>();

        for (InventoryAnalyticsDTO d : all) {
            boolean lowStock = d.getAvailableQuantity() <= d.getMinimumQuantity();
            boolean lowDays  = d.getDaysRemaining() != null && d.getDaysRemaining() <= GREEN_THRESHOLD;

            if (lowStock || lowDays) {
                double dailyAvg = (d.getDaysRemaining() != null && d.getDaysRemaining() > 0)
                        ? d.getAvailableQuantity() / d.getDaysRemaining()
                        : 0;

                double target = dailyAvg > 0
                        ? dailyAvg * SUGGESTED_TARGET_DAYS
                        : d.getMinimumQuantity() * 2;

                double suggestedQty = Math.max(target - d.getAvailableQuantity(), 0);

                d.setSuggestedQuantity(Math.round(suggestedQty * 100.0) / 100.0);
                d.setSuggestReason(lowStock ? "BAJO_STOCK" : "CONSUMO_ALTO");
                suggested.add(d);
            }
        }

        suggested.sort((a, b) -> {
            if (a.getDaysRemaining() == null) return 1;
            if (b.getDaysRemaining() == null) return -1;
            return Double.compare(a.getDaysRemaining(), b.getDaysRemaining());
        });
        return suggested;
    }

    // ── Ajuste manual de stock (con motivo, no rompe el cálculo de consumo) ─
    @Transactional
    public void adjustStock(Integer supplyId, AdjustStockRequest req) {
        Supply s = supplyRepo.findById(supplyId)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado: " + supplyId));
        Employee emp = employeeRepo.findById(req.getEmployeeId() != null ? req.getEmployeeId() : 1)
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));

        BigDecimal previousQty = BigDecimal.valueOf(s.getAvailableQuantity());
        BigDecimal newQty      = BigDecimal.valueOf(req.getNewQuantity());
        BigDecimal diff        = previousQty.subtract(newQty).abs();

        s.setAvailableQuantity(req.getNewQuantity().intValue());
        supplyRepo.save(s);

        StockAdjustment adj = new StockAdjustment();
        adj.setAdjustmentDate(java.time.LocalDateTime.now());
        adj.setQuantityDecreased(diff);
        adj.setReason(req.getReason() != null ? req.getReason() : "Ajuste manual");
        adj.setAdjustmentType("CORRECTION");
        adj.setSupply(s);
        adj.setEmployee(emp);
        // No usamos un repositorio de StockAdjustment aquí para no crear uno extra;
        // si prefieres, crea StockAdjustmentRepository y guarda con .save(adj).
        jdbc.update(
                "INSERT INTO StockAdjustment (adjustmentDate, quantityDecreased, reason, adjustmentType, supply_supplyId, employee_employeeId) " +
                        "VALUES (NOW(), ?, ?, 'CORRECTION', ?, ?)",
                diff, adj.getReason(), supplyId, emp.getEmployeeId()
        );
    }
}