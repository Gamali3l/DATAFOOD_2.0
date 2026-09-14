package com.datafood_backend.service;

import com.datafood_backend.dto.DecreaseStockRequest;
import com.datafood_backend.dto.SupplyDTO;                  // FIX #1: import explícito
import com.datafood_backend.model.Supply;
import com.datafood_backend.model.SupplyCategory;
import com.datafood_backend.repository.SupplyRepository;
import com.datafood_backend.repository.SupplyCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplyService {

    private final SupplyRepository         supplyRepo;
    private final SupplyCategoryRepository catRepo;
    private final JdbcTemplate             jdbc;

    public List<SupplyDTO> getAll(String name, Integer categoryId) {

        // FIX #1: SQL construido limpiamente sin riesgo de WHERE colgante
        StringBuilder sql = new StringBuilder(
                "SELECT supplyId, name, availableQuantity, minimumQuantity, unitOfMeasure, " +
                        "stockAlert, averageCost, supplyCategoryId, categoryName, lastPurchaseDate, lastSupplierName, lastUnitPrice " +
                        "FROM vw_SupplyInventory"
        );

        List<Object> params = new ArrayList<>();

        if (name != null || categoryId != null) {
            sql.append(" WHERE");
            if (name != null) {
                sql.append(" name LIKE ?");
                params.add("%" + name + "%");
            }
            if (name != null && categoryId != null) {
                sql.append(" AND");
            }
            if (categoryId != null) {
                sql.append(" supplyCategoryId = ?");
                params.add(categoryId);
            }
        }

        return jdbc.query(
                sql.toString(),
                params.toArray(),
                (rs, row) -> {
                    SupplyDTO d = new SupplyDTO();
                    d.setSupplyId(rs.getInt("supplyId"));
                    d.setName(rs.getString("name"));
                    d.setAvailableQuantity(rs.getInt("availableQuantity"));
                    d.setMinimumQuantity(rs.getInt("minimumQuantity"));
                    d.setUnitOfMeasure(rs.getString("unitOfMeasure"));
                    d.setStockAlert(rs.getBoolean("stockAlert"));
                    d.setSupplyCategoryId(rs.getInt("supplyCategoryId"));
                    d.setCategoryName(rs.getString("categoryName"));
                    d.setLastPurchaseDate(rs.getString("lastPurchaseDate"));
                    d.setLastSupplierName(rs.getString("lastSupplierName"));
                    d.setAverageCost(rs.getObject("averageCost") != null ? rs.getDouble("averageCost") : null);
                    d.setLastUnitPrice(rs.getObject("lastUnitPrice") != null ? rs.getDouble("lastUnitPrice") : null);
                    return d;
                }
        );
    }

    public SupplyDTO getById(Integer id) {
        Supply s = supplyRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado: " + id));
        return toBasicDTO(s);
    }

    @Transactional
    public SupplyDTO create(SupplyDTO dto) {
        SupplyCategory cat = catRepo.findById(dto.getSupplyCategoryId())
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));
        Supply s = new Supply();
        s.setName(dto.getName());
        s.setAvailableQuantity(dto.getAvailableQuantity());
        s.setMinimumQuantity(dto.getMinimumQuantity());
        s.setUnitOfMeasure(dto.getUnitOfMeasure());
        s.setSupplyCategory(cat);
        return toBasicDTO(supplyRepo.save(s));
    }

    @Transactional
    public SupplyDTO update(Integer id, SupplyDTO dto) {
        Supply s = supplyRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado: " + id));
        SupplyCategory cat = catRepo.findById(dto.getSupplyCategoryId())
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));
        s.setName(dto.getName());
        s.setAvailableQuantity(dto.getAvailableQuantity());
        s.setMinimumQuantity(dto.getMinimumQuantity());
        s.setUnitOfMeasure(dto.getUnitOfMeasure());
        s.setSupplyCategory(cat);
        return toBasicDTO(supplyRepo.save(s));
    }

    @Transactional
    public void decreaseStock(Integer supplyId, DecreaseStockRequest req) {
        jdbc.execute(String.format(
                "CALL SP_DecreaseStock(%d, %f, '%s', %d)",
                supplyId,
                req.getQuantity(),
                req.getReason() != null ? req.getReason().replace("'", "''") : "Ajuste manual",
                req.getEmployeeId() != null ? req.getEmployeeId() : 1
        ));
    }

    private SupplyDTO toBasicDTO(Supply s) {
        SupplyDTO dto = new SupplyDTO();
        dto.setSupplyId(s.getSupplyId());
        dto.setName(s.getName());
        dto.setAvailableQuantity(s.getAvailableQuantity());
        dto.setMinimumQuantity(s.getMinimumQuantity());
        dto.setUnitOfMeasure(s.getUnitOfMeasure());
        dto.setStockAlert(s.getStockAlert());
        dto.setSupplyCategoryId(s.getSupplyCategory().getSupplyCategoryId());
        dto.setCategoryName(s.getSupplyCategory().getName());
        return dto;
    }
}