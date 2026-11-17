package com.smartpark.controller;

import com.smartpark.dto.CreateParkingBookingRequest;
import com.smartpark.dto.BookingUserActionRequest;
import com.smartpark.model.ParkingBooking;
import com.smartpark.service.ParkingBookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parking/bookings")
@CrossOrigin(origins = "*")
public class ParkingController {

    private final ParkingBookingService bookingService;

    public ParkingController(ParkingBookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ParkingBooking requestBooking(@Valid @RequestBody CreateParkingBookingRequest request) {
        return bookingService.createRequest(request);
    }

    @GetMapping("/user/{userId}")
    public List<ParkingBooking> getUserBookings(@PathVariable String userId) {
        return bookingService.getUserBookings(userId);
    }

    @PostMapping("/{bookingId}/checkout")
    public ParkingBooking checkout(
            @PathVariable String bookingId,
            @Valid @RequestBody BookingUserActionRequest request) {
        return bookingService.checkout(bookingId, request.userId());
    }

    @PostMapping("/{bookingId}/payment")
    public ParkingBooking pay(
            @PathVariable String bookingId,
            @Valid @RequestBody BookingUserActionRequest request) {
        return bookingService.pay(bookingId, request.userId());
    }
}
