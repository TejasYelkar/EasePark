
package com.smartpark.repository;

import com.smartpark.model.ParkingSlot;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ParkingSlotRepository
        extends MongoRepository<ParkingSlot, String> {

    // Check whether a slot already exists
    boolean existsBySlotNumber(String slotNumber);

    Optional<ParkingSlot> findBySlotNumber(String slotNumber);

    // Find all slots on a particular floor
    List<ParkingSlot> findByFloorNumber(Integer floorNumber);

    // Find slots by vehicle type
    List<ParkingSlot> findBySlotType(
            ParkingSlot.SlotType slotType);

    // Find slots by status
    List<ParkingSlot> findByStatus(
            ParkingSlot.SlotStatus status);

    // Find slots by floor and vehicle type
    List<ParkingSlot> findByFloorNumberAndSlotType(
            Integer floorNumber,
            ParkingSlot.SlotType slotType);

    // Find available slots by floor and vehicle type
    List<ParkingSlot>
    findByFloorNumberAndSlotTypeAndStatus(
            Integer floorNumber,
            ParkingSlot.SlotType slotType,
            ParkingSlot.SlotStatus status);

    // Count slots by floor and type
    long countByFloorNumberAndSlotType(
            Integer floorNumber,
            ParkingSlot.SlotType slotType);

    // Count slots by floor, type and status
    long countByFloorNumberAndSlotTypeAndStatus(
            Integer floorNumber,
            ParkingSlot.SlotType slotType,
            ParkingSlot.SlotStatus status);
}
