package com.datafood_backend.repository;

import com.datafood_backend.model.PurchaseHeader;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PurchaseHeaderRepository extends JpaRepository<PurchaseHeader, Integer> {
    @Query("""
SELECT p
FROM PurchaseHeader p
WHERE
(:supplierId IS NULL OR p.supplier.supplierId = :supplierId)
AND (:dateFrom IS NULL OR p.purchaseDate >= :dateFrom)
AND (:dateTo IS NULL OR p.purchaseDate <= :dateTo)
AND (
    :search IS NULL
    OR LOWER(p.purchaseNumber) LIKE LOWER(CONCAT('%',:search,'%'))
    OR LOWER(p.supplier.name) LIKE LOWER(CONCAT('%',:search,'%'))
)
ORDER BY p.purchaseDate DESC
""")
    List<PurchaseHeader> filter(
            @Param("supplierId") Integer supplierId,
            @Param("dateFrom")   LocalDateTime dateFrom,
            @Param("dateTo")     LocalDateTime dateTo,
            @Param("search")     String search
    );
}