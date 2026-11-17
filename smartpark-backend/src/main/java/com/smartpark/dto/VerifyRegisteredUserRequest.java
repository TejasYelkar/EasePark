package com.smartpark.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyRegisteredUserRequest(
        String userId,
        @NotBlank String username,
        @NotBlank String vehicleType,
        @NotBlank String vehicleNumber) {
}
