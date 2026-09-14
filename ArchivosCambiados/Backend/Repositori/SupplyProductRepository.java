package com.datafood_backend.repository;

import com.datafood_backend.model.SupplyProduct;
import com.datafood_backend.model.SupplyProductId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupplyProductRepository extends JpaRepository<SupplyProduct, SupplyProductId> {
    List<SupplyProduct> findByProduct_ProductId(Integer productId);
    void deleteByProduct_ProductId(Integer productId);
}