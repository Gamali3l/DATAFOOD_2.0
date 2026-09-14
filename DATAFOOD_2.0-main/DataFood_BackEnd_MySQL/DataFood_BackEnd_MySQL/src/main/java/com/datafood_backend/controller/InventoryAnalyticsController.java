package com.datafood_backend.controller;

import com.datafood_backend.dto.InventoryAnalyticsDTO;
import com.datafood_backend.service.InventoryAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory-analytics")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class InventoryAnalyticsController {

    private final InventoryAnalyticsService service;

    @GetMapping
    public ResponseEntity<List<InventoryAnalyticsDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<InventoryAnalyticsDTO>> getLowStock() {
        return ResponseEntity.ok(service.getLowStock());
    }

    @GetMapping("/suggested-purchases")
    public ResponseEntity<List<InventoryAnalyticsDTO>> getSuggestedPurchases() {
        return ResponseEntity.ok(service.getSuggestedPurchases());
    }

    // ⚠️ Solo para pruebas mientras desarrollas — bórralo o coméntalo antes de entregar
    @PostMapping("/dev/generate-snapshot-now")
    public ResponseEntity<String> generateSnapshotNow() {
        service.generateSnapshotNow();
        return ResponseEntity.ok("Snapshot generado para hoy.");
    }
}