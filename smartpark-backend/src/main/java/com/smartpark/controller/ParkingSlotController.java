package com.smartpark.controller;

import com.smartpark.model.ParkingSlot;
import com.smartpark.dto.ParkingSlotStatusRequest;
import com.smartpark.service.ParkingSlotService;
import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/parking/slots")
@CrossOrigin(origins = "*")
public class ParkingSlotController {

    private final ParkingSlotService service;

    public ParkingSlotController(ParkingSlotService service) {
        this.service = service;
    }

    @GetMapping
    public List<ParkingSlot> getAllSlots() {
        return service.getAllSlots();
    }

    @PutMapping("/{slotNumber}/status")
    public ParkingSlot updateSlotStatus(
            @PathVariable String slotNumber,
            @Valid @RequestBody ParkingSlotStatusRequest request) {
        return service.updateStatus(slotNumber, request.status());
    }

    @GetMapping("/floor/{floor}")
    public List<ParkingSlot> getSlotsByFloor(
            @PathVariable int floor) {
        return service.getSlotsByFloor(floor);
    }

    @GetMapping("/available")
    public List<ParkingSlot> getAvailableSlots(
            @RequestParam int floor,
            @RequestParam ParkingSlot.SlotType type) {

        return service.getAvailableSlots(floor, type);
    }

    @GetMapping("/availability")
    public List<ParkingSlot> getAvailability(
            @RequestParam int floor,
            @RequestParam ParkingSlot.SlotType type,
            @RequestParam LocalDate parkingDate,
            @RequestParam LocalTime entryTime,
            @RequestParam LocalTime exitTime) {
        return service.getAvailability(floor, type, parkingDate, entryTime, exitTime);
    }
    
}
 