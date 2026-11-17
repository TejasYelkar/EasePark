package com.smartpark.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record BookingDecisionRequest(
        @NotBlank @Pattern(regexp = "APPROVE|REJECT") String decision) {
}
