package com.smartpark.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record CreateParkingBookingRequest(
        @NotBlank String userId,
        @NotBlank String slotId,
        @NotBlank String vehicleType,
        @NotBlank String vehicleNumber,
        @NotNull LocalDate parkingDate,
        @NotNull LocalTime entryTime,
        @NotNull LocalTime exitTime) {
}
