package com.datafood_backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreateSaleRequest {
    private String clientName;
    private String address;
    private Double deliveryFee;
    private Boolean isDelivery;
    private Integer employeeId;
    private List<SaleItemRequest> details;

    @Data
    public static class SaleItemRequest {
        private Integer productId;
        private Double quantity;
        private Double unitPrice;
    }
}