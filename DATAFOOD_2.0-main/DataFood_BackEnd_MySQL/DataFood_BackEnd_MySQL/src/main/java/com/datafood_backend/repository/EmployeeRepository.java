package com.datafood_backend.repository;

import com.datafood_backend.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Integer> {

    // Para forgot-password
    Optional<Employee> findByEmail(String email);

    // Para reset-password (valida token no expirado)
    Optional<Employee> findByResetTokenAndResetTokenExpiryAfter(
            String resetToken,
            LocalDateTime now
    );
}