
package com.smartpark.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")

public class HealthController {

    @GetMapping("/health")
    public Map<String, Object> checkHealth() {

        Map<String, Object> response = new HashMap<>();

        response.put("status", "SUCCESS");
        response.put("message", "SmartPark Backend Connected Successfully!");
        response.put("application", "SmartPark");
        response.put("timestamp", LocalDateTime.now());

        return response;
    }
}
