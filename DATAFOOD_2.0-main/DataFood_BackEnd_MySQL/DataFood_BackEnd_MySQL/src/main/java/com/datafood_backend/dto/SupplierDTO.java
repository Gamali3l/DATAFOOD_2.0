package com.datafood_backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class SupplierDTO {
    private Integer supplierId;
    private String  name;
    private Byte    status;
    private String  company;
    private String  description;
    private List<String> phones;
    private List<String> addresses;
}
