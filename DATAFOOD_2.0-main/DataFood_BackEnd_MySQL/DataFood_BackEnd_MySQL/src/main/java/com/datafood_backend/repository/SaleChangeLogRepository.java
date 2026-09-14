package com.datafood_backend.repository;

import com.datafood_backend.model.Salechangelog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SaleChangeLogRepository extends JpaRepository<Salechangelog, Integer> {
    List<Salechangelog> findBySaleHeader_SaleHeaderIdOrderByLogDateDesc(Integer saleHeaderId);
}