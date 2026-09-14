package com.datafood_backend.model;

import java.io.Serializable;
import java.util.Objects;

public class SupplyProductId implements Serializable {

    private Integer supply;
    private Integer product;

    public SupplyProductId() {}

    public SupplyProductId(Integer supply, Integer product) {
        this.supply = supply;
        this.product = product;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SupplyProductId)) return false;
        SupplyProductId that = (SupplyProductId) o;
        return Objects.equals(supply, that.supply) && Objects.equals(product, that.product);
    }

    @Override
    public int hashCode() {
        return Objects.hash(supply, product);
    }
}