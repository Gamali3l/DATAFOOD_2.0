package com.datafood_backend.controller;

import com.datafood_backend.dto.RecipeItemDTO;
import com.datafood_backend.service.RecipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products/{productId}/recipe")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class RecipeController {

    private final RecipeService service;

    @GetMapping
    public ResponseEntity<List<RecipeItemDTO>> getRecipe(@PathVariable Integer productId) {
        return ResponseEntity.ok(service.getRecipe(productId));
    }

    @PutMapping
    public ResponseEntity<List<RecipeItemDTO>> saveRecipe(@PathVariable Integer productId,
                                                          @RequestBody List<RecipeItemDTO> items) {
        return ResponseEntity.ok(service.saveRecipe(productId, items));
    }

    @GetMapping("/costing")
    public ResponseEntity<com.datafood_backend.dto.ProductCostingDTO> getCosting(@PathVariable Integer productId) {
        return ResponseEntity.ok(service.getCosting(productId));
    }

}