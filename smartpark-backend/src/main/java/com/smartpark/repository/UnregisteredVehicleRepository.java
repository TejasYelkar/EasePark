package com.smartpark.repository;

import com.smartpark.model.UnregisteredVehicle;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UnregisteredVehicleRepository extends MongoRepository<UnregisteredVehicle, String> {

    Optional<UnregisteredVehicle> findByPlateNumber(String plateNumber);
}
