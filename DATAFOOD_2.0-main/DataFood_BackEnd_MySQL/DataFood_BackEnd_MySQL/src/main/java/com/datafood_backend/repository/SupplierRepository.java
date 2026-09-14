package com.datafood_backend.repository;

import com.datafood_backend.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierRepository
        extends JpaRepository<Supplier, Integer> {
}