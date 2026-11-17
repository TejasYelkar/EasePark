
package com.smartpark.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "parking_slots")
public class ParkingSlot {

    @Id
    private String id;

    @Indexed(unique = true)
    private String slotNumber;

    private Integer floorNumber;

    private SlotType slotType;

    private SlotStatus status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public enum SlotType {
        BIKE,
        CAR
    }

    public enum SlotStatus {
        AVAILABLE,
        OCCUPIED,
        MAINTENANCE,
        RESERVED
    }

    // Constructors

    public ParkingSlot() {
    }

    public ParkingSlot(
            String slotNumber,
            Integer floorNumber,
            SlotType slotType,
            SlotStatus status) {

        this.slotNumber = slotNumber;
        this.floorNumber = floorNumber;
        this.slotType = slotType;
        this.status = status;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSlotNumber() {
        return slotNumber;
    }

    public void setSlotNumber(String slotNumber) {
        this.slotNumber = slotNumber;
    }

    public Integer getFloorNumber() {
        return floorNumber;
    }

    public void setFloorNumber(Integer floorNumber) {
        this.floorNumber = floorNumber;
    }

    public SlotType getSlotType() {
        return slotType;
    }

    public void setSlotType(SlotType slotType) {
        this.slotType = slotType;
    }

    public SlotStatus getStatus() {
        return status;
    }

    public void setStatus(SlotStatus status) {
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
