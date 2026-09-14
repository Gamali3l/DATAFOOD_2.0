package com.datafood_backend.dto;
import lombok.Data;

@Data
public class PurchaseChangeLogDTO {
    private String logDate;
    private String employeeName;
    private String action;
    private String detail;
}

