package com.smartpark.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;

import java.util.List;

public record RegisterUserRequest(
        @NotBlank String username,
        @NotBlank @Email String email,
        @NotBlank @Pattern(regexp = "[6-9][0-9]{9}") String phone,
        @NotEmpty List<@Valid RegisteredVehicle> vehicles) {

    public record RegisteredVehicle(
            @NotBlank @Pattern(regexp = "2 Wheeler|4 Wheeler") String vehicleType,
            @NotBlank @Pattern(regexp = "[A-Za-z]{2}[0-9]{1,2}[A-Za-z]{1,3}[0-9]{1,4}") String vehicleNumber) {
    }
}
