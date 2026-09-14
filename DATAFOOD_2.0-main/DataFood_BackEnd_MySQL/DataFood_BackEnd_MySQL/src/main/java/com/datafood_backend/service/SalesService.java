package com.datafood_backend.service;

import com.datafood_backend.dto.*;
import com.datafood_backend.model.Salechangelog;
import com.datafood_backend.model.SaleHeader;
import com.datafood_backend.repository.SaleChangeLogRepository;
import com.datafood_backend.repository.SaleHeaderRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SalesService {

    private final JdbcTemplate           jdbc;
    private final ObjectMapper            objectMapper;
    private final SaleHeaderRepository    saleRepo;
    private final SaleChangeLogRepository logRepo;

    // ── Listar / filtrar ────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<Saleheaderdto> filter(String dateFrom, String dateTo, String search, String saleType) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
        LocalDateTime from = dateFrom != null ? LocalDateTime.parse(dateFrom + "T00:00:00", fmt) : null;
        LocalDateTime to   = dateTo   != null ? LocalDateTime.parse(dateTo   + "T23:59:59", fmt) : null;

        List<SaleHeader> headers = saleRepo.findAll()
                .stream()
                .filter(s -> {
                    boolean matchDate = true;
                    if (from != null) matchDate = !s.getSaleDate().isBefore(from);
                    if (to   != null) matchDate = matchDate && !s.getSaleDate().isAfter(to);

                    boolean matchSearch = search == null || search.isBlank()
                            || contains(s.getSaleNumber(),    search)
                            || contains(s.getClientName(),    search)
                            || contains(s.getInvoiceNumber(), search);

                    boolean matchType = saleType == null || saleType.isBlank()
                            || saleType.equalsIgnoreCase(s.getSaleType());

                    return matchDate && matchSearch && matchType;
                })
                .sorted((a, b) -> b.getSaleDate().compareTo(a.getSaleDate()))
                .collect(Collectors.toList());

        // Forzar la inicialización de las colecciones proxy de Hibernate
        for (SaleHeader s : headers) {
            if (s.getDetails() != null) {
                s.getDetails().size(); // Inicializa la lista de detalles
                s.getDetails().forEach(d -> {
                    if (d.getProduct() != null) {
                        d.getProduct().getName(); // Inicializa el producto
                        if (d.getProduct().getProductCategory() != null) {
                            d.getProduct().getProductCategory().getName(); // Inicializa la categoría
                        }
                    }
                });
            }
        }

        return headers.stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── Obtener por ID ──────────────────────────────────────────
    @Transactional(readOnly = true)
    public Saleheaderdto getById(Integer id) {
        SaleHeader s = saleRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada: " + id));

        // Forzar la inicialización para un solo registro
        if (s.getDetails() != null) {
            s.getDetails().size();
            s.getDetails().forEach(d -> {
                if (d.getProduct() != null) {
                    d.getProduct().getName();
                    if (d.getProduct().getProductCategory() != null) {
                        d.getProduct().getProductCategory().getName();
                    }
                }
            });
        }

        return toDTO(s);
    }

    // ── Historial de cambios ────────────────────────────────────
    public List<Salechangelogdto> getLogs(Integer saleId) {
        return logRepo.findBySaleHeader_SaleHeaderIdOrderByLogDateDesc(saleId)
                .stream()
                .map(l -> {
                    Salechangelogdto dto = new Salechangelogdto();
                    dto.setLogId(l.getLogId());
                    dto.setLogDate(l.getLogDate() != null ? l.getLogDate().toString() : null);
                    dto.setAction(l.getAction());
                    dto.setDetail(l.getDetail());
                    if (l.getEmployee() != null) {
                        dto.setEmployeeId(l.getEmployee().getEmployeeId());
                        dto.setEmployeeName(l.getEmployee().getFirstName() + " " + l.getEmployee().getLastName());
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    // ── Crear venta ─────────────────────────────────────────────
    @Transactional
    public Integer create(CreateSaleRequest req) {
        try {
            String detailsJson = buildCreateDetailsJson(req.getDetails());

            String sql = "CALL SP_CreateSale("
                    + "'" + escapeSql(req.getClientName()) + "', "
                    + "'"      + escapeSql(req.getAddress())    + "', "
                    + ""    + (req.getDeliveryFee() != null ? req.getDeliveryFee() : 0.0) + ", "
                    + ""     + (Boolean.TRUE.equals(req.getIsDelivery()) ? 1 : 0) + ", "
                    + ""     + (req.getEmployeeId() != null ? req.getEmployeeId() : 1) + ", "
                    + "'"  + escapeSql(detailsJson) + "')";

            Integer newId = jdbc.queryForObject(sql, Integer.class);

            // Log manual de creación (el SP puede no escribirlo aún)
            if (newId != null) writeLog(newId, req.getEmployeeId(), "Creó la venta",
                    "Venta registrada con " + (req.getDetails() != null ? req.getDetails().size() : 0) + " producto(s).");

            return newId;
        } catch (Exception e) {
            throw new RuntimeException("Error al procesar la venta: " + e.getMessage());
        }
    }

    // ── Editar venta ────────────────────────────────────────────
    @Transactional
    public Integer update(Integer id, Updatesalerequest req) {
        try {
            String detailsJson = (req.getDetails() != null && !req.getDetails().isEmpty())
                    ? buildUpdateDetailsJson(req.getDetails())
                    : null;

            // Traemos la venta actual para no pisar campos que no se editan
            SaleHeader current = saleRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Venta no encontrada: " + id));

            // Usamos el invoiceNumber ACTUAL si el request no lo manda
            String invoiceNumber = (req.getInvoiceNumber() != null && !req.getInvoiceNumber().isBlank())
                    ? req.getInvoiceNumber()
                    : current.getInvoiceNumber();

            // Usamos customerName y address actuales si no se mandan
            String customerName = (req.getCustomerName() != null)
                    ? req.getCustomerName()
                    : (current.getClientName() != null ? current.getClientName() : "");

            String address = (req.getAddress() != null)
                    ? req.getAddress()
                    : (current.getAddress() != null ? current.getAddress() : "");

            String sql = "CALL SP_UpdateSale("
                    + "" + id + ", "
                    + ""     + (req.getEmployeeId() != null ? req.getEmployeeId() : 1) + ", "
                    + "'" + escapeSql(customerName)   + "', "
                    + "'"      + escapeSql(address)         + "', "
                    + "'"+ escapeSql(invoiceNumber)   + "'"
                    + (detailsJson != null ? ", '" + escapeSql(detailsJson) + "'" : "") + ")";

            jdbc.execute(sql);

            writeLog(id, req.getEmployeeId(), "Editó la venta",
                    "Se actualizaron datos de la venta. Factura: " + invoiceNumber
                            + ". Cliente: " + customerName + ".");

            return id;
        } catch (Exception e) {
            throw new RuntimeException("Error al editar la venta: " + e.getMessage());
        }
    }

    // ── Anular venta ────────────────────────────────────────────
    @Transactional
    public void cancel(Integer id, Integer employeeId, String reason) {   // ← añade reason
        int empId = employeeId != null ? employeeId : 1;
        jdbc.execute("CALL SP_CancelSale(" + id + ", " + empId + ")");

        // Usar el motivo que envió el usuario, o un texto por defecto
        String detail = (reason != null && !reason.isBlank())
                ? "Motivo: " + reason
                : "La venta fue anulada.";

        writeLog(id, empId, "Anuló la venta", detail);
    }
    // ── Mapper Entity → DTO ─────────────────────────────────────
    private Saleheaderdto toDTO(SaleHeader s) {
        Saleheaderdto dto = new Saleheaderdto();
        dto.setSaleHeaderId(s.getSaleHeaderId());
        dto.setSaleNumber(s.getSaleNumber());
        dto.setSaleDate(s.getSaleDate() != null ? s.getSaleDate().toString() : null);
        dto.setSaleType(s.getSaleType());
        dto.setClientName(s.getClientName());
        dto.setAddress(s.getAddress());
        dto.setDeliveryFee(s.getDeliveryFee());
        dto.setInvoiceNumber(s.getInvoiceNumber());
        dto.setStatus(s.getStatus());
        dto.setTotal(s.getTotal());

        if (s.getTotal() != null && s.getDeliveryFee() != null) {
            dto.setSubtotal(s.getTotal().subtract(s.getDeliveryFee()));
        } else {
            dto.setSubtotal(s.getTotal());
        }

        if (s.getEmployee() != null) {
            dto.setEmployeeId(s.getEmployee().getEmployeeId());
            dto.setEmployeeName(s.getEmployee().getFirstName() + " " + s.getEmployee().getLastName());
        }

        if (s.getDetails() != null) {
            dto.setDetails(s.getDetails().stream().map(d -> {
                Saledetaildto dd = new Saledetaildto();
                dd.setSaleDetailId(d.getSaleDetailId());
                dd.setQuantity(d.getQuantity());
                dd.setUnitPrice(d.getUnitPrice());
                dd.setSubtotal(d.getSubtotal());
                if (d.getProduct() != null) {
                    dd.setProductId(d.getProduct().getProductId());
                    dd.setProductName(d.getProduct().getName());
                    if (d.getProduct().getProductCategory() != null)
                        dd.setCategoryName(d.getProduct().getProductCategory().getName());
                }
                return dd;
            }).collect(Collectors.toList()));
        }

        return dto;
    }

    // ── Helpers ─────────────────────────────────────────────────
    private void writeLog(Integer saleId, Integer employeeId, String action, String detail) {
        try {
            SaleHeader sh = new SaleHeader();
            sh.setSaleHeaderId(saleId);
            com.datafood_backend.model.Employee emp = new com.datafood_backend.model.Employee();
            emp.setEmployeeId(employeeId != null ? employeeId : 1);
            Salechangelog log = new Salechangelog();
            log.setSaleHeader(sh);
            log.setEmployee(emp);
            log.setAction(action);
            log.setDetail(detail);
            log.setLogDate(LocalDateTime.now());
            logRepo.save(log);
        } catch (Exception ignored) {
            // El log no debe romper la operación principal
        }
    }

    private boolean contains(String field, String search) {
        return field != null && field.toLowerCase().contains(search.toLowerCase());
    }

    private String buildCreateDetailsJson(List<CreateSaleRequest.SaleItemRequest> items) {
        if (items == null || items.isEmpty()) return "[]";
        try { return objectMapper.writeValueAsString(items); } catch (Exception e) { return "[]"; }
    }

    private String buildUpdateDetailsJson(List<Updatesalerequest.SaleItemRequest> items) {
        try {
            List<Map<String, Object>> list = items.stream()
                    .map(i -> Map.<String, Object>of(
                            "productId", i.getProductId(),
                            "quantity",  i.getQuantity(),
                            "unitPrice", i.getUnitPrice()))
                    .collect(Collectors.toList());
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            throw new RuntimeException("Error serializando detalles: " + e.getMessage());
        }
    }

    private String escapeSql(String s) {
        if (s == null) return "";
        return s.replace("'", "''");
    }
}