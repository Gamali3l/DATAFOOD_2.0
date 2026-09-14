package com.datafood_backend.service;

import com.datafood_backend.dto.RecipeItemDTO;
import com.datafood_backend.dto.ProductCostingDTO;
import com.datafood_backend.model.Product;
import com.datafood_backend.model.Supply;
import com.datafood_backend.model.SupplyProduct;
import com.datafood_backend.repository.ProductRepository;
import com.datafood_backend.repository.SupplyProductRepository;
import com.datafood_backend.repository.SupplyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final SupplyProductRepository supplyProductRepo;
    private final ProductRepository       productRepo;
    private final SupplyRepository        supplyRepo;

    public List<RecipeItemDTO> getRecipe(Integer productId) {
        return supplyProductRepo.findByProduct_ProductId(productId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    private RecipeItemDTO toDTO(SupplyProduct sp) {
        RecipeItemDTO dto = new RecipeItemDTO();
        Supply s = sp.getSupply();
        dto.setSupplyId(s.getSupplyId());
        dto.setSupplyName(s.getName());
        dto.setUnitOfMeasure(s.getUnitOfMeasure());
        dto.setQuantity(sp.getQuantity());
        BigDecimal unitCost = s.getAverageCost() != null ? s.getAverageCost() : BigDecimal.ZERO;
        dto.setUnitCost(unitCost);
        dto.setSubtotal(sp.getQuantity().multiply(unitCost));
        return dto;
    }

    // Reemplaza la receta completa del producto (borra lo anterior y guarda lo nuevo)
    @Transactional
    public List<RecipeItemDTO> saveRecipe(Integer productId, List<RecipeItemDTO> items) {
        Product product = productRepo.findById(productId)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + productId));

        supplyProductRepo.deleteByProduct_ProductId(productId);

        for (RecipeItemDTO item : items) {
            if (item.getQuantity() == null || item.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                continue; // ignora líneas vacías o en cero
            }
            Supply supply = supplyRepo.findById(item.getSupplyId())
                    .orElseThrow(() -> new RuntimeException("Insumo no encontrado: " + item.getSupplyId()));

            SupplyProduct sp = new SupplyProduct();
            sp.setSupply(supply);
            sp.setProduct(product);
            sp.setQuantity(item.getQuantity());
            supplyProductRepo.save(sp);
        }

        return getRecipe(productId);
    }

    public ProductCostingDTO getCosting(Integer productId) {
        Product product = productRepo.findById(productId)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + productId));

        List<RecipeItemDTO> recipe = getRecipe(productId);

        BigDecimal productionCost = recipe.stream()
                .map(RecipeItemDTO::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal salePrice = product.getPrice();
        BigDecimal marginAmount = salePrice.subtract(productionCost);

        BigDecimal marginPercent = salePrice.compareTo(BigDecimal.ZERO) > 0
                ? marginAmount.divide(salePrice, 4, java.math.RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

        ProductCostingDTO dto = new ProductCostingDTO();
        dto.setProductId(product.getProductId());
        dto.setProductName(product.getName());
        dto.setSalePrice(salePrice);
        dto.setProductionCost(productionCost);
        dto.setMarginAmount(marginAmount);
        dto.setMarginPercent(marginPercent);
        dto.setRecipe(recipe);
        return dto;
    }
}