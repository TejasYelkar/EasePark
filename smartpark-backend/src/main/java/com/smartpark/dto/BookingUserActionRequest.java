package com.smartpark.dto;

import jakarta.validation.constraints.NotBlank;

public record BookingUserActionRequest(@NotBlank String userId) {
}
