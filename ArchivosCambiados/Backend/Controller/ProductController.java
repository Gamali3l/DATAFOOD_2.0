package com.datafood_backend.controller;

import com.datafood_backend.dto.ProductDTO;
import com.datafood_backend.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService service;

    @GetMapping
    public ResponseEntity<List<ProductDTO>> getAll(
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String  search,
            @RequestParam(required = false) Boolean sortAZ) {

        return ResponseEntity.ok(service.getAll(categoryId, status, search, sortAZ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<ProductDTO> create(@RequestBody ProductDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductDTO> update(@PathVariable Integer id,
                                             @RequestBody ProductDTO dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<?> toggleStatus(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(service.toggleStatus(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(409).body(java.util.Map.of("message", e.getMessage()));
        }
    }

    // ⚠️ Solo para pruebas — bórralo o coméntalo antes de entregar
    @PostMapping("/dev/deactivate-all-now")
    public ResponseEntity<String> deactivateAllNow() {
        service.deactivateAllProductsDaily();
        return ResponseEntity.ok("Todos los productos desactivados.");
    }

    @PostMapping("/{id}/image")
    public ResponseEntity<?> uploadImage(
            @PathVariable Integer id,
            @RequestParam("image") MultipartFile file) throws IOException {

        String filename = "product_" + id + "_" + file.getOriginalFilename();
        Path uploadDir = Paths.get("uploads/products");
        Files.createDirectories(uploadDir);
        Files.copy(file.getInputStream(),
                uploadDir.resolve(filename),
                StandardCopyOption.REPLACE_EXISTING);

        service.updateImageUrl(id, "/uploads/products/" + filename);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        try {
            service.delete(id);
            return ResponseEntity.noContent().build();
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(409).body(
                    Map.of("message", "No se puede eliminar: este platillo ya tiene ventas o receta registrada. Desactívalo en su lugar (usa el interruptor Activo/Inactivo).")
            );
        }
    }
}