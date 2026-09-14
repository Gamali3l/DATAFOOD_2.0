package com.datafood_backend.service;

import com.datafood_backend.dto.EmployeeDTO;
import com.datafood_backend.model.Employee;
import com.datafood_backend.model.Position;
import com.datafood_backend.repository.EmployeeRepository;
import com.datafood_backend.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final PositionRepository positionRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    public List<EmployeeDTO> getAll() {
        return employeeRepository.findAll()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public EmployeeDTO create(EmployeeDTO dto) {
        validateEmployeeData(dto);

        Position position = positionRepository.findByPositionName(dto.getRole().trim())
                .orElseThrow(() -> new RuntimeException("El cargo '" + dto.getRole() + "' no existe en la BD."));

        // Generar contraseña temporal aleatoria
        String tempPassword = generateTempPassword();

        Employee employee = new Employee();
        employee.setFirstName(dto.getName().trim());
        employee.setLastName(dto.getLastName().trim());
        employee.setNationalId(dto.getDni().trim());
        employee.setEmail(dto.getEmail().trim());
        employee.setPhone(dto.getPhone().trim());
        employee.setSalary(dto.getSalary());
        employee.setPosition(position);
        employee.setStatus((byte) 1);
        employee.setHireDate(dto.getHireDate() != null ? dto.getHireDate() : LocalDate.now());
        employee.setPassword(passwordEncoder.encode(tempPassword));

        Employee saved = employeeRepository.save(employee);



        // Enviar correo con la contraseña en texto plano
        emailService.sendWelcomeEmail(saved.getEmail(), saved.getFirstName(), tempPassword);

        return toDTO(saved);
    }

    @Transactional
    public EmployeeDTO update(Integer id, EmployeeDTO dto) {
        System.out.println("DNI recibido: " + dto.getDni());
        validateEmployeeData(dto);

        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado."));

        Position position = positionRepository.findByPositionName(dto.getRole().trim())
                .orElseThrow(() -> new RuntimeException("El cargo '" + dto.getRole() + "' no existe en la BD."));

        employee.setFirstName(dto.getName().trim());
        employee.setLastName(dto.getLastName().trim());
        employee.setPhone(dto.getPhone().trim());
        employee.setSalary(dto.getSalary());
        employee.setPosition(position);
        employee.setNationalId(dto.getDni().trim()); // ← ya sabemos que no es null
        employee.setHireDate(dto.getHireDate() != null ? dto.getHireDate() : employee.getHireDate());

        return toDTO(employeeRepository.save(employee));
    }

    @Transactional
    public void toggleStatus(Integer id) {
        toggleStatus(id, null);
    }

    @Transactional
    public void toggleStatus(Integer id, String reason) {
        Employee emp = employeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empleado no encontrado"));

        if (emp.getStatus() == 1) {
            emp.setStatus((byte) 0);
            emp.setInactiveDate(LocalDateTime.now());
            emp.setInactiveReason(reason);
        } else {
            emp.setStatus((byte) 1);
            emp.setReactivationDate(LocalDateTime.now());
            emp.setInactiveReason(null);
        }

        employeeRepository.save(emp);
    }

    private String generateTempPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    private void validateEmployeeData(EmployeeDTO dto) {
        if (dto.getName() == null || !dto.getName().matches("^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$")) {
            throw new RuntimeException("El nombre es obligatorio y solo debe contener letras.");
        }
        if (dto.getLastName() == null || !dto.getLastName().matches("^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$")) {
            throw new RuntimeException("El apellido es obligatorio y solo debe contener letras.");
        }
        if (dto.getPhone() == null || !dto.getPhone().matches("^\\d{4}-?\\d{4}$")) {
            throw new RuntimeException("Formato de teléfono inválido.");
        }
        if (dto.getSalary() == null || dto.getSalary().doubleValue() <= 0) {
            throw new RuntimeException("El salario debe ser mayor a 0.");
        }
        if (dto.getRole() == null || dto.getRole().trim().isEmpty()) {
            throw new RuntimeException("Debe seleccionar un cargo.");
        }
    }

    private EmployeeDTO toDTO(Employee e) {
        EmployeeDTO dto = new EmployeeDTO();
        dto.setId(e.getEmployeeId());
        dto.setName(e.getFirstName());
        dto.setLastName(e.getLastName());
        dto.setDni(e.getNationalId());
        dto.setEmail(e.getEmail());
        dto.setPhone(e.getPhone());
        dto.setSalary(e.getSalary());
        dto.setStatus(e.getStatus());
        dto.setHireDate(e.getHireDate());
        dto.setInactiveDate(e.getInactiveDate());
        dto.setReactivationDate(e.getReactivationDate());
        dto.setInactiveReason(e.getInactiveReason());
        if (e.getPosition() != null) {
            dto.setRole(e.getPosition().getPositionName());
        }
        return dto;
    }
}