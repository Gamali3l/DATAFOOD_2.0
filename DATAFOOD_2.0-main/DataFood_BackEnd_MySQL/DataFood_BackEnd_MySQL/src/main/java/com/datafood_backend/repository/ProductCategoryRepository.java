package com.datafood_backend.repository;

import com.datafood_backend.model.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Integer> {
    Optional<ProductCategory> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
}
