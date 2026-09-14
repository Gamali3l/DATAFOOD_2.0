package com.datafood_backend.controller;

import com.datafood_backend.dto.SupplyCategoryDTO;       // FIX #3
import com.datafood_backend.service.SupplyCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/supply-categories")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class SupplyCategoryController {

    private final SupplyCategoryService service;

    @GetMapping
    public ResponseEntity<List<SupplyCategoryDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostMapping
    public ResponseEntity<SupplyCategoryDTO> create(@RequestBody SupplyCategoryDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SupplyCategoryDTO> update(@PathVariable Integer id,
                                                    @RequestBody SupplyCategoryDTO dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.delete(id);
        return ResponseEntity.ok().build();
    }
}