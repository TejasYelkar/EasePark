
package com.smartpark.service;

import com.smartpark.model.ParkingSlot;
import com.smartpark.model.ParkingBooking;
import com.smartpark.repository.ParkingBookingRepository;
import com.smartpark.repository.ParkingSlotRepository;

import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ParkingSlotService {

    private final ParkingSlotRepository repository;
    private final ParkingBookingRepository bookingRepository;

    public ParkingSlotService(
            ParkingSlotRepository repository,
            ParkingBookingRepository bookingRepository) {
        this.repository = repository;
        this.bookingRepository = bookingRepository;
    }

    public List<ParkingSlot> getAllSlots() {
        return applyCurrentOccupancy(repository.findAll());
    }

    public List<ParkingSlot> getSlotsByFloor(int floor) {
        return applyCurrentOccupancy(repository.findByFloorNumber(floor));
    }

    public List<ParkingSlot> getSlotsByType(
            ParkingSlot.SlotType type) {
        return repository.findBySlotType(type);
    }

    public List<ParkingSlot> getAvailableSlots(
            int floor,
            ParkingSlot.SlotType type) {

        return applyCurrentOccupancy(repository.findByFloorNumberAndSlotType(
                floor, type)).stream()
                .filter(slot -> slot.getStatus() == ParkingSlot.SlotStatus.AVAILABLE)
                .toList();
    }

    public List<ParkingSlot> getAvailability(
            int floor,
            ParkingSlot.SlotType type,
            LocalDate parkingDate,
            LocalTime entryTime,
            LocalTime exitTime) {
        if (!exitTime.isAfter(entryTime)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Exit time must be later than entry time.");
        }

        List<ParkingSlot> slots = repository.findByFloorNumberAndSlotType(floor, type);
        LocalDateTime requestedStart = LocalDateTime.of(parkingDate, entryTime);
        LocalDateTime requestedEnd = LocalDateTime.of(parkingDate, exitTime);
        LocalDateTime now = LocalDateTime.now();
        Set<String> reservedSlotNumbers = bookingRepository.findByBookingStatus("APPROVED")
                .stream()
                .filter(booking ->
                        booking.overlapsActiveReservation(requestedStart, requestedEnd, now))
                .map(ParkingBooking::getSlotId)
                .collect(Collectors.toSet());

        slots.stream()
                .filter(slot -> slot.getStatus() == ParkingSlot.SlotStatus.AVAILABLE)
                .filter(slot -> reservedSlotNumbers.contains(slot.getSlotNumber()))
                .forEach(slot -> slot.setStatus(ParkingSlot.SlotStatus.RESERVED));

        return slots;
    }

    public ParkingSlot updateStatus(String slotNumber, ParkingSlot.SlotStatus status) {
        if (status != ParkingSlot.SlotStatus.AVAILABLE &&
                status != ParkingSlot.SlotStatus.MAINTENANCE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Admin can set a slot to AVAILABLE or MAINTENANCE.");
        }

        ParkingSlot slot = repository.findBySlotNumber(slotNumber)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Parking slot not found."));
        if (status == ParkingSlot.SlotStatus.MAINTENANCE) {
            boolean hasActiveBooking = bookingRepository.findByBookingStatus("APPROVED").stream()
                    .anyMatch(booking ->
                            slotNumber.equals(booking.getSlotId()) &&
                            booking.getCheckedOutAt() == null);
            if (hasActiveBooking) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "A slot with an approved booking cannot be placed in maintenance.");
            }
        }

        slot.setStatus(status);
        return repository.save(slot);
    }

    private List<ParkingSlot> applyCurrentOccupancy(List<ParkingSlot> slots) {
        LocalDateTime now = LocalDateTime.now();
        List<ParkingBooking> activeBookings = bookingRepository.findByBookingStatus("APPROVED")
                .stream()
                .filter(booking -> booking.getCheckedOutAt() == null)
                .filter(booking -> booking.getParkingDate() != null)
                .filter(booking -> booking.getEntryTime() != null)
                .filter(booking -> booking.getExitTime() != null)
                .toList();
        Set<String> occupiedSlotNumbers = activeBookings.stream()
                .filter(booking -> booking.overlapsActiveReservation(
                        now.minusNanos(1), now.plusNanos(1), now))
                .map(ParkingBooking::getSlotId)
                .collect(Collectors.toSet());
        Set<String> reservedSlotNumbers = activeBookings.stream()
                .filter(booking ->
                        LocalDateTime.of(booking.getParkingDate(), booking.getEntryTime())
                                .isAfter(now))
                .map(ParkingBooking::getSlotId)
                .collect(Collectors.toSet());

        slots.stream()
                .filter(slot -> slot.getStatus() == ParkingSlot.SlotStatus.AVAILABLE)
                .filter(slot -> occupiedSlotNumbers.contains(slot.getSlotNumber()))
                .forEach(slot -> slot.setStatus(ParkingSlot.SlotStatus.OCCUPIED));
        slots.stream()
                .filter(slot -> slot.getStatus() == ParkingSlot.SlotStatus.AVAILABLE)
                .filter(slot -> reservedSlotNumbers.contains(slot.getSlotNumber()))
                .forEach(slot -> slot.setStatus(ParkingSlot.SlotStatus.RESERVED));
        return slots;
    }
}
