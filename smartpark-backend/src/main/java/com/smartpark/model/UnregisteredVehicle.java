package com.smartpark.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "unregistered_vehicles")
public class UnregisteredVehicle {

    @Id
    private String id;

    @Indexed(unique = true)
    private String plateNumber;

    private String ownerName;
    private String mobileNumber;
    private String vehicleType;
    private boolean temporary = true;

    @CreatedDate
    private LocalDateTime createdAt = LocalDateTime.now();

    public String getId() {
        return id;
    }

    public String getPlateNumber() {
        return plateNumber;
    }

    public void setPlateNumber(String plateNumber) {
        this.plateNumber = plateNumber;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public String getMobileNumber() {
        return mobileNumber;
    }

    public void setMobileNumber(String mobileNumber) {
        this.mobileNumber = mobileNumber;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public boolean isTemporary() {
        return temporary;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
