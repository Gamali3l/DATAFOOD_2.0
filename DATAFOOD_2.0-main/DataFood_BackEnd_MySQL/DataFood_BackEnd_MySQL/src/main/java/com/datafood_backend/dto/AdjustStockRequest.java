package com.datafood_backend.dto;
import lombok.Data;

@Data
public class AdjustStockRequest {
    private Double  newQuantity;
    private String  reason;
    private Integer employeeId;
}