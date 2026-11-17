package com.smartpark.service;

import com.smartpark.model.ParkingBooking;
import com.smartpark.model.ParkingSlot;
import com.smartpark.repository.ParkingBookingRepository;
import com.smartpark.repository.ParkingSlotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ParkingSlotServiceTest {

    private ParkingBookingRepository bookingRepository;
    private ParkingSlotRepository slotRepository;
    private ParkingSlotService service;

    @BeforeEach
    void setUp() {
        bookingRepository = mock(ParkingBookingRepository.class);
        slotRepository = mock(ParkingSlotRepository.class);
        service = new ParkingSlotService(slotRepository, bookingRepository);
    }

    @Test
    void reservesSlotsForApprovedRequestsOnly() {
        LocalDate parkingDate = LocalDate.now().plusDays(1);
        ParkingSlot pendingSlot = slot("B1-001");
        ParkingSlot approvedSlot = slot("B1-002");
        ParkingBooking approved = booking(
                "APPROVED", approvedSlot.getSlotNumber(), parkingDate, 10, 12);

        when(slotRepository.findByFloorNumberAndSlotType(1, ParkingSlot.SlotType.BIKE))
                .thenReturn(List.of(pendingSlot, approvedSlot));
        when(bookingRepository.findByBookingStatus("APPROVED"))
                .thenReturn(List.of(approved));

        List<ParkingSlot> slots = service.getAvailability(
                1,
                ParkingSlot.SlotType.BIKE,
                parkingDate,
                LocalTime.of(10, 30),
                LocalTime.of(11, 0));

        assertEquals(ParkingSlot.SlotStatus.AVAILABLE, slots.get(0).getStatus());
        assertEquals(ParkingSlot.SlotStatus.RESERVED, slots.get(1).getStatus());
    }

    @Test
    void keepsOverdueApprovedSlotReservedUntilCheckout() {
        LocalDate today = LocalDate.now();
        ParkingSlot slot = slot("C1-001");
        ParkingBooking overdue = booking(
                "APPROVED",
                slot.getSlotNumber(),
                today.minusDays(1),
                10,
                11);

        when(slotRepository.findByFloorNumberAndSlotType(1, ParkingSlot.SlotType.CAR))
                .thenReturn(List.of(slot));
        when(bookingRepository.findByBookingStatus("APPROVED"))
                .thenReturn(List.of(overdue));

        List<ParkingSlot> occupied = service.getAvailability(
                1,
                ParkingSlot.SlotType.CAR,
                today,
                LocalTime.of(10, 0),
                LocalTime.of(11, 0));
        assertEquals(ParkingSlot.SlotStatus.RESERVED, occupied.get(0).getStatus());

        overdue.setCheckedOutAt(LocalDateTime.now());
        slot.setStatus(ParkingSlot.SlotStatus.AVAILABLE);
        List<ParkingSlot> available = service.getAvailability(
                1,
                ParkingSlot.SlotType.CAR,
                today,
                LocalTime.of(10, 0),
                LocalTime.of(11, 0));
        assertEquals(ParkingSlot.SlotStatus.AVAILABLE, available.get(0).getStatus());
    }

    @Test
    void showsCurrentlyParkedApprovedBookingAsOccupied() {
        LocalDateTime now = LocalDateTime.now();
        ParkingSlot slot = slot("C1-001");
        ParkingBooking activeBooking = booking(
                "APPROVED", slot.getSlotNumber(), now.toLocalDate(), 0, 23);
        activeBooking.setParkingDate(now.toLocalDate());
        activeBooking.setEntryTime(LocalTime.MIDNIGHT);
        activeBooking.setExitTime(LocalTime.MAX);

        when(slotRepository.findAll()).thenReturn(List.of(slot));
        when(bookingRepository.findByBookingStatus("APPROVED"))
                .thenReturn(List.of(activeBooking));

        List<ParkingSlot> slots = service.getAllSlots();

        assertEquals(ParkingSlot.SlotStatus.OCCUPIED, slots.get(0).getStatus());
    }

    @Test
    void showsUpcomingApprovedBookingAsReserved() {
        ParkingSlot slot = slot("C1-001");
        ParkingBooking upcomingBooking = booking(
                "APPROVED",
                slot.getSlotNumber(),
                LocalDate.now().plusDays(1),
                10,
                11);

        when(slotRepository.findAll()).thenReturn(List.of(slot));
        when(bookingRepository.findByBookingStatus("APPROVED"))
                .thenReturn(List.of(upcomingBooking));

        List<ParkingSlot> slots = service.getAllSlots();

        assertEquals(ParkingSlot.SlotStatus.RESERVED, slots.get(0).getStatus());
    }

    @Test
    void preventsMaintenanceWhenSlotHasAnApprovedBooking() {
        ParkingSlot slot = slot("C1-001");
        ParkingBooking approved = booking(
                "APPROVED", slot.getSlotNumber(), LocalDate.now().plusDays(1), 10, 11);
        when(slotRepository.findBySlotNumber(slot.getSlotNumber()))
                .thenReturn(java.util.Optional.of(slot));
        when(bookingRepository.findByBookingStatus("APPROVED"))
                .thenReturn(List.of(approved));

        assertThrows(
                ResponseStatusException.class,
                () -> service.updateStatus(
                        slot.getSlotNumber(), ParkingSlot.SlotStatus.MAINTENANCE));

        verify(slotRepository, org.mockito.Mockito.never()).save(any(ParkingSlot.class));
    }

    @Test
    void persistsMaintenanceAndAvailableStatusChanges() {
        ParkingSlot slot = slot("C1-001");
        when(slotRepository.findBySlotNumber(slot.getSlotNumber()))
                .thenReturn(java.util.Optional.of(slot));
        when(bookingRepository.findByBookingStatus("APPROVED")).thenReturn(List.of());
        when(slotRepository.save(any(ParkingSlot.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ParkingSlot maintenance = service.updateStatus(
                slot.getSlotNumber(), ParkingSlot.SlotStatus.MAINTENANCE);
        assertEquals(ParkingSlot.SlotStatus.MAINTENANCE, maintenance.getStatus());

        ParkingSlot available = service.updateStatus(
                slot.getSlotNumber(), ParkingSlot.SlotStatus.AVAILABLE);

        assertEquals(ParkingSlot.SlotStatus.AVAILABLE, available.getStatus());
        verify(slotRepository, org.mockito.Mockito.times(2)).save(slot);
    }

    @Test
    void keepsMaintenanceStatusInAdminAndUserSlotLists() {
        ParkingSlot allSlotsMaintenance = slot("C1-001");
        allSlotsMaintenance.setStatus(ParkingSlot.SlotStatus.MAINTENANCE);
        ParkingSlot floorMaintenance = slot("C1-001");
        floorMaintenance.setStatus(ParkingSlot.SlotStatus.MAINTENANCE);
        when(slotRepository.findAll()).thenReturn(List.of(allSlotsMaintenance));
        when(slotRepository.findByFloorNumber(1)).thenReturn(List.of(floorMaintenance));
        when(bookingRepository.findByBookingStatus("APPROVED")).thenReturn(List.of());

        assertEquals(
                ParkingSlot.SlotStatus.MAINTENANCE,
                service.getAllSlots().get(0).getStatus());
        assertEquals(
                ParkingSlot.SlotStatus.MAINTENANCE,
                service.getSlotsByFloor(1).get(0).getStatus());
    }

    private ParkingSlot slot(String number) {
        return new ParkingSlot(
                number,
                1,
                number.startsWith("B")
                        ? ParkingSlot.SlotType.BIKE
                        : ParkingSlot.SlotType.CAR,
                ParkingSlot.SlotStatus.AVAILABLE);
    }

    private ParkingBooking booking(
            String status,
            String slotId,
            LocalDate date,
            int entryHour,
            int exitHour) {
        ParkingBooking booking = new ParkingBooking();
        booking.setBookingStatus(status);
        booking.setSlotId(slotId);
        booking.setParkingDate(date);
        booking.setEntryTime(LocalTime.of(entryHour, 0));
        booking.setExitTime(LocalTime.of(exitHour, 0));
        return booking;
    }
}
