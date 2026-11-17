package com.smartpark.model;

public class Vehicle {

    private String vehicleType;
    private String vehicleNumber;

    public Vehicle() {
    }

    public Vehicle(String vehicleType, String vehicleNumber) {
        this.vehicleType = vehicleType;
        this.vehicleNumber = vehicleNumber;
    }

    public String getVehicleType() {
        return vehicleType;
    }

    public void setVehicleType(String vehicleType) {
        this.vehicleType = vehicleType;
    }

    public String getVehicleNumber() {
        return vehicleNumber;
    }

    public void setVehicleNumber(String vehicleNumber) {
        this.vehicleNumber = vehicleNumber;
    }
}
