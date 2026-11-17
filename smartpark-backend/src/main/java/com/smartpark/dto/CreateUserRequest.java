package com.smartpark.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateUserRequest(
        @NotBlank String username,
        @NotBlank @Email String email,
        @NotBlank @Pattern(regexp = "[6-9][0-9]{9}") String phone,
        @NotEmpty @Valid List<RegisterUserRequest.RegisteredVehicle> vehicles,
        @NotBlank @Size(min = 8, max = 72) String password) {
}
