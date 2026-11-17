package com.smartpark.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateUnregisteredVehicleRequest(
        @NotBlank(message = "Plate number is required.") String plateNumber,
        @NotBlank(message = "Owner name is required.") String ownerName,
        @NotBlank(message = "Mobile number is required.")
        @Pattern(regexp = "[6-9][0-9]{9}", message = "Enter a valid 10-digit mobile number.")
        String mobileNumber,
        @NotBlank(message = "Select a vehicle type.")
        @Pattern(regexp = "2 Wheeler|4 Wheeler", message = "Select a valid vehicle type.")
        String vehicleType) {
}
