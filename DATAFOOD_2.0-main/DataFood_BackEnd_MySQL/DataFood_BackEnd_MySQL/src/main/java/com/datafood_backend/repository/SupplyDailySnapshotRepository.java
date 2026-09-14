package com.datafood_backend.repository;

import com.datafood_backend.model.SupplyDailySnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface SupplyDailySnapshotRepository extends JpaRepository<SupplyDailySnapshot, Integer> {

    Optional<SupplyDailySnapshot> findBySupply_SupplyIdAndSnapshotDate(Integer supplyId, LocalDate date);

    // El snapshot más antiguo disponible dentro del rango — es nuestro "stock inicial del período
    Optional<SupplyDailySnapshot> findFirstBySupply_SupplyIdAndSnapshotDateGreaterThanEqualOrderBySnapshotDateAsc(
            Integer supplyId, LocalDate from);
}