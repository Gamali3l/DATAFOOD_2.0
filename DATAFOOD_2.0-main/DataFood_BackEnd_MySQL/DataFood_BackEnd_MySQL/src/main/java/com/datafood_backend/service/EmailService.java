package com.datafood_backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    public void sendWelcomeEmail(String toEmail, String nombre, String password) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("👋 Bienvenido al sistema — tus credenciales de acceso");
            helper.setText("""
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;
                            border:1px solid #e5e7eb;border-radius:12px;">
                    <h2 style="color:#14b8a6;">¡Bienvenido, %s!</h2>
                    <p>Tu cuenta ha sido creada. Aquí están tus credenciales:</p>
                    <div style="background:#f0fdfa;border-radius:8px;padding:16px;margin:16px 0;">
                        <p><b>📧 Correo:</b> %s</p>
                        <p><b>🔑 Contraseña temporal:</b>
                           <code style="background:#e0f2fe;padding:4px 8px;border-radius:4px;
                                        font-size:1.1em;">%s</code>
                        </p>
                    </div>
                    <p style="color:#6b7280;font-size:0.9em;">
                        Por seguridad, cambia tu contraseña después de iniciar sesión.
                    </p>
                </div>
            """.formatted(nombre, toEmail, password), true);

            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Error al enviar correo de bienvenida: " + e.getMessage());
        }
    }

    public void sendPasswordResetEmail(String toEmail, String nombre, String token) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("🔐 Código de recuperación de contraseña");
            helper.setText("""
            <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;
                        border:1px solid #e5e7eb;border-radius:12px;">
                <h2 style="color:#f97316;">Recuperar contraseña</h2>
                <p>Hola <b>%s</b>, tu código de recuperación es:</p>
                <div style="background:#f0fdfa;border-radius:12px;padding:24px;
                            text-align:center;margin:20px 0;">
                    <span style="font-size:2.5rem;font-weight:bold;
                                 letter-spacing:12px;color:#14b8a6;">%s</span>
                </div>
                <p style="color:#6b7280;font-size:0.9em;">
                    Ingresa este código en la aplicación. Expira en <b>15 minutos</b>.<br>
                    Si no solicitaste esto, ignora este correo.
                </p>
            </div>
        """.formatted(nombre, token), true);

            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Error al enviar correo de recuperación: " + e.getMessage());
        }
    }
}