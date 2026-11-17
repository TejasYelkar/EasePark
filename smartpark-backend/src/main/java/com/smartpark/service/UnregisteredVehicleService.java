package com.smartpark.service;

import com.smartpark.dto.CreateUnregisteredVehicleRequest;
import com.smartpark.model.UnregisteredVehicle;
import com.smartpark.repository.UnregisteredVehicleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class UnregisteredVehicleService {

    private final UnregisteredVehicleRepository repository;

    public UnregisteredVehicleService(UnregisteredVehicleRepository repository) {
        this.repository = repository;
    }

    public UnregisteredVehicle create(CreateUnregisteredVehicleRequest request) {
        String plateNumber = normalizePlateNumber(request.plateNumber());
        if (repository.findByPlateNumber(plateNumber).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This vehicle has already been added as an unregistered vehicle.");
        }

        UnregisteredVehicle vehicle = new UnregisteredVehicle();
        vehicle.setPlateNumber(plateNumber);
        vehicle.setOwnerName(request.ownerName().trim());
        vehicle.setMobileNumber(request.mobileNumber().trim());
        vehicle.setVehicleType(request.vehicleType().trim());
        return repository.save(vehicle);
    }

    private String normalizePlateNumber(String plateNumber) {
        return plateNumber.toUpperCase(Locale.ROOT).replaceAll("[\\s-]", "");
    }
}
