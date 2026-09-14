package com.datafood_backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class CreatePurchaseRequest {

    // En modo single: supplierId global (puede ser null en modo multi)
    private Integer supplierId;
    private Integer employeeId;
    private String  paymentMethod;
    private String  invoiceNumber;
    private Double  taxRate;
    private String  status;

    private List<PurchaseItemRequest> details;

    @Data
    public static class PurchaseItemRequest {
        private Integer supplyId;
        private Double  quantity;
        private Double  unitPrice;

        // ✅ Proveedor por ítem — solo se usa en modo multi-proveedor
        // Si es null, el SP usa el supplierId del encabezado
        private Integer supplierId;
    }
}