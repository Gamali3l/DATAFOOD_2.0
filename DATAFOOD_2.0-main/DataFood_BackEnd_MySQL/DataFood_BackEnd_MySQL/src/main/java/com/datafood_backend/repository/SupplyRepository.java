package com.datafood_backend.repository;

import com.datafood_backend.model.Supply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

// FIX #5: estaba pegado al final de SupplyCategoryRepository.java — debe ser su propio archivo
public interface SupplyRepository extends JpaRepository<Supply, Integer> {

    @Query("SELECT s FROM Supply s WHERE " +
            "(:name IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%',:name,'%'))) AND " +
            "(:categoryId IS NULL OR s.supplyCategory.supplyCategoryId = :categoryId)")
    List<Supply> search(@Param("name") String name,
                        @Param("categoryId") Integer categoryId);
}