package com.datafood_backend.dto;
import lombok.Data;

@Data
public class DecreaseStockRequest {
    private Double  quantity;
    private String  reason;
    private Integer employeeId;
}
