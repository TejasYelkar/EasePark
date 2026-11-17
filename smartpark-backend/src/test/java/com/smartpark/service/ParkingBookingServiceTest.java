package com.smartpark.service;

import com.smartpark.dto.CreateParkingBookingRequest;
import com.smartpark.model.ParkingBooking;
import com.smartpark.model.ParkingSlot;
import com.smartpark.model.User;
import com.smartpark.model.Vehicle;
import com.smartpark.repository.ParkingBookingRepository;
import com.smartpark.repository.ParkingSlotRepository;
import com.smartpark.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ParkingBookingServiceTest {

    private ParkingBookingRepository bookingRepository;
    private ParkingSlotRepository slotRepository;
    private UserRepository userRepository;
    private ParkingBookingService service;

    @BeforeEach
    void setUp() {
        bookingRepository = mock(ParkingBookingRepository.class);
        slotRepository = mock(ParkingSlotRepository.class);
        userRepository = mock(UserRepository.class);
        service = new ParkingBookingService(bookingRepository, slotRepository, userRepository);
    }

    @Test
    void savesPendingRequestAndCalculatesEstimatedPriceFromRegisteredVehicle() {
        User user = new User();
        user.setId("user-1");
        user.setUsername("Test User");
        user.setEmail("test@example.com");
        user.setVehicles(List.of(new Vehicle("4 Wheeler", "MH02AB1234")));

        ParkingSlot slot = new ParkingSlot(
                "C1-001",
                1,
                ParkingSlot.SlotType.CAR,
                ParkingSlot.SlotStatus.AVAILABLE);

        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(slotRepository.findBySlotNumber("C1-001")).thenReturn(Optional.of(slot));
        when(bookingRepository.findByBookingStatus("APPROVED")).thenReturn(List.of());
        when(bookingRepository.save(any(ParkingBooking.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ParkingBooking saved = service.createRequest(new CreateParkingBookingRequest(
                "user-1",
                "C1-001",
                "4 Wheeler",
                "MH02AB1234",
                LocalDate.now().plusDays(1),
                LocalTime.of(10, 0),
                LocalTime.of(12, 30)));

        assertEquals("PENDING", saved.getBookingStatus());
        assertEquals(90, saved.getEstimatedPrice());
        assertEquals("MH02AB1234", saved.getVehicleNumber());
        assertEquals("test@example.com", saved.getUserEmail());
    }

    @Test
    void rejectsBookingWhenUserIsNotRegistered() {
        when(userRepository.findById("unknown-user")).thenReturn(Optional.empty());

        assertThrows(
                ResponseStatusException.class,
                () -> service.createRequest(new CreateParkingBookingRequest(
                        "unknown-user",
                        "C1-001",
                        "4 Wheeler",
                        "MH02AB1234",
                        LocalDate.now().plusDays(1),
                        LocalTime.of(10, 0),
                        LocalTime.of(11, 0))));

        verify(slotRepository, never()).findBySlotNumber(any());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void savesBikeRequestAtBikeRateForRegisteredVehicle() {
        User user = new User();
        user.setId("user-1");
        user.setUsername("Test User");
        user.setEmail("test@example.com");
        user.setVehicles(List.of(new Vehicle("2 Wheeler", "MH02AB1234")));

        ParkingSlot slot = new ParkingSlot(
                "B1-001",
                1,
                ParkingSlot.SlotType.BIKE,
                ParkingSlot.SlotStatus.AVAILABLE);

        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(slotRepository.findBySlotNumber("B1-001")).thenReturn(Optional.of(slot));
        when(bookingRepository.findByBookingStatus("APPROVED")).thenReturn(List.of());
        when(bookingRepository.save(any(ParkingBooking.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ParkingBooking saved = service.createRequest(new CreateParkingBookingRequest(
                "user-1",
                "B1-001",
                "2 Wheeler",
                "MH02AB1234",
                LocalDate.now().plusDays(1),
                LocalTime.of(10, 0),
                LocalTime.of(11, 15)));

        assertEquals("PENDING", saved.getBookingStatus());
        assertEquals("BIKE", saved.getVehicleType());
        assertEquals(40, saved.getEstimatedPrice());
        assertEquals("B1-001", saved.getSlotId());
    }

    @Test
    void rejectingRequestDoesNotReserveSlot() {
        ParkingBooking booking = new ParkingBooking();
        booking.setId("booking-1");
        booking.setBookingStatus("PENDING");
        booking.setParkingDate(LocalDate.of(2025, 1, 1));
        booking.setEntryTime(LocalTime.of(10, 0));
        booking.setExitTime(LocalTime.of(11, 0));
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(ParkingBooking.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        assertFalse(booking.overlapsActiveReservation(
                LocalDateTime.of(2025, 1, 1, 10, 15),
                LocalDateTime.of(2025, 1, 1, 10, 30),
                LocalDateTime.of(2025, 1, 1, 10, 15)));

        ParkingBooking rejected = service.decide("booking-1", "REJECT");

        assertEquals("REJECTED", rejected.getBookingStatus());
        assertFalse(rejected.overlapsActiveReservation(
                LocalDateTime.now(),
                LocalDateTime.now().plusHours(1),
                LocalDateTime.now()));
    }

    @Test
    void checkoutAddsFineAndCompletesApprovedBooking() {
        ParkingBooking booking = new ParkingBooking();
        booking.setId("booking-1");
        booking.setUserId("user-1");
        booking.setBookingStatus("APPROVED");
        booking.setParkingDate(LocalDate.now().minusDays(1));
        booking.setEntryTime(LocalTime.of(10, 0));
        booking.setExitTime(LocalTime.of(11, 0));
        booking.setVehicleType("CAR");
        booking.setEstimatedPrice(60);
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(ParkingBooking.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ParkingBooking completed = service.checkout("booking-1", "user-1");

        assertEquals("COMPLETED", completed.getBookingStatus());
        assertTrue(completed.getCheckedOutAt() != null);
        assertTrue(completed.getFineAmount() > 0);
    }

    @Test
    void dummyPaymentMarksCompletedBookingAsPaid() {
        ParkingBooking booking = new ParkingBooking();
        booking.setId("booking-1");
        booking.setUserId("user-1");
        booking.setBookingStatus("COMPLETED");
        booking.setEstimatedPrice(120);
        booking.setFineAmount(70);
        booking.setPaymentStatus("UNPAID");
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(ParkingBooking.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ParkingBooking paid = service.pay("booking-1", "user-1");

        assertEquals("PAID", paid.getPaymentStatus());
        assertEquals("DUMMY", paid.getPaymentMethod());
        assertEquals(190, paid.getPaymentAmount());
    }

    @Test
    void adminBookingTotalsIncludeCurrentFineForOverdueApprovedBookings() {
        LocalDateTime expiredAt = LocalDateTime.now().minusMinutes(45);
        ParkingBooking booking = new ParkingBooking();
        booking.setUserId("user-1");
        booking.setBookingStatus("APPROVED");
        booking.setParkingDate(expiredAt.toLocalDate());
        booking.setExitTime(expiredAt.toLocalTime());
        booking.setVehicleType("CAR");
        booking.setFineAmount(0);
        when(bookingRepository.findAll()).thenReturn(List.of(booking));

        List<ParkingBooking> adminBookings = service.getAdminBookings();

        assertEquals(210, adminBookings.get(0).getFineAmount());
    }

    @Test
    void calculatesFineForEachStartedTwentyMinuteInterval() {
        LocalDate date = LocalDate.of(2025, 1, 1);
        LocalDateTime scheduledExit = LocalDateTime.of(date, LocalTime.of(10, 0));

        assertEquals(
                0,
                ParkingBookingService.calculateLateFine(
                        date, LocalTime.of(10, 0), scheduledExit, "BIKE"));
        assertEquals(
                50,
                ParkingBookingService.calculateLateFine(
                        date, LocalTime.of(10, 0), scheduledExit.plusMinutes(20), "BIKE"));
        assertEquals(
                100,
                ParkingBookingService.calculateLateFine(
                        date, LocalTime.of(10, 0), scheduledExit.plusMinutes(20).plusSeconds(1), "BIKE"));
        assertEquals(
                70,
                ParkingBookingService.calculateLateFine(
                        date, LocalTime.of(10, 0), scheduledExit.plusMinutes(20), "CAR"));
    }

    @Test
    void approvedBookingRemainsReservedAfterBookedExitUntilCheckout() {
        ParkingBooking booking = new ParkingBooking();
        booking.setBookingStatus("APPROVED");
        booking.setParkingDate(LocalDate.of(2025, 1, 1));
        booking.setEntryTime(LocalTime.of(10, 0));
        booking.setExitTime(LocalTime.of(11, 0));

        assertTrue(booking.overlapsActiveReservation(
                LocalDateTime.of(2025, 1, 1, 10, 30),
                LocalDateTime.of(2025, 1, 1, 10, 45),
                LocalDateTime.of(2025, 1, 1, 10, 30)));
        assertFalse(booking.overlapsActiveReservation(
                LocalDateTime.of(2025, 1, 1, 14, 0),
                LocalDateTime.of(2025, 1, 1, 15, 0),
                LocalDateTime.of(2025, 1, 1, 10, 30)));
        assertTrue(booking.overlapsActiveReservation(
                LocalDateTime.of(2025, 1, 1, 14, 0),
                LocalDateTime.of(2025, 1, 1, 15, 0),
                LocalDateTime.of(2025, 1, 1, 12, 0)));

        booking.setCheckedOutAt(LocalDateTime.of(2025, 1, 1, 12, 30));
        assertFalse(booking.overlapsActiveReservation(
                LocalDateTime.of(2025, 1, 1, 14, 0),
                LocalDateTime.of(2025, 1, 1, 15, 0),
                LocalDateTime.of(2025, 1, 1, 12, 30)));
    }
}
