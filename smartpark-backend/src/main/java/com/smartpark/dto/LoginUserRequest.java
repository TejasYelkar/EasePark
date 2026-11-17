package com.smartpark.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record LoginUserRequest(
        @NotBlank(message = "Username is required.") String username,
        @NotBlank(message = "Password is required.")
        @Size(min = 8, max = 72, message = "Password must contain 8 to 72 characters.")
        String password,
        @NotBlank(message = "Select a vehicle type.")
        @Pattern(regexp = "2 Wheeler|4 Wheeler", message = "Select a valid vehicle type.")
        String vehicleType,
        @NotBlank(message = "Vehicle number is required.")
        @Pattern(
                regexp = "[A-Za-z]{2}[0-9]{1,2}[A-Za-z]{1,3}[0-9]{1,4}",
                message = "Enter a valid vehicle number.")
        String vehicleNumber) {
}
