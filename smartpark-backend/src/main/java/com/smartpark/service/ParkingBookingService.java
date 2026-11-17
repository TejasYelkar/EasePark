package com.smartpark.service;

import com.smartpark.dto.CreateParkingBookingRequest;
import com.smartpark.model.ParkingBooking;
import com.smartpark.model.ParkingSlot;
import com.smartpark.model.User;
import com.smartpark.model.Vehicle;
import com.smartpark.repository.ParkingBookingRepository;
import com.smartpark.repository.ParkingSlotRepository;
import com.smartpark.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

@Service
public class ParkingBookingService {

    private static final int CAR_RATE_PER_HOUR = 30;
    private static final int BIKE_RATE_PER_HOUR = 20;
    private static final int CAR_LATE_FINE_PER_INTERVAL = 70;
    private static final int BIKE_LATE_FINE_PER_INTERVAL = 50;
    private static final int LATE_FINE_INTERVAL_MINUTES = 20;

    private final ParkingBookingRepository bookingRepository;
    private final ParkingSlotRepository slotRepository;
    private final UserRepository userRepository;

    public ParkingBookingService(
            ParkingBookingRepository bookingRepository,
            ParkingSlotRepository slotRepository,
            UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.slotRepository = slotRepository;
        this.userRepository = userRepository;
    }

    public ParkingBooking createRequest(CreateParkingBookingRequest request) {
        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Register an account before requesting a parking slot."));

        String vehicleNumber = normalizeVehicleNumber(request.vehicleNumber());
        boolean vehicleRegistered = user.getVehicles().stream()
                .anyMatch(vehicle -> matchesVehicle(vehicle, request.vehicleType(), vehicleNumber));
        if (!vehicleRegistered) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "This vehicle is not registered to your account.");
        }

        ParkingSlot.SlotType requestedSlotType;
        int ratePerHour;
        if ("4 Wheeler".equals(request.vehicleType())) {
            requestedSlotType = ParkingSlot.SlotType.CAR;
            ratePerHour = CAR_RATE_PER_HOUR;
        } else if ("2 Wheeler".equals(request.vehicleType())) {
            requestedSlotType = ParkingSlot.SlotType.BIKE;
            ratePerHour = BIKE_RATE_PER_HOUR;
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported vehicle type.");
        }

        ParkingSlot slot = slotRepository.findBySlotNumber(request.slotId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parking slot not found."));
        if (slot.getSlotType() != requestedSlotType ||
                slot.getStatus() != ParkingSlot.SlotStatus.AVAILABLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This parking slot is unavailable.");
        }

        LocalDateTime entry = LocalDateTime.of(request.parkingDate(), request.entryTime());
        LocalDateTime exit = LocalDateTime.of(request.parkingDate(), request.exitTime());
        if (!exit.isAfter(entry)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exit time must be later than entry time.");
        }
        if (!entry.isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Entry time must be in the future.");
        }

        if (hasApprovedConflict(slot.getSlotNumber(), entry, exit, LocalDateTime.now())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This slot already has a booking request for an overlapping time.");
        }

        long billableHours = Math.max(1, (long) Math.ceil(
                ChronoUnit.MINUTES.between(request.entryTime(), request.exitTime()) / 60.0));

        ParkingBooking booking = new ParkingBooking();
        booking.setUserId(user.getId());
        booking.setUsername(user.getUsername());
        booking.setUserEmail(user.getEmail());
        booking.setSlotId(slot.getSlotNumber());
        booking.setVehicleNumber(vehicleNumber);
        booking.setFloorNumber(slot.getFloorNumber());
        booking.setVehicleType(requestedSlotType.name());
        booking.setParkingDate(request.parkingDate());
        booking.setEntryTime(request.entryTime());
        booking.setExitTime(request.exitTime());
        booking.setBookingStatus("PENDING");
        booking.setEstimatedPrice(Math.toIntExact(billableHours * ratePerHour));
        booking.setFineAmount(0);
        booking.setPaymentStatus("UNPAID");
        booking.setCreatedAt(LocalDateTime.now());
        booking.setNotificationRead(false);

        return bookingRepository.save(booking);
    }

    public List<ParkingBooking> getPendingRequests() {
        return bookingRepository.findByBookingStatusOrderByCreatedAtDesc("PENDING");
    }

    public List<ParkingBooking> getAdminBookings() {
        LocalDateTime now = LocalDateTime.now();
        return bookingRepository.findAll().stream()
                .peek(booking -> updateCurrentFine(booking, now))
                .toList();
    }

    public List<ParkingBooking> getUserBookings(String userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Registered user not found.");
        }

        LocalDateTime now = LocalDateTime.now();
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .peek(booking -> updateCurrentFine(booking, now))
                .toList();
    }

    public ParkingBooking decide(String bookingId, String decision) {
        ParkingBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking request not found."));
        if (!"PENDING".equals(booking.getBookingStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This booking request has already been reviewed.");
        }

        if ("APPROVE".equals(decision)) {
            LocalDateTime entry = LocalDateTime.of(booking.getParkingDate(), booking.getEntryTime());
            LocalDateTime exit = LocalDateTime.of(booking.getParkingDate(), booking.getExitTime());
            if (hasApprovedConflict(booking.getSlotId(), entry, exit, LocalDateTime.now())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Another active booking now overlaps this time slot.");
            }
            booking.setBookingStatus("APPROVED");
        } else if ("REJECT".equals(decision)) {
            booking.setBookingStatus("REJECTED");
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Decision must be APPROVE or REJECT.");
        }

        return bookingRepository.save(booking);
    }

    public ParkingBooking checkout(String bookingId, String userId) {
        ParkingBooking booking = findOwnedBooking(bookingId, userId);
        if (!"APPROVED".equals(booking.getBookingStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Only an approved booking can be checked out.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime entry = LocalDateTime.of(booking.getParkingDate(), booking.getEntryTime());
        if (now.isBefore(entry)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "The booked parking time has not started yet.");
        }

        booking.setCheckedOutAt(now);
        booking.setFineAmount(calculateLateFine(
                booking.getParkingDate(),
                booking.getExitTime(),
                now,
                booking.getVehicleType()));
        booking.setBookingStatus("COMPLETED");
        return bookingRepository.save(booking);
    }

    public ParkingBooking pay(String bookingId, String userId) {
        ParkingBooking booking = findOwnedBooking(bookingId, userId);
        if (!"COMPLETED".equals(booking.getBookingStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Checkout must be completed before payment.");
        }
        if (!"PAID".equals(booking.getPaymentStatus())) {
            booking.setPaymentAmount(
                    (booking.getEstimatedPrice() == null ? 0 : booking.getEstimatedPrice()) +
                            (booking.getFineAmount() == null ? 0 : booking.getFineAmount()));
            booking.setPaymentStatus("PAID");
            booking.setPaymentMethod("DUMMY");
            booking.setPaidAt(LocalDateTime.now());
            return bookingRepository.save(booking);
        }
        return booking;
    }

    public static int calculateLateFine(
            LocalDate parkingDate,
            LocalTime exitTime,
            LocalDateTime actualExit,
            String vehicleType) {
        LocalDateTime scheduledExit = LocalDateTime.of(parkingDate, exitTime);
        long lateSeconds = Duration.between(scheduledExit, actualExit).getSeconds();
        if (lateSeconds <= 0) {
            return 0;
        }

        int finePerInterval = switch (vehicleType) {
            case "CAR" -> CAR_LATE_FINE_PER_INTERVAL;
            case "BIKE" -> BIKE_LATE_FINE_PER_INTERVAL;
            default -> throw new IllegalStateException("Unsupported vehicle type for fine calculation.");
        };
        long fineIntervals = (long) Math.ceil(
                lateSeconds / (double) (LATE_FINE_INTERVAL_MINUTES * 60));
        return Math.toIntExact(fineIntervals * finePerInterval);
    }

    private ParkingBooking findOwnedBooking(String bookingId, String userId) {
        ParkingBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Booking request not found."));
        if (!userId.equals(booking.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This booking belongs to another user.");
        }
        return booking;
    }

    private void updateCurrentFine(ParkingBooking booking, LocalDateTime now) {
        if (booking.getFineAmount() == null) {
            booking.setFineAmount(0);
        }
        if (booking.getPaymentStatus() == null) {
            booking.setPaymentStatus("UNPAID");
        }
        if ("APPROVED".equals(booking.getBookingStatus()) &&
                booking.getCheckedOutAt() == null) {
            booking.setFineAmount(calculateLateFine(
                    booking.getParkingDate(),
                    booking.getExitTime(),
                    now,
                    booking.getVehicleType()));
        }
    }

    private boolean hasApprovedConflict(
            String slotId,
            LocalDateTime requestedStart,
            LocalDateTime requestedEnd,
            LocalDateTime now) {
        return bookingRepository.findByBookingStatus("APPROVED").stream()
                .filter(booking -> slotId.equals(booking.getSlotId()))
                .anyMatch(booking ->
                        booking.overlapsActiveReservation(requestedStart, requestedEnd, now));
    }

    private boolean matchesVehicle(Vehicle vehicle, String type, String number) {
        return vehicle != null &&
                type.equals(vehicle.getVehicleType()) &&
                vehicle.getVehicleNumber() != null &&
                normalizeVehicleNumber(vehicle.getVehicleNumber()).equals(number);
    }

    private String normalizeVehicleNumber(String vehicleNumber) {
        return vehicleNumber.toUpperCase(Locale.ROOT).replaceAll("[\\s-]", "");
    }
}
