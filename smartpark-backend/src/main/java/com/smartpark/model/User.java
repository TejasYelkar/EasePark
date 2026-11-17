package com.smartpark.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    @Indexed(unique = true)
    private String email;

    private String phone;

    private List<Vehicle> vehicles = new ArrayList<>();

    @JsonIgnore
    private String passwordHash;

    @JsonIgnore
    private String passwordResetCodeHash;

    @JsonIgnore
    private LocalDateTime passwordResetExpiresAt;

    @JsonIgnore
    private LocalDateTime passwordResetSentAt;

    @JsonIgnore
    private int passwordResetAttempts;

    private LocalDateTime createdAt = LocalDateTime.now();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    @JsonIgnore
    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    @JsonIgnore
    public String getPasswordResetCodeHash() {
        return passwordResetCodeHash;
    }

    public void setPasswordResetCodeHash(String passwordResetCodeHash) {
        this.passwordResetCodeHash = passwordResetCodeHash;
    }

    @JsonIgnore
    public LocalDateTime getPasswordResetExpiresAt() {
        return passwordResetExpiresAt;
    }

    public void setPasswordResetExpiresAt(LocalDateTime passwordResetExpiresAt) {
        this.passwordResetExpiresAt = passwordResetExpiresAt;
    }

    @JsonIgnore
    public LocalDateTime getPasswordResetSentAt() {
        return passwordResetSentAt;
    }

    public void setPasswordResetSentAt(LocalDateTime passwordResetSentAt) {
        this.passwordResetSentAt = passwordResetSentAt;
    }

    @JsonIgnore
    public int getPasswordResetAttempts() {
        return passwordResetAttempts;
    }

    public void setPasswordResetAttempts(int passwordResetAttempts) {
        this.passwordResetAttempts = passwordResetAttempts;
    }

    public List<Vehicle> getVehicles() {
        return vehicles;
    }

    public void setVehicles(List<Vehicle> vehicles) {
        this.vehicles = vehicles;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
