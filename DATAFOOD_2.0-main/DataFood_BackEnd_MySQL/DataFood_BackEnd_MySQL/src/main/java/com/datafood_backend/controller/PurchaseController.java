package com.datafood_backend.controller;

import com.datafood_backend.dto.CreatePurchaseRequest;
import com.datafood_backend.dto.PurchaseHeaderDTO;
import com.datafood_backend.service.PurchaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchases")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseService service;

    @GetMapping
    public ResponseEntity<List<PurchaseHeaderDTO>> filter(
            @RequestParam(required = false) Integer supplierId,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(service.filter(supplierId, dateFrom, dateTo, search));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseHeaderDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<Map<String, Integer>> create(@RequestBody CreatePurchaseRequest req) {
        Integer id = service.create(req);
        return ResponseEntity.ok(Map.of("purchaseHeaderId", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Integer>> update(@PathVariable Integer id,
                                                       @RequestBody CreatePurchaseRequest req) {
        Integer result = service.update(id, req);
        return ResponseEntity.ok(Map.of("purchaseHeaderId", result));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body,
            @RequestParam(required = false) Integer employeeId) {

        String reason = (body != null && body.get("reason") != null && !body.get("reason").isBlank())
                ? body.get("reason")
                : "Sin motivo especificado";

        service.cancel(id, employeeId, reason);
        return ResponseEntity.ok().build();
    }
}