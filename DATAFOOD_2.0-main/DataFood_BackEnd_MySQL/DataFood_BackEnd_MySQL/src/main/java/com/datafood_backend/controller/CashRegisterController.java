package com.datafood_backend.controller;

import com.datafood_backend.dto.CashRegisterDTO;
import com.datafood_backend.dto.CashRegisterRequest;
import com.datafood_backend.dto.CashRegisterSummaryDTO;
import com.datafood_backend.service.CashRegisterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cashregister")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class CashRegisterController {

    private final CashRegisterService service;

    /**
     * GET /api/cashregister/active?employeeId=1
     * Devuelve la caja abierta de UN empleado específico.
     */
    @GetMapping("/active")
    public ResponseEntity<CashRegisterDTO> getActive(
            @RequestParam Integer employeeId) {
        CashRegisterDTO dto = service.getActive(employeeId);
        return dto != null
                ? ResponseEntity.ok(dto)
                : ResponseEntity.noContent().build();
    }

    /**
     * GET /api/cashregister/active-any
     * Devuelve la caja abierta global (de cualquier empleado).
     * El frontend la usa para saber si se puede abrir/cerrar caja.
     * Respuesta incluye: cashRegisterId, employeeId, employeeName.
     */
    @GetMapping("/active-any")
    public ResponseEntity<CashRegisterDTO> getAnyActive() {
        CashRegisterDTO dto = service.getAnyActive();
        return dto != null
                ? ResponseEntity.ok(dto)
                : ResponseEntity.noContent().build();
    }

    /**
     * POST /api/cashregister/open
     * Body: { employeeId, openingAmount, note }
     * El SP valida que no exista ninguna caja abierta.
     */
    @PostMapping("/open")
    public ResponseEntity<?> open(@RequestBody CashRegisterRequest req) {
        try {
            return ResponseEntity.ok(service.open(req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * GET /api/cashregister/summary/{cashRegisterId}
     * Devuelve el resumen de ventas del turno: ventas en efectivo,
     * total ventas, domicilios y efectivo esperado en caja.
     */
    @GetMapping("/summary/{cashRegisterId}")
    public ResponseEntity<?> getSummary(@PathVariable Integer cashRegisterId) {
        try {
            CashRegisterSummaryDTO dto = service.getSummary(cashRegisterId);
            return dto != null
                    ? ResponseEntity.ok(dto)
                    : ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * POST /api/cashregister/close
     * Body: { cashRegisterId, employeeId, closingAmount, note }
     * Valida que el empleado que cierra sea el mismo que la abrió.
     */
    @PostMapping("/close")
    public ResponseEntity<?> close(@RequestBody CashRegisterRequest req) {
        try {
            return ResponseEntity.ok(service.close(req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/report")
    public ResponseEntity<?> getReport() {
        try {
            return ResponseEntity.ok(service.getReport());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}