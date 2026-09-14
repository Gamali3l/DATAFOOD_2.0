package com.datafood_backend.repository;

import com.datafood_backend.model.SaleHeader;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SaleHeaderRepository extends JpaRepository<SaleHeader, Integer> {
    // Aquí puedes agregar métodos de búsqueda personalizados si los necesitas después
}