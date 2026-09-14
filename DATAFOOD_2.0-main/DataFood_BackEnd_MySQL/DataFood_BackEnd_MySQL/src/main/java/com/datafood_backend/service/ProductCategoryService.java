package com.datafood_backend.service;

import com.datafood_backend.dto.ProductCategoryDTO;
import com.datafood_backend.model.ProductCategory;
import com.datafood_backend.repository.ProductCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductCategoryService {

    private final ProductCategoryRepository repo;

    public List<ProductCategoryDTO> getAll() {
        return repo.findAll()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public ProductCategoryDTO getById(Integer id) {
        return toDTO(findOrThrow(id));
    }

    public ProductCategoryDTO create(ProductCategoryDTO dto) {
        if (repo.existsByNameIgnoreCase(dto.getName().trim())) {
            throw new RuntimeException("Ya existe una categoría con el nombre: " + dto.getName());
        }
        ProductCategory cat = new ProductCategory();
        cat.setName(dto.getName().trim());
        return toDTO(repo.save(cat));
    }

    public ProductCategoryDTO update(Integer id, ProductCategoryDTO dto) {
        ProductCategory cat = findOrThrow(id);

        // Verificar duplicado excluyendo la categoría actual
        repo.findByNameIgnoreCase(dto.getName().trim())
                .filter(found -> !found.getProductCategoryId().equals(id))
                .ifPresent(found -> {
                    throw new RuntimeException("Ya existe una categoría con el nombre: " + dto.getName());
                });

        cat.setName(dto.getName().trim());
        return toDTO(repo.save(cat));
    }

    public void delete(Integer id) {
        findOrThrow(id);
        repo.deleteById(id);
    }

    // ── helpers ──────────────────────────────────────────────

    private ProductCategory findOrThrow(Integer id) {
        return repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada: " + id));
    }

    private ProductCategoryDTO toDTO(ProductCategory c) {
        ProductCategoryDTO dto = new ProductCategoryDTO();
        dto.setProductCategoryId(c.getProductCategoryId());
        dto.setName(c.getName());
        return dto;
    }
}
