package com.datafood_backend.repository;

import com.datafood_backend.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {

    // ── Por categoría ──
    List<Product> findByProductCategory_ProductCategoryId(Integer categoryId);

    // ── Por estado (0 o 1) ──
    List<Product> findByStatus(Integer status);

    // ── Búsqueda parcial por nombre ──
    List<Product> findByNameContainingIgnoreCase(String name);

    // ── Categoría + nombre ──
    List<Product> findByProductCategory_ProductCategoryIdAndNameContainingIgnoreCase(
            Integer categoryId, String name);

    // ── Estado + nombre ──
    List<Product> findByStatusAndNameContainingIgnoreCase(Integer status, String name);

    // ── Categoría + estado + nombre ──
    List<Product> findByProductCategory_ProductCategoryIdAndStatusAndNameContainingIgnoreCase(
            Integer categoryId, Integer status, String name);

    // ── Todos ordenados A-Z ──
    @Query("SELECT p FROM Product p ORDER BY p.name ASC")
    List<Product> findAllOrderByNameAZ();

    // ── Por categoría ordenados A-Z ──
    @Query("SELECT p FROM Product p WHERE p.productCategory.productCategoryId = :catId ORDER BY p.name ASC")
    List<Product> findByCategoryOrderByNameAZ(@Param("catId") Integer catId);
}
