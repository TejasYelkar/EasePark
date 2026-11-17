
package com.smartpark.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Document(collection = "parking_bookings")
public class ParkingBooking {

    @Id
    private String id;

    private String userId;
    private String username;
    private String userEmail;
    private String slotId;
    private String vehicleNumber;

    private Integer floorNumber;
    private String vehicleType;

    private LocalDate parkingDate;
    private LocalTime entryTime;
    private LocalTime exitTime;

    private String bookingStatus;
    private Integer estimatedPrice;
    private Integer fineAmount = 0;
    private Integer paymentAmount;
    private String paymentStatus = "UNPAID";
    private String paymentMethod;
    private LocalDateTime checkedOutAt;
    private LocalDateTime paidAt;
    private boolean notificationRead;

    private LocalDateTime createdAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getSlotId() {
        return slotId;
    }

    public void setSlotId(String slotId) {
        this.slotId = slotId;
    }

    public String getVehicleNumber() {
        return vehicleNumber;
    }

    public void setVehicleNumber(String vehicleNumber) {
        this.vehicleNumber = vehicleNumber;
    }

    public Integer getFloorNumber() {
        return floorNumber;
    }

    public void setFloorNumber(Integer floorNumber) {
        this.floorNumber = floorNumber;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public LocalDate getParkingDate() {
        return parkingDate;
    }

    public void setParkingDate(LocalDate parkingDate) {
        this.parkingDate = parkingDate;
    }

    public LocalTime getEntryTime() {
        return entryTime;
    }

    public void setEntryTime(LocalTime entryTime) {
        this.entryTime = entryTime;
    }

    public LocalTime getExitTime() {
        return exitTime;
    }

    public void setExitTime(LocalTime exitTime) {
        this.exitTime = exitTime;
    }

    public String getBookingStatus() {
        return bookingStatus;
    }

    public void setBookingStatus(String bookingStatus) {
        this.bookingStatus = bookingStatus;
    }

    public Integer getEstimatedPrice() {
        return estimatedPrice;
    }

    public void setEstimatedPrice(Integer estimatedPrice) {
        this.estimatedPrice = estimatedPrice;
    }

    public Integer getFineAmount() {
        return fineAmount;
    }

    public void setFineAmount(Integer fineAmount) {
        this.fineAmount = fineAmount;
    }

    public Integer getPaymentAmount() {
        return paymentAmount;
    }

    public void setPaymentAmount(Integer paymentAmount) {
        this.paymentAmount = paymentAmount;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public LocalDateTime getCheckedOutAt() {
        return checkedOutAt;
    }

    public void setCheckedOutAt(LocalDateTime checkedOutAt) {
        this.checkedOutAt = checkedOutAt;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }

    public boolean isNotificationRead() {
        return notificationRead;
    }

    public void setNotificationRead(boolean notificationRead) {
        this.notificationRead = notificationRead;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public boolean overlapsActiveReservation(
            LocalDateTime requestedStart,
            LocalDateTime requestedEnd,
            LocalDateTime now) {
        if (!"APPROVED".equals(bookingStatus) ||
                checkedOutAt != null ||
                parkingDate == null ||
                entryTime == null ||
                exitTime == null) {
            return false;
        }

        LocalDateTime reservationStart = parkingDate.atTime(entryTime);
        LocalDateTime reservationEnd = parkingDate.atTime(exitTime);
        boolean overdueAndStillParked =
                !now.isBefore(reservationEnd) && now.isAfter(reservationStart);

        if (overdueAndStillParked) {
            return requestedEnd.isAfter(reservationStart);
        }
        return requestedStart.isBefore(reservationEnd) &&
                requestedEnd.isAfter(reservationStart);
    }
}
