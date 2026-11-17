package com.smartpark.dto;

import com.smartpark.model.ParkingSlot;
import jakarta.validation.constraints.NotNull;

public record ParkingSlotStatusRequest(@NotNull ParkingSlot.SlotStatus status) {
}
