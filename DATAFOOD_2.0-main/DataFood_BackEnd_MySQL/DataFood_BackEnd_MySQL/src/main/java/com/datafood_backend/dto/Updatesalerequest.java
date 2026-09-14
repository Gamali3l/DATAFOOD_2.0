package com.datafood_backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class Updatesalerequest {
    private Integer saleDetailId;
    private String  customerName;
    private String  address;
    private String  invoiceNumber;
    private Integer employeeId;

    /** Opcional: si se envía, los productos de la venta se reemplazan */
    private List<SaleItemRequest> details;

    @Data
    public static class SaleItemRequest {
        private Integer productId;
        private Double  quantity;
        private Double  unitPrice;
    }
}