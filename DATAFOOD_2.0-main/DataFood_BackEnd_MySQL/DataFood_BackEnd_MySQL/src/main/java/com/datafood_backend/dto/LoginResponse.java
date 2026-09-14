package com.datafood_backend.dto;

import lombok.Data;

@Data
public class LoginResponse {
    private Integer employeeId;
    private String  firstName;
    private String  lastName;
    private String  email;
    private String  role;          // "Admin" | "Cajero"
}