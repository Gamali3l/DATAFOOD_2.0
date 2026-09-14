package com.datafood_backend.repository;

import com.datafood_backend.model.SupplyCategory;
import org.springframework.data.jpa.repository.JpaRepository;

// FIX #5: archivo limpio, solo contiene SupplyCategoryRepository
public interface SupplyCategoryRepository extends JpaRepository<SupplyCategory, Integer> {
}