package com.smartpark.repository;

import com.smartpark.model.ParkingBooking;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface ParkingBookingRepository extends MongoRepository<ParkingBooking, String> {

    List<ParkingBooking> findByBookingStatusOrderByCreatedAtDesc(String bookingStatus);

    List<ParkingBooking> findByBookingStatus(String bookingStatus);

    List<ParkingBooking> findByUserIdOrderByCreatedAtDesc(String userId);

    List<ParkingBooking> findByParkingDateAndBookingStatusInAndEntryTimeLessThanAndExitTimeGreaterThan(
            LocalDate parkingDate,
            List<String> bookingStatuses,
            LocalTime requestedExitTime,
            LocalTime requestedEntryTime);

    boolean existsBySlotIdAndParkingDateAndBookingStatusInAndEntryTimeLessThanAndExitTimeGreaterThan(
            String slotId,
            LocalDate parkingDate,
            List<String> bookingStatuses,
            LocalTime requestedExitTime,
            LocalTime requestedEntryTime);

    boolean existsBySlotIdAndParkingDateAndBookingStatusInAndEntryTimeLessThanAndExitTimeGreaterThanAndIdNot(
            String slotId,
            LocalDate parkingDate,
            List<String> bookingStatuses,
            LocalTime requestedExitTime,
            LocalTime requestedEntryTime,
            String excludedBookingId);
}
