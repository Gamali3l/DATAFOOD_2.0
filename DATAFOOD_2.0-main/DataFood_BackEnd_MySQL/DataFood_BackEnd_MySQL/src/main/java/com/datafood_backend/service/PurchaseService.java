package com.datafood_backend.service;

import com.datafood_backend.dto.*;
import com.datafood_backend.model.*;
import com.datafood_backend.repository.PurchaseHeaderRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseHeaderRepository purchaseRepo;
    private final JdbcTemplate             jdbc;
    private final ObjectMapper             objectMapper;

    // ── Listar / filtrar compras ─────────────────────────────────
    @Transactional(readOnly = true)
    public List<PurchaseHeaderDTO> filter(Integer supplierId, String dateFrom, String dateTo, String search) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
        LocalDateTime from = dateFrom != null ? LocalDateTime.parse(dateFrom + "T00:00:00", fmt) : null;
        LocalDateTime to   = dateTo   != null ? LocalDateTime.parse(dateTo   + "T23:59:59", fmt) : null;

        List<PurchaseHeader> headers = purchaseRepo.filter(supplierId, from, to, search);

        // Forzar la inicialización de las colecciones y entidades relacionadas
        for (PurchaseHeader h : headers) {
            if (h.getDetails() != null) {
                h.getDetails().size(); // Inicializa la lista de detalles
                h.getDetails().forEach(d -> {
                    if (d.getSupply() != null) {
                        d.getSupply().getName(); // Inicializa el insumo
                        if(d.getSupply().getSupplyCategory() != null) {
                            d.getSupply().getSupplyCategory().getName(); // Inicializa la categoría
                        }
                    }
                    if (d.getSupplier() != null) d.getSupplier().getName(); // Inicializa el proveedor del detalle
                });
            }
            if (h.getChangeLogs() != null) {
                h.getChangeLogs().size(); // Inicializa los logs
            }
        }

        return headers.stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── Obtener una compra ───────────────────────────────────────
    @Transactional(readOnly = true)
    public PurchaseHeaderDTO getById(Integer id) {
        PurchaseHeader p = purchaseRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Compra no encontrada: " + id));

        // Forzar la inicialización para un solo registro
        if (p.getDetails() != null) {
            p.getDetails().size();
            p.getDetails().forEach(d -> {
                if (d.getSupply() != null) {
                    d.getSupply().getName();
                    if(d.getSupply().getSupplyCategory() != null) {
                        d.getSupply().getSupplyCategory().getName();
                    }
                }
                if (d.getSupplier() != null) d.getSupplier().getName();
            });
        }
        if (p.getChangeLogs() != null) p.getChangeLogs().size();

        return toDTO(p);
    }

    // ── Crear compra ─────────────────────────────────────────────
    @Transactional
    public Integer create(CreatePurchaseRequest req) {
        try {
            List<CreatePurchaseRequest.PurchaseItemRequest> itemList =
                    req.getDetails() != null ? req.getDetails() : Collections.emptyList();

            boolean isMulti = isMultiSupplier(itemList);

            int supplierId = (req.getSupplierId() != null && req.getSupplierId() > 0) ? req.getSupplierId() : 0;
            String json          = buildDetailsJson(itemList, isMulti);
            String invoiceNumber = resolveInvoiceNumber(req.getInvoiceNumber());
            int    employeeId    = req.getEmployeeId() != null ? req.getEmployeeId() : 1;
            String payMethod     = req.getPaymentMethod() != null ? req.getPaymentMethod() : "Efectivo";
            double taxRate       = req.getTaxRate() != null ? req.getTaxRate() : 18.0;

            // SOLUCIÓN: Usar queries parametrizados con '?'
            String sql = "{CALL SP_CreatePurchase(?, ?, ?, ?, ?, ?)}";

            // Si tu SP retorna el ID directamente en un SELECT interno:
            Integer newId = jdbc.queryForObject(sql, Integer.class,
                    supplierId, employeeId, payMethod, invoiceNumber, taxRate, json);

            // Fallback limpio usando parámetros (Compatibilidad SQL Server / MySQL adaptada)
            if (newId != null) {
                return newId;
            } else {
                // Nota: Cambiar por "SELECT TOP 1 ..." si usas SQL Server
                return jdbc.queryForObject(
                        "SELECT purchaseHeaderId FROM PurchaseHeader ORDER BY purchaseHeaderId DESC LIMIT 1",
                        Integer.class);
            }

        } catch (Exception e) {
            throw new RuntimeException("Error al crear la compra: " + e.getMessage(), e);
        }
    }

    // ── Editar compra ────────────────────────────────────────────
    @Transactional
    public Integer update(Integer id, CreatePurchaseRequest req) {
        try {
            List<CreatePurchaseRequest.PurchaseItemRequest> itemList =
                    req.getDetails() != null ? req.getDetails() : Collections.emptyList();

            boolean isMulti = isMultiSupplier(itemList);

            int supplierId = (req.getSupplierId() != null && req.getSupplierId() > 0) ? req.getSupplierId() : 0;
            String json          = buildDetailsJson(itemList, isMulti);
            String invoiceNumber = resolveInvoiceNumberForUpdate(id, req.getInvoiceNumber());
            String status        = req.getStatus() != null ? req.getStatus() : "Recibido";
            int    employeeId    = req.getEmployeeId() != null ? req.getEmployeeId() : 1;
            String payMethod     = req.getPaymentMethod() != null ? req.getPaymentMethod() : "Efectivo";
            double taxRate       = req.getTaxRate() != null ? req.getTaxRate() : 18.0;

            // SOLUCIÓN: Parametrizar la actualización
            String sql = "{CALL SP_UpdatePurchase(?, ?, ?, ?, ?, ?, ?, ?)}";
            Integer result = jdbc.queryForObject(sql, Integer.class,
                    id, supplierId, employeeId, payMethod, status, invoiceNumber, taxRate, json);

            return result != null ? result : id;

        } catch (Exception e) {
            throw new RuntimeException("Error al editar la compra: " + e.getMessage(), e);
        }
    }

    // ── Anular compra ────────────────────────────────────────────
    @Transactional
    public void cancel(Integer id, Integer employeeId, String reason) {
        int empId = employeeId != null ? employeeId : 1;
        String safeReason = (reason != null && !reason.isBlank()) ? reason : "Sin motivo especificado";

        // SOLUCIÓN: Evitar concatenación en ejecuciones directas
        String sql = "{CALL SP_CancelPurchase(?, ?, ?)}";
        jdbc.update(sql, id, empId, safeReason);
    }

    // ── Helpers privados ─────────────────────────────────────────

    private boolean isMultiSupplier(List<CreatePurchaseRequest.PurchaseItemRequest> items) {
        return items.stream()
                .anyMatch(i -> i.getSupplierId() != null && i.getSupplierId() > 0);
    }

    private String buildDetailsJson(
            List<CreatePurchaseRequest.PurchaseItemRequest> items,
            boolean includeItemSupplier) {
        try {
            List<Map<String, Object>> list = items.stream()
                    .map(i -> {
                        Map<String, Object> map = new LinkedHashMap<>();
                        map.put("supplyId",  i.getSupplyId());
                        map.put("quantity",  i.getQuantity());
                        map.put("unitPrice", i.getUnitPrice());
                        if (includeItemSupplier && i.getSupplierId() != null && i.getSupplierId() > 0) {
                            map.put("supplierId", i.getSupplierId());
                        }
                        return map;
                    })
                    .collect(Collectors.toList());
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            throw new RuntimeException("Error serializando items: " + e.getMessage(), e);
        }
    }

    private String resolveInvoiceNumber(String provided) {
        if (provided != null && !provided.isBlank()) return provided.trim();
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String rand = String.format("%06d", (int)(Math.random() * 1_000_000));
        return "FAC-" + date + "-" + rand;
    }

    private String resolveInvoiceNumberForUpdate(Integer purchaseHeaderId, String provided) {
        if (provided != null && !provided.isBlank()) return provided.trim();
        try {
            return jdbc.queryForObject(
                    "SELECT invoiceNumber FROM PurchaseHeader WHERE purchaseHeaderId = ?",
                    String.class, purchaseHeaderId);
        } catch (Exception ignored) {}
        return resolveInvoiceNumber(null);
    }

    // ── Mapper Entity → DTO ──────────────────────────────────────
    private PurchaseHeaderDTO toDTO(PurchaseHeader p) {
        PurchaseHeaderDTO dto = new PurchaseHeaderDTO();
        dto.setPurchaseHeaderId(p.getPurchaseHeaderId());
        dto.setPurchaseNumber(p.getPurchaseNumber());
        dto.setPurchaseDate(p.getPurchaseDate() != null ? p.getPurchaseDate().toString() : null);
        dto.setPaymentMethod(p.getPaymentMethod());
        dto.setStatus(p.getStatus());
        dto.setSubtotal(p.getSubtotal());
        dto.setTax(p.getTax());
        dto.setTotal(p.getTotal());
        dto.setTaxRate(p.getTaxRate());
        dto.setInvoiceNumber(p.getInvoiceNumber());
        dto.setNotes(p.getNotes());

        if (p.getSupplier() != null) {
            dto.setSupplierId(p.getSupplier().getSupplierId());
            dto.setSupplierName(p.getSupplier().getName());
        }
        if (p.getEmployee() != null) {
            dto.setEmployeeId(p.getEmployee().getEmployeeId());
            dto.setEmployeeName(p.getEmployee().getFirstName() + " " + p.getEmployee().getLastName());
        }

        if (p.getDetails() != null) {
            dto.setDetails(p.getDetails().stream().map(d -> {
                PurchaseDetailDTO dd = new PurchaseDetailDTO();
                dd.setPurchaseDetailId(d.getPurchaseDetailId());
                dd.setQuantity(d.getQuantity());
                dd.setUnitPrice(d.getUnitPrice());
                dd.setSubtotal(d.getSubtotal());
                if (d.getSupply() != null) {
                    dd.setSupplyId(d.getSupply().getSupplyId());
                    dd.setSupplyName(d.getSupply().getName());
                    dd.setUnitOfMeasure(d.getSupply().getUnitOfMeasure());
                    if (d.getSupply().getSupplyCategory() != null)
                        dd.setSupplyCategory(d.getSupply().getSupplyCategory().getName());
                }
                if (d.getSupplier() != null) {
                    dd.setSupplierId(d.getSupplier().getSupplierId());
                    dd.setSupplierName(d.getSupplier().getName());
                }
                return dd;
            }).collect(Collectors.toList()));
        }

        if (p.getChangeLogs() != null) {
            dto.setChangeLogs(p.getChangeLogs().stream().map(cl -> {
                PurchaseChangeLogDTO ld = new PurchaseChangeLogDTO();
                ld.setLogDate(cl.getLogDate() != null ? cl.getLogDate().toString() : null);
                ld.setAction(cl.getAction());
                ld.setDetail(cl.getDetail());
                if (cl.getEmployee() != null)
                    ld.setEmployeeName(cl.getEmployee().getFirstName() + " " + cl.getEmployee().getLastName());
                return ld;
            }).collect(Collectors.toList()));
        }

        return dto;
    }
}