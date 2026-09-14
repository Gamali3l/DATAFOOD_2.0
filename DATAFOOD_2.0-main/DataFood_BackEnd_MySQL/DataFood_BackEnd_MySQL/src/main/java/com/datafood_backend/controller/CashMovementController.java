package com.datafood_backend.controller;

import com.datafood_backend.dto.CashBalanceDTO;
import com.datafood_backend.dto.CashMovementDTO;
import com.datafood_backend.dto.CashMovementRequest;
import com.datafood_backend.service.CashMovementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cashregister/movement")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class CashMovementController {

    private final CashMovementService service;

    /**
     * GET /api/cashregister/movement/balance
     * Saldo acumulado total: cierres + ventas activas + movimientos.
     */
    @GetMapping("/balance")
    public ResponseEntity<?> getBalance() {
        try {
            return ResponseEntity.ok(service.getBalance());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * GET /api/cashregister/movement
     * Historial de los últimos 50 movimientos.
     */
    @GetMapping
    public ResponseEntity<List<CashMovementDTO>> getMovements() {
        return ResponseEntity.ok(service.getMovements());
    }

    /**
     * POST /api/cashregister/movement
     * Body: { cashRegisterId, employeeId, movementType, amount, reason, note }
     * Solo admins deben llamar este endpoint (validación en frontend por rol).
     */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CashMovementRequest req) {
        try {
            Integer id = service.create(req);
            return ResponseEntity.ok(id);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}