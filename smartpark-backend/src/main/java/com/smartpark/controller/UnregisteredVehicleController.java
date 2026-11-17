package com.smartpark.controller;

import com.smartpark.dto.CreateUnregisteredVehicleRequest;
import com.smartpark.model.UnregisteredVehicle;
import com.smartpark.service.UnregisteredVehicleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/unregistered-vehicles")
@CrossOrigin(origins = "*")
public class UnregisteredVehicleController {

    private final UnregisteredVehicleService service;

    public UnregisteredVehicleController(UnregisteredVehicleService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UnregisteredVehicle create(@Valid @RequestBody CreateUnregisteredVehicleRequest request) {
        return service.create(request);
    }
}
