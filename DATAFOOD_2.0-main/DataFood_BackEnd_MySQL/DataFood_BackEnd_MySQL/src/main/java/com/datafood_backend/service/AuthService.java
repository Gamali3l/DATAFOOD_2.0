package com.datafood_backend.service;

import com.datafood_backend.dto.LoginRequest;
import com.datafood_backend.dto.LoginResponse;
import com.datafood_backend.model.Employee;
import com.datafood_backend.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final EmployeeRepository employeeRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    public LoginResponse login(LoginRequest req) {
        // Buscar empleado por email
        Employee employee = employeeRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new RuntimeException("Credenciales inválidas o sin acceso al sistema."));

        // Verificar que esté activo
        if (employee.getStatus() == null || employee.getStatus().intValue() != 1) {
            throw new RuntimeException("Credenciales inválidas o sin acceso al sistema.");
        }

        // Verificar contraseña con BCrypt
        if (!passwordEncoder.matches(req.getPassword(), employee.getPassword())) {
            throw new RuntimeException("Credenciales inválidas o sin acceso al sistema.");
        }

        LoginResponse res = new LoginResponse();
        res.setEmployeeId(employee.getEmployeeId());
        res.setFirstName(employee.getFirstName());
        res.setLastName(employee.getLastName());
        res.setEmail(employee.getEmail());
        res.setRole(employee.getPosition().getPositionName());
        return res;
    }
/*
    public void forgotPassword(String email) {
        employeeRepository.findByEmail(email).ifPresent(employee -> {
            String code = String.format("%06d", new java.util.Random().nextInt(1000000));
            employee.setResetToken(code);
            employee.setResetTokenExpiry(LocalDateTime.now().plusMinutes(15));
            employeeRepository.save(employee);

            try {
                emailService.sendPasswordResetEmail(
                        employee.getEmail(),
                        employee.getFirstName(),
                        code
                );
                System.out.println("✅ Correo enviado a: " + employee.getEmail() + " | Código: " + code);
            } catch (Exception e) {
                System.out.println("❌ Error enviando correo: " + e.getMessage());
            }
        });
    }*/


    public void forgotPassword(String email) {
        employeeRepository.findByEmail(email).ifPresent(employee -> {
            // Cambia esta línea:
            // String token = UUID.randomUUID().toString();
            // Por esta:
            String code = String.format("%06d", new java.util.Random().nextInt(1000000));

            employee.setResetToken(code);
            employee.setResetTokenExpiry(LocalDateTime.now().plusMinutes(15));
            employeeRepository.save(employee);

            emailService.sendPasswordResetEmail(
                    employee.getEmail(),
                    employee.getFirstName(),
                    code
            );
        });
    }

    public void resetPassword(String token, String newPassword) {
        Employee employee = employeeRepository
                .findByResetTokenAndResetTokenExpiryAfter(token, LocalDateTime.now())
                .orElseThrow(() -> new RuntimeException("Token inválido o expirado."));

        employee.setPassword(passwordEncoder.encode(newPassword));
        employee.setResetToken(null);
        employee.setResetTokenExpiry(null);
        employeeRepository.save(employee);
    }
}