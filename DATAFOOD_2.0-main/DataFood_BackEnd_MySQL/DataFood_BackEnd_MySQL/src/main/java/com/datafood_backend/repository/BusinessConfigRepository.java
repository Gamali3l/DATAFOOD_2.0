package com.datafood_backend.repository;

import com.datafood_backend.model.BusinessConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BusinessConfigRepository extends JpaRepository<BusinessConfig, Long> {}