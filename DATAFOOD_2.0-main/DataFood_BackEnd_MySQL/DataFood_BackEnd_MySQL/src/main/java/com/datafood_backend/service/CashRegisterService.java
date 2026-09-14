package com.datafood_backend.service;

import com.datafood_backend.dto.CashRegisterDTO;
import com.datafood_backend.dto.CashRegisterRequest;
import com.datafood_backend.dto.CashRegisterSummaryDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CashRegisterService {

    private final JdbcTemplate jdbc;

    // ── Abrir caja ─────────────────────────────────────────────────────────────
    public Integer open(CashRegisterRequest req) {
        try {
            String sql = "CALL SP_OpenCashRegister("
                    + req.getEmployeeId() + ", "
                    + (req.getOpeningAmount() != null ? req.getOpeningAmount() : 0) + ", "
                    + (req.getNote() != null ? "'" + req.getNote().replace("'", "''") + "'" : "NULL") + ")";

            return jdbc.queryForObject(sql, Integer.class);
        } catch (Exception e) {
            throw new RuntimeException("Error al abrir caja: " + e.getMessage());
        }
    }

    // ── Cerrar caja ────────────────────────────────────────────────────────────
    public Integer close(CashRegisterRequest req) {
        try {
            String sql = "CALL SP_CloseCashRegister("
                    + req.getCashRegisterId() + ", "
                    + req.getClosingAmount() + ", "
                    + (req.getNote() != null ? "'" + req.getNote().replace("'", "''") + "'" : "NULL") + ", "
                    + (req.getEmployeeId() != null ? req.getEmployeeId() : "NULL") + ")";


            return jdbc.queryForObject(sql, Integer.class);
        } catch (Exception e) {
            throw new RuntimeException("Error al cerrar caja: " + e.getMessage());
        }
    }

    // ── Caja activa de un empleado específico ──────────────────────────────────
    public CashRegisterDTO getActive(Integer employeeId) {
        try {
            String sql = "CALL SP_GetActiveCashRegister(" + employeeId + ")";
            return mapToDTO(sql);
        } catch (Exception e) {
            return null;
        }
    }

    // ── Cualquier caja activa ──────────────────────────────────────────────────
    public CashRegisterDTO getAnyActive() {
        try {
            String sql = "CALL SP_GetActiveCashRegister(NULL)";
            return mapToDTO(sql);
        } catch (Exception e) {
            return null;
        }
    }

    // ── Resumen de ventas del turno activo ─────────────────────────────────────
    public CashRegisterSummaryDTO getSummary(Integer cashRegisterId) {
        try {
            String cajaSQL = """
                SELECT openingAmount, openTime
                FROM CashRegister
                WHERE cashRegisterId = ?
                """;

            List<Map<String, Object>> cajaRows = jdbc.queryForList(cajaSQL, cashRegisterId);
            if (cajaRows.isEmpty()) return null;

            Map<String, Object> caja = cajaRows.get(0);

            BigDecimal openingAmount = toBigDecimal(caja.get("openingAmount"));
            Object openTimeObj = caja.get("openTime");
            if (openTimeObj == null) return null;

            String salesSQL = """
                SELECT
                    COALESCE(SUM(CASE WHEN isDelivery = 0 AND status = 'Completado'
                                   THEN total - COALESCE(deliveryFee,0) ELSE 0 END), 0) AS cashSales,
                    COALESCE(SUM(CASE WHEN isDelivery = 1 AND status = 'Completado'
                                   THEN total - COALESCE(deliveryFee,0) ELSE 0 END), 0) AS deliverySales,
                    COALESCE(SUM(CASE WHEN status = 'Completado'
                                   THEN total ELSE 0 END), 0) AS totalSales,
                    COALESCE(SUM(CASE WHEN status = 'Completado'
                                   THEN COALESCE(deliveryFee,0) ELSE 0 END), 0) AS deliveryFees,
                    COUNT(CASE WHEN status = 'Completado' THEN 1 END) AS totalOrders
                FROM SaleHeader
                WHERE saleDate >= ?
                """;

            List<Map<String, Object>> salesRows = jdbc.queryForList(salesSQL, openTimeObj);

            CashRegisterSummaryDTO dto = new CashRegisterSummaryDTO();

            if (!salesRows.isEmpty()) {
                Map<String, Object> r = salesRows.get(0);

                BigDecimal cashSales = toBigDecimal(r.get("cashSales"));
                BigDecimal deliverySales = toBigDecimal(r.get("deliverySales"));
                BigDecimal totalSales = toBigDecimal(r.get("totalSales"));
                BigDecimal deliveryFees = toBigDecimal(r.get("deliveryFees"));

                dto.setCashSales(cashSales);
                dto.setDeliverySales(deliverySales);
                dto.setTotalSales(totalSales);
                dto.setDeliveryFees(deliveryFees);
                dto.setTotalOrders(toInteger(r.get("totalOrders")));
                dto.setExpectedAmount(openingAmount.add(totalSales));
            } else {
                dto.setCashSales(BigDecimal.ZERO);
                dto.setDeliverySales(BigDecimal.ZERO);
                dto.setTotalSales(BigDecimal.ZERO);
                dto.setDeliveryFees(BigDecimal.ZERO);
                dto.setTotalOrders(0);
                dto.setExpectedAmount(openingAmount);
            }

            return dto;
        } catch (Exception e) {
            throw new RuntimeException("Error al calcular resumen: " + e.getMessage());
        }
    }

    // ── Reporte general de caja ────────────────────────────────────────────────
    public List<Map<String, Object>> getReport() {
        try {
            /*
             * OJO:
             * Aquí NO hacemos JOIN con Employee porque tu SQL Server dice que
             * Employee.name no existe.
             * Por ahora se muestra "Empleado #ID" para evitar que el reporte falle.
             */
            String cashSql = """
                SELECT
                    cr.cashRegisterId,
                    cr.employeeId,
                    COALESCE(CONCAT(e.firstName, ' ', e.lastName), 'Sin nombre') AS employeeName,
                    cr.closeEmployeeId,
                    COALESCE(CONCAT(ec.firstName, ' ', ec.lastName), NULL) AS closeEmployeeName,
                    cr.openTime,
                    cr.closeTime,
                    cr.openingAmount,
                    cr.closingAmount,
                    cr.status,
                    cr.openNote,
                    cr.closeNote
                FROM CashRegister cr
                LEFT JOIN Employee e  ON e.employeeId  = cr.employeeId
                LEFT JOIN Employee ec ON ec.employeeId = cr.closeEmployeeId
                ORDER BY cr.openTime DESC
                """;

            List<Map<String, Object>> cashRows = jdbc.queryForList(cashSql);
            List<Map<String, Object>> result = new ArrayList<>();

            for (Map<String, Object> row : cashRows) {
                Integer cashRegisterId = toInteger(row.get("cashRegisterId"));
                Integer employeeId = toInteger(row.get("employeeId"));

                Map<String, Object> item = new HashMap<>();
                item.put("cashRegisterId", cashRegisterId);
                item.put("employeeId", employeeId);
                item.put("employeeName", row.get("employeeName") != null
                        ? row.get("employeeName").toString()
                        : "—");
                item.put("closeEmployeeId",   toInteger(row.get("closeEmployeeId")));
                item.put("closeEmployeeName", row.get("closeEmployeeName") != null
                        ? row.get("closeEmployeeName").toString()
                        : null);
                item.put("openTime", toStringOrNull(row.get("openTime")));
                item.put("closeTime", toStringOrNull(row.get("closeTime")));
                item.put("openingAmount", toBigDecimal(row.get("openingAmount")));
                item.put("closingAmount", toBigDecimal(row.get("closingAmount")));
                item.put("status", row.get("status"));
                item.put("openNote", row.get("openNote"));
                item.put("closeNote", row.get("closeNote"));

                BigDecimal openingAmount = toBigDecimal(row.get("openingAmount"));
                BigDecimal closingAmount = toBigDecimal(row.get("closingAmount"));

                // Ventas de esa sesión
                String salesSql = """
                    SELECT
                        COALESCE(SUM(CASE WHEN sh.isDelivery = 0 AND sh.status = 'Completado'
                            THEN sh.total - COALESCE(sh.deliveryFee, 0) ELSE 0 END), 0) AS cashSales,

                        COALESCE(SUM(CASE WHEN sh.isDelivery = 1 AND sh.status = 'Completado'
                            THEN sh.total - COALESCE(sh.deliveryFee, 0) ELSE 0 END), 0) AS deliverySales,

                        COALESCE(SUM(CASE WHEN sh.status = 'Completado'
                            THEN sh.total ELSE 0 END), 0) AS totalSales,

                        COALESCE(SUM(CASE WHEN sh.status = 'Completado'
                            THEN COALESCE(sh.deliveryFee, 0) ELSE 0 END), 0) AS deliveryFees,

                        COUNT(CASE WHEN sh.status = 'Completado' THEN 1 END) AS totalOrders
                    FROM SaleHeader sh
                    WHERE sh.saleDate >= ?
                      AND (? IS NULL OR sh.saleDate <= ?)
                    """;

                List<Map<String, Object>> salesRows = jdbc.queryForList(
                        salesSql,
                        row.get("openTime"),
                        row.get("closeTime"),
                        row.get("closeTime")
                );

                BigDecimal cashSales = BigDecimal.ZERO;
                BigDecimal deliverySales = BigDecimal.ZERO;
                BigDecimal totalSales = BigDecimal.ZERO;
                BigDecimal deliveryFees = BigDecimal.ZERO;
                Integer totalOrders = 0;

                if (!salesRows.isEmpty()) {
                    Map<String, Object> sales = salesRows.get(0);

                    cashSales = toBigDecimal(sales.get("cashSales"));
                    deliverySales = toBigDecimal(sales.get("deliverySales"));
                    totalSales = toBigDecimal(sales.get("totalSales"));
                    deliveryFees = toBigDecimal(sales.get("deliveryFees"));
                    totalOrders = toInteger(sales.get("totalOrders"));
                }

                item.put("cashSales", cashSales);
                item.put("deliverySales", deliverySales);
                item.put("totalSales", totalSales);
                item.put("deliveryFees", deliveryFees);
                item.put("totalOrders", totalOrders);

                // Movimientos de esa sesión
                String movementSql = """
                    SELECT
                        cm.movementId,
                        cm.cashRegisterId,
                        cm.employeeId,
                        COALESCE(CONCAT(e.firstName, ' ', e.lastName), 'Sin nombre') AS employeeName,
                        cm.movementType,
                        cm.amount,
                        cm.reason,
                        cm.note,
                        cm.movementDate
                    FROM CashMovement cm
                    LEFT JOIN Employee e ON e.employeeId = cm.employeeId
                    WHERE cm.cashRegisterId = ?
                    ORDER BY cm.movementDate DESC
                    """;

                List<Map<String, Object>> movementRows = jdbc.queryForList(movementSql, cashRegisterId);
                List<Map<String, Object>> movements = new ArrayList<>();

                BigDecimal totalWithdrawals = BigDecimal.ZERO;
                BigDecimal totalDeposits = BigDecimal.ZERO;

                for (Map<String, Object> mov : movementRows) {
                    Integer movEmployeeId = toInteger(mov.get("employeeId"));
                    String movementType = mov.get("movementType") != null ? mov.get("movementType").toString() : "";
                    BigDecimal amount = toBigDecimal(mov.get("amount"));

                    if ("Retiro".equalsIgnoreCase(movementType)) {
                        totalWithdrawals = totalWithdrawals.add(amount);
                    } else if ("Deposito".equalsIgnoreCase(movementType) || "Depósito".equalsIgnoreCase(movementType)) {
                        totalDeposits = totalDeposits.add(amount);
                    }

                    Map<String, Object> movement = new HashMap<>();
                    movement.put("movementId", toInteger(mov.get("movementId")));
                    movement.put("cashRegisterId", toInteger(mov.get("cashRegisterId")));
                    movement.put("employeeId", movEmployeeId);
                    movement.put("employeeName", mov.get("employeeName") != null
                            ? mov.get("employeeName").toString()
                            : "—");
                    movement.put("movementType", mov.get("movementType"));
                    movement.put("amount", amount);
                    movement.put("reason", mov.get("reason"));
                    movement.put("note", mov.get("note"));
                    movement.put("movementDate", toStringOrNull(mov.get("movementDate")));
                    movement.put("createdAt",    toStringOrNull(mov.get("movementDate"))); // alias para el frontend

                    movements.add(movement);
                }

                item.put("movements", movements);

                /*
                 * Efectivo esperado:
                 * apertura + ventas totales + depósitos - retiros.
                 */
                BigDecimal expectedAmount = openingAmount
                        .add(totalSales)
                        .add(totalDeposits)
                        .subtract(totalWithdrawals);

                item.put("expectedAmount", expectedAmount);

                BigDecimal difference = BigDecimal.ZERO;
                if (row.get("closeTime") != null && row.get("closingAmount") != null) {
                    difference = closingAmount.subtract(expectedAmount);
                }

                item.put("difference", difference);

                result.add(item);
            }

            return result;
        } catch (Exception e) {
            throw new RuntimeException("Error al cargar reporte de caja: " + e.getMessage());
        }
    }

    // ── Helper: mapea primera fila al DTO ──────────────────────────────────────
    private CashRegisterDTO mapToDTO(String sql) {
        List<Map<String, Object>> rows = jdbc.queryForList(sql);
        if (rows.isEmpty()) return null;

        Map<String, Object> row = rows.get(0);
        CashRegisterDTO dto = new CashRegisterDTO();

        dto.setCashRegisterId(toInteger(row.get("cashRegisterId")));
        dto.setEmployeeId(toInteger(row.get("employeeId")));
        dto.setEmployeeName(row.get("employeeName") != null ? row.get("employeeName").toString() : null);
        dto.setOpenTime(toStringOrNull(row.get("openTime")));
        dto.setCloseTime(toStringOrNull(row.get("closeTime")));
        dto.setStatus(row.get("status") != null ? row.get("status").toString() : null);
        dto.setOpenNote(row.get("openNote") != null ? row.get("openNote").toString() : null);
        dto.setCloseNote(row.get("closeNote") != null ? row.get("closeNote").toString() : null);

        BigDecimal openingAmount = toBigDecimal(row.get("openingAmount"));
        dto.setOpeningAmount(openingAmount);
        dto.setExpectedAmount(openingAmount);

        dto.setClosingAmount(toBigDecimal(row.get("closingAmount")));
        dto.setDifference(toBigDecimal(row.get("difference")));

        return dto;
    }


    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        return new BigDecimal(value.toString());
    }

    private Integer toInteger(Object value) {
        if (value == null) return null;
        return ((Number) value).intValue();
    }

    private String toStringOrNull(Object value) {
        return value != null ? value.toString() : null;
    }
}