package com.datafood_backend.service;

import com.datafood_backend.dto.SupplyCategoryDTO;
import com.datafood_backend.model.SupplyCategory;
import com.datafood_backend.repository.SupplyCategoryRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SupplyCategoryService {

    private final SupplyCategoryRepository repo;

    public List<SupplyCategoryDTO> getAll() {

        return repo.findAll()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public SupplyCategoryDTO create(SupplyCategoryDTO dto) {

        SupplyCategory cat = new SupplyCategory();

        cat.setName(dto.getName());

        return toDTO(
                repo.save(cat)
        );
    }

    public SupplyCategoryDTO update(
            Integer id,
            SupplyCategoryDTO dto
    ) {

        SupplyCategory cat = repo.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Categoría no encontrada: " + id
                        )
                );

        cat.setName(dto.getName());

        return toDTO(
                repo.save(cat)
        );
    }

    public void delete(Integer id) {

        repo.deleteById(id);
    }

    private SupplyCategoryDTO toDTO(
            SupplyCategory c
    ) {

        SupplyCategoryDTO dto =
                new SupplyCategoryDTO();

        dto.setSupplyCategoryId(
                c.getSupplyCategoryId()
        );

        dto.setName(
                c.getName()
        );

        return dto;
    }
}