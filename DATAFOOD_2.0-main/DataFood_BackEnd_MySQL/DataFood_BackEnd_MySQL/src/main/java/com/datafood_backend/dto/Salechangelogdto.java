package com.datafood_backend.dto;

import lombok.Data;

@Data
public class Salechangelogdto {
    private Integer logId;
    private String  logDate;
    private String  action;
    private String  detail;
    private Integer employeeId;
    private String  employeeName;
}