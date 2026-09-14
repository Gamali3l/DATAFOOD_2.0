package com.datafood_backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "business_config")
public class BusinessConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "menu_logo_url", length = 255)
    private String menuLogoUrl;

    // Getters y Setters
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getMenuLogoUrl() { return menuLogoUrl; }
    public void setMenuLogoUrl(String menuLogoUrl) { this.menuLogoUrl = menuLogoUrl; }
    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
}