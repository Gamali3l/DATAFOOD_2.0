package com.datafood_backend.controller;

import com.datafood_backend.dto.DailyStatsDTO;
import com.datafood_backend.service.DailyStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class DailyStatsController {

    private final DailyStatsService statsService;

    /**
     * GET /api/stats/daily
     * Devuelve las estadísticas del día actual para el CajeroView.
     */
    @GetMapping("/daily")
    public ResponseEntity<DailyStatsDTO> daily() {
        return ResponseEntity.ok(statsService.getStats());
    }
}