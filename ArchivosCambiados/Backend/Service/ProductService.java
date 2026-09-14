package com.datafood_backend.service;

import com.datafood_backend.dto.ProductDTO;
import com.datafood_backend.model.Product;
import com.datafood_backend.model.ProductCategory;
import com.datafood_backend.model.Supply;
import com.datafood_backend.model.SupplyProduct;
import com.datafood_backend.repository.ProductCategoryRepository;
import com.datafood_backend.repository.ProductRepository;
import com.datafood_backend.repository.SupplyProductRepository;
import com.datafood_backend.repository.SupplyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository         productRepo;
    private final ProductCategoryRepository categoryRepo;
    private final SupplyProductRepository   supplyProductRepo;
    private final SupplyRepository          supplyRepo;

    public List<ProductDTO> getAll(Integer categoryId, Integer status,
                                   String search, Boolean sortAZ) {

        String safeName = (search != null) ? search : "";
        boolean hasCat    = categoryId != null;
        boolean hasStatus = status != null;

        List<Product> result;

        if (hasCat && hasStatus) {
            result = productRepo
                    .findByProductCategory_ProductCategoryIdAndStatusAndNameContainingIgnoreCase(
                            categoryId, status, safeName);

        } else if (hasCat) {
            if (Boolean.TRUE.equals(sortAZ)) {
                result = productRepo.findByCategoryOrderByNameAZ(categoryId);
                if (!safeName.isBlank())
                    result = result.stream()
                            .filter(p -> p.getName().toLowerCase().contains(safeName.toLowerCase()))
                            .collect(Collectors.toList());
            } else {
                result = productRepo
                        .findByProductCategory_ProductCategoryIdAndNameContainingIgnoreCase(
                                categoryId, safeName);
            }

        } else if (hasStatus) {
            result = productRepo.findByStatusAndNameContainingIgnoreCase(status, safeName);

        } else if (!safeName.isBlank()) {
            result = productRepo.findByNameContainingIgnoreCase(safeName);

        } else if (Boolean.TRUE.equals(sortAZ)) {
            result = productRepo.findAllOrderByNameAZ();

        } else {
            result = productRepo.findAll();
        }

        return result.stream().map(this::toDTO).collect(Collectors.toList());
    }

    public ProductDTO getById(Integer id) {
        return toDTO(findOrThrow(id));
    }

    public ProductDTO create(ProductDTO dto) {
        ProductCategory cat = findCatOrThrow(dto.getProductCategoryId());

        Product product = new Product();
        product.setName(dto.getName().trim());
        product.setPrice(dto.getPrice());
        product.setStatus(0); // ── inactivo por defecto: se activa manualmente cada día ──
        product.setProductCategory(cat);
        product.setDescription(dto.getDescription());
        return toDTO(productRepo.save(product));
    }

    public ProductDTO update(Integer id, ProductDTO dto) {
        Product product = findOrThrow(id);
        ProductCategory cat = findCatOrThrow(dto.getProductCategoryId());

        product.setName(dto.getName().trim());
        product.setPrice(dto.getPrice());
        product.setProductCategory(cat);
        product.setDescription(dto.getDescription());
        if (dto.getStatus() != null) {
            product.setStatus(dto.getStatus());
        }

        return toDTO(productRepo.save(product));
    }

    /**
     * Alterna entre 1 (ACTIVO) y 0 (INACTIVO).
     * Al ACTIVAR: descuenta 1 lote completo de la receta, pero solo
     * la primera vez que se activa ese mismo día (lastActivationDate).
     */
    @Transactional
    public ProductDTO toggleStatus(Integer id) {
        Product product = findOrThrow(id);
        int newStatus = product.getStatus() == 1 ? 0 : 1;

        if (newStatus == 1) {
            LocalDate today = LocalDate.now();
            boolean yaActivadoHoy = today.equals(product.getLastActivationDate());

            if (!yaActivadoHoy) {
                List<SupplyProduct> recipe = supplyProductRepo.findByProduct_ProductId(id);
                for (SupplyProduct sp : recipe) {
                    Supply supply = sp.getSupply();
                    int descuento = sp.getQuantity().intValue();
                    int nuevoStock = supply.getAvailableQuantity() - descuento;
                    if (nuevoStock < 0) {
                        throw new RuntimeException(
                                "Stock insuficiente de \"" + supply.getName() +
                                        "\" para activar \"" + product.getName() + "\".");
                    }
                    supply.setAvailableQuantity(nuevoStock);
                    supplyRepo.save(supply);
                }
                product.setLastActivationDate(today);
            }
        }

        product.setStatus(newStatus);
        return toDTO(productRepo.save(product));
    }

    /**
     * Desactiva TODOS los productos automáticamente cada medianoche.
     * No borra lastActivationDate — al llegar el nuevo día, la comparación
     * de fecha en toggleStatus() ya detecta que hay que volver a descontar.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void deactivateAllProductsDaily() {
        List<Product> all = productRepo.findAll();
        for (Product p : all) {
            p.setStatus(0);
        }
        productRepo.saveAll(all);
    }
    @Transactional
    public void delete(Integer id) {
        findOrThrow(id);
        supplyProductRepo.deleteByProduct_ProductId(id);
        productRepo.deleteById(id);
    }

    public void updateImageUrl(Integer id, String imageUrl) {
        Product product = findOrThrow(id);
        product.setImageUrl(imageUrl);
        productRepo.save(product);
    }

    private Product findOrThrow(Integer id) {
        return productRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + id));
    }

    private ProductCategory findCatOrThrow(Integer catId) {
        return categoryRepo.findById(catId)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada: " + catId));
    }

    private ProductDTO toDTO(Product p) {
        ProductDTO dto = new ProductDTO();
        dto.setProductId(p.getProductId());
        dto.setName(p.getName());
        dto.setPrice(p.getPrice());
        dto.setStatus(p.getStatus());
        dto.setProductCategoryId(p.getProductCategory().getProductCategoryId());
        dto.setCategoryName(p.getProductCategory().getName());
        dto.setImageUrl(p.getImageUrl());
        dto.setDescription(p.getDescription());
        return dto;
    }
}