package com.datafood_backend.controller;

import com.datafood_backend.model.BusinessConfig;
import com.datafood_backend.repository.BusinessConfigRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/business")
@CrossOrigin(origins = "*")
public class BusinessConfigController {

    private final BusinessConfigRepository repo;

    @Value("${upload.path:uploads}")
    private String uploadPath;

    public BusinessConfigController(BusinessConfigRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/logo")
    public ResponseEntity<?> getLogo() {
        Optional<BusinessConfig> config = repo.findAll()
                .stream().findFirst();
        if (config.isPresent() && config.get().getLogoUrl() != null) {
            return ResponseEntity.ok(Map.of("logoUrl", config.get().getLogoUrl()));
        }
        return ResponseEntity.ok(Map.of("logoUrl", ""));
    }

    @GetMapping("/info")
    public ResponseEntity<?> getInfo() {
        BusinessConfig c = repo.findAll().stream().findFirst()
                .orElse(new BusinessConfig());
        return ResponseEntity.ok(Map.of(
                "phone",      c.getPhone()      != null ? c.getPhone()      : "",
                "menuLogoUrl", c.getMenuLogoUrl() != null ? c.getMenuLogoUrl() : ""
        ));
    }



    @PostMapping("/phone")
    public ResponseEntity<?> savePhone(@RequestBody Map<String, String> body) {
        BusinessConfig c = repo.findAll().stream().findFirst()
                .orElseGet(BusinessConfig::new);
        c.setPhone(body.get("phone"));
        repo.save(c);
        return ResponseEntity.ok(Map.of("phone", c.getPhone()));
    }

    @PostMapping("/menu-logo")
    public ResponseEntity<?> uploadMenuLogo(@RequestParam("file") MultipartFile file) throws IOException {
        Path dir = Paths.get(uploadPath + "/business");
        Files.createDirectories(dir);
        String filename = "menu_logo" + getExtension(file.getOriginalFilename());
        Files.copy(file.getInputStream(), dir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        String url = "/uploads/business/" + filename;
        BusinessConfig c = repo.findAll().stream().findFirst().orElseGet(BusinessConfig::new);
        c.setMenuLogoUrl(url);
        repo.save(c);
        return ResponseEntity.ok(Map.of("menuLogoUrl", url));
    }

    @PostMapping("/logo")
    public ResponseEntity<?> uploadLogo(@RequestParam("file") MultipartFile file) {
        try {
            Path dir = Paths.get(uploadPath + "/business");
            System.out.println(">>> Guardando en: " + dir.toAbsolutePath()); // <- agrega esto
            Files.createDirectories(dir);

            String filename = "logo" + getExtension(file.getOriginalFilename());
            Path dest = dir.resolve(filename);
            Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

            String logoUrl = "/uploads/business/" + filename;

            BusinessConfig config = repo.findAll().stream()
                    .findFirst().orElse(new BusinessConfig());
            config.setLogoUrl(logoUrl);
            repo.save(config);

            return ResponseEntity.ok(Map.of("logoUrl", logoUrl));
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "No se pudo guardar el logo"));
        }
    }

    private String getExtension(String filename) {
        if (filename == null) return ".png";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : ".png";
    }
}