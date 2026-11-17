package com.smartpark.controller;

import com.smartpark.dto.BookingDecisionRequest;
import com.smartpark.model.ParkingBooking;
import com.smartpark.model.User;
import com.smartpark.repository.UserRepository;
import com.smartpark.service.ParkingBookingService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private final ParkingBookingService bookingService;
    private final UserRepository userRepository;

    public AdminController(
            ParkingBookingService bookingService,
            UserRepository userRepository) {
        this.bookingService = bookingService;
        this.userRepository = userRepository;
    }

    @GetMapping("/notifications")
    public List<ParkingBooking> getPendingBookingNotifications() {
        return bookingService.getPendingRequests();
    }

    @GetMapping("/bookings")
    public List<ParkingBooking> getBookings() {
        return bookingService.getAdminBookings();
    }

    @GetMapping("/users")
    public List<User> getUsers() {
        return userRepository.findAll();
    }

    @PostMapping("/notifications/{bookingId}/decision")
    public ParkingBooking decideBooking(
            @PathVariable String bookingId,
            @Valid @RequestBody BookingDecisionRequest request) {
        return bookingService.decide(bookingId, request.decision());
    }
}
