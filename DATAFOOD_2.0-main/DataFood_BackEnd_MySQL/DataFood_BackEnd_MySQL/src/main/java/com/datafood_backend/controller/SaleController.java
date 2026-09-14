package com.datafood_backend.controller;

import com.datafood_backend.dto.CreateSaleRequest;
import com.datafood_backend.dto.Salechangelogdto;
import com.datafood_backend.dto.Saleheaderdto;
import com.datafood_backend.dto.Updatesalerequest;
import com.datafood_backend.service.SalesService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sales")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class SaleController {

    private final SalesService service;

    /** Historial de ventas (con filtros opcionales) */
    @GetMapping
    public ResponseEntity<List<Saleheaderdto>> filter(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String saleType) {
        return ResponseEntity.ok(service.filter(dateFrom, dateTo, search, saleType));
    }

    /** Detalle de una venta */
    @GetMapping("/{id}")
    public ResponseEntity<Saleheaderdto> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(service.getById(id));
    }

    /** Historial de cambios de una venta */
    @GetMapping("/{id}/logs")
    public ResponseEntity<List<Salechangelogdto>> getLogs(@PathVariable Integer id) {
        return ResponseEntity.ok(service.getLogs(id));
    }

    /** Crear venta */
    @PostMapping
    public ResponseEntity<Map<String, Integer>> create(@RequestBody CreateSaleRequest req) {
        Integer id = service.create(req);
        return ResponseEntity.ok(Map.of("saleHeaderId", id));
    }

    /** Editar cabecera de venta (cliente, dirección, N° factura) */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Integer>> update(
            @PathVariable Integer id,
            @RequestBody Updatesalerequest req) {
        Integer result = service.update(id, req);
        return ResponseEntity.ok(Map.of("saleHeaderId", result));
    }

    /** Anular venta */

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(
            @PathVariable Integer id,
            @RequestParam(required = false) Integer employeeId,
            @RequestBody(required = false) Map<String, String> body) {   // ← NUEVO

        String reason = (body != null) ? body.get("reason") : null;
        service.cancel(id, employeeId, reason);                          // ← pasa reason
        return ResponseEntity.ok().build();
    }
}