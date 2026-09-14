package com.datafood_backend.controller;

import com.datafood_backend.dto.SupplierDTO;
import com.datafood_backend.service.SupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService SupplierService;

    // GET all suppliers
    @GetMapping
    public ResponseEntity<List<SupplierDTO>> getAllSuppliers() {
        return ResponseEntity.ok(SupplierService.getAll());
    }

    // GET supplier by ID
    @GetMapping("/{id}")
    public ResponseEntity<SupplierDTO> getSupplierById(@PathVariable Integer id) {
        return ResponseEntity.ok(SupplierService.getById(id));
    }

    // POST create supplier
    @PostMapping
    public ResponseEntity<SupplierDTO> createSupplier(@RequestBody SupplierDTO supplierDTO) {
        return ResponseEntity.ok(SupplierService.create(supplierDTO));
    }

    // PUT update supplier
    @PutMapping("/{id}")
    public ResponseEntity<SupplierDTO> updateSupplier(@PathVariable Integer id,
                                                      @RequestBody SupplierDTO supplierDTO) {
        return ResponseEntity.ok(SupplierService.update(id, supplierDTO));
    }

    // PATCH toggle status activo/inactivo
    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<Void> toggleStatus(@PathVariable Integer id) {
        SupplierService.toggleStatus(id);
        return ResponseEntity.ok().build();
    }
}