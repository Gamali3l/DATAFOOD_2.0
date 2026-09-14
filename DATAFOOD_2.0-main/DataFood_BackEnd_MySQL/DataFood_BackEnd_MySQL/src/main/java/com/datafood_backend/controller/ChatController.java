//package com.datafood_backend.controller;
//
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.http.*;
//import org.springframework.web.bind.annotation.*;
//import org.springframework.web.client.RestTemplate;
//
//import java.util.Map;
//
//@RestController
//@RequestMapping("/api/chat")
//@CrossOrigin(origins = "*")
//public class ChatController {
//
//
//
//    @Value("${groq.api.key}")
//    private String apiKey;
//
//    @PostMapping
//    public ResponseEntity<String> chat(@RequestBody Map<String, Object> body) {
//        try {
//            RestTemplate rt = new RestTemplate();
//
//            HttpHeaders headers = new HttpHeaders();
//            headers.setContentType(MediaType.APPLICATION_JSON);
//            headers.setBearerAuth(apiKey);
//
//            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
//
//            ResponseEntity<String> response = rt.exchange(
//                    "https://api.groq.com/openai/v1/chat/completions",
//                    HttpMethod.POST,
//                    request,
//                    String.class
//            );
//
//            return ResponseEntity.ok(response.getBody());
//
//        } catch (Exception e) {
//            return ResponseEntity
//                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
//                    .body("{\"error\":\"" + e.getMessage() + "\"}");
//        }
//    }
//}
//
///*deploy*/