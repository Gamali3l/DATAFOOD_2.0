package com.datafood_backend.controller;

import com.datafood_backend.dto.EmployeeDTO;
import com.datafood_backend.service.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    public ResponseEntity<List<EmployeeDTO>> getAllEmployees() {
        return ResponseEntity.ok(employeeService.getAll());
    }

    @PostMapping
    public ResponseEntity<EmployeeDTO> createEmployee(@RequestBody EmployeeDTO dto) {
        return ResponseEntity.ok(employeeService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeDTO> updateEmployee(@PathVariable Integer id, @RequestBody EmployeeDTO dto) {
        return ResponseEntity.ok(employeeService.update(id, dto));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<Void> toggleEmployeeStatus(
            @PathVariable Integer id,
            @RequestBody(required = false) java.util.Map<String, String> body) {

        String reason = (body != null) ? body.get("reason") : null;
        employeeService.toggleStatus(id, reason);
        return ResponseEntity.ok().build();

    }
}