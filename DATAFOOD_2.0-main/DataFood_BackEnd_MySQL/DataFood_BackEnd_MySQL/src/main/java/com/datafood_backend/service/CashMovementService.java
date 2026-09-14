package com.datafood_backend.service;

import com.datafood_backend.dto.CashBalanceDTO;
import com.datafood_backend.dto.CashMovementDTO;
import com.datafood_backend.dto.CashMovementRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlParameter;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.Types;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CashMovementService {

    private final JdbcTemplate jdbc;
    private final SimpleJdbcCall callCreate;
    private final SimpleJdbcCall callBalance;
    private final SimpleJdbcCall callMovements;

    /**
     * Constructor injection — no @PostConstruct needed, no javax/jakarta ambiguity.
     * SimpleJdbcCall instances are initialized once and reused (thread-safe after init).
     * Parameterized calls = zero SQL injection risk.
     */
    public CashMovementService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;

        // SP_CreateCashMovement -> returns a single INT (movementId)
        this.callCreate = new SimpleJdbcCall(jdbc)
                .withProcedureName("SP_CreateCashMovement")
                .declareParameters(
                        new SqlParameter("cashRegisterId", Types.INTEGER),
                        new SqlParameter("employeeId",     Types.INTEGER),
                        new SqlParameter("movementType",   Types.VARCHAR),
                        new SqlParameter("amount",         Types.DECIMAL),
                        new SqlParameter("reason",         Types.VARCHAR),
                        new SqlParameter("note",           Types.NVARCHAR)
                );

        // SP_GetCashBalance -> returns one result-set row with 5 numeric columns
        this.callBalance = new SimpleJdbcCall(jdbc)
                .withProcedureName("SP_GetCashBalance");

        // SP_GetCashMovements -> returns up to @limit rows
        this.callMovements = new SimpleJdbcCall(jdbc)
                .withProcedureName("SP_GetCashMovements")
                .declareParameters(
                        new SqlParameter("limit", Types.INTEGER)
                );
    }

    // ── Register a withdrawal or deposit ──────────────────────────────────────
    public Integer create(CashMovementRequest req) {
        try {
            // 1. Buscar automáticamente el ID de la caja activa
            Integer activeRegisterId = null;
            try {
                activeRegisterId = jdbc.query("{CALL SP_GetActiveCashRegister(?)}", rs -> {
                    if (rs.next()) return rs.getInt("cashRegisterId");
                    return null;
                }, req.getEmployeeId());
            } catch (Exception e) {
                // Continúa hacia la validación inferior si falla
            }

            if (activeRegisterId == null) {
                throw new RuntimeException("No hay una caja abierta para registrar el movimiento.");
            }

            // 2. Ejecutar el SP con parámetros posicionales (?)
            String sql = "{CALL SP_CreateCashMovement(?, ?, ?, ?, ?, ?)}";
            return jdbc.queryForObject(sql, Integer.class,
                    activeRegisterId,
                    req.getEmployeeId() != null ? req.getEmployeeId() : 1,
                    req.getMovementType(),
                    req.getAmount(),
                    req.getReason(),
                    req.getNote()
            );

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Error al registrar movimiento: " + e.getMessage(), e);
        }
    }

    // ── Accumulated cash balance ───────────────────────────────────────────────
    public CashBalanceDTO getBalance() {
        try {
            Map<String, Object> result = callBalance.execute();
            List<Map<String, Object>> rows = getResultSetRows(result);

            CashBalanceDTO dto = new CashBalanceDTO();
            if (rows == null || rows.isEmpty()) {
                dto.setTotalClosings(BigDecimal.ZERO);
                dto.setOpeningAmount(BigDecimal.ZERO);
                dto.setActiveSales(BigDecimal.ZERO);
                dto.setMovements(BigDecimal.ZERO);
                dto.setTotalBalance(BigDecimal.ZERO);
                return dto;
            }

            // Note: SP column aliases must match the keys used here.
            // SP_GetCashBalance returns: totalCierres, openingAmount, ventasActivas, movimientos, saldoTotal
            Map<String, Object> r = rows.get(0);
            dto.setTotalClosings(toBD(r.get("totalCierres")));
            dto.setOpeningAmount(toBD(r.get("openingAmount")));
            dto.setActiveSales(toBD(r.get("ventasActivas")));
            dto.setMovements(toBD(r.get("movimientos")));
            dto.setTotalBalance(toBD(r.get("saldoTotal")));
            return dto;

        } catch (Exception e) {
            throw new RuntimeException("Error calculating balance: " + e.getMessage(), e);
        }
    }

    // ── Movement history ──────────────────────────────────────────────────────
    public List<CashMovementDTO> getMovements() {
        try {
            Map<String, Object> params = new HashMap<>();
            params.put("limit", 50);

            Map<String, Object> result = callMovements.execute(params);
            List<Map<String, Object>> rows = getResultSetRows(result);

            if (rows == null) return List.of();

            return rows.stream().map(r -> {
                CashMovementDTO dto = new CashMovementDTO();
                dto.setMovementId(toInt(r.get("movementId")));
                dto.setMovementType((String) r.get("movementType"));
                dto.setAmount(toBD(r.get("amount")));
                dto.setReason((String) r.get("reason"));
                dto.setNote((String) r.get("note"));
                dto.setMovementDate(r.get("movementDate") != null
                        ? r.get("movementDate").toString() : null);
                dto.setEmployeeName((String) r.get("employeeName"));
                dto.setCashRegisterId(toInt(r.get("cashRegisterId")));
                return dto;
            }).collect(Collectors.toList());

        } catch (Exception e) {
            throw new RuntimeException("Error retrieving movements: " + e.getMessage(), e);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * SimpleJdbcCall places result-sets under the key "#result-set-1".
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> getResultSetRows(Map<String, Object> result) {
        Object rs = result.get("#result-set-1");
        if (rs instanceof List<?>) {
            return (List<Map<String, Object>>) rs;
        }
        return null;
    }

    private BigDecimal toBD(Object val) {
        return val != null ? new BigDecimal(val.toString()) : BigDecimal.ZERO;
    }

    private Integer toInt(Object val) {
        if (val == null) return null;
        if (val instanceof Integer) return (Integer) val;
        return Integer.valueOf(val.toString());
    }
}