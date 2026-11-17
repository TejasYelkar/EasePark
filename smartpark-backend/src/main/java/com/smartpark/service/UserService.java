package com.smartpark.service;

import com.smartpark.dto.CreateUserRequest;
import com.smartpark.dto.LoginUserRequest;
import com.smartpark.dto.RegisterUserRequest;
import com.smartpark.dto.VerifyRegisteredUserRequest;
import com.smartpark.model.User;
import com.smartpark.model.Vehicle;
import com.smartpark.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.nio.charset.StandardCharsets;

@Service
public class UserService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    public User register(CreateUserRequest request) {
        String email = normalizeEmail(request.email());
        if (repository.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This email is already registered.");
        }
        if (repository.findByUsernameIgnoreCase(request.username().trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This username is already registered.");
        }

        User user = new User();
        updateUser(user, request.username(), email, request.phone(), request.vehicles());
        user.setPasswordHash(encodePassword(request.password()));
        return repository.save(user);
    }

    public User update(String userId, RegisterUserRequest request) {
        User user = repository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registered user not found."));
        String email = normalizeEmail(request.email());

        repository.findByEmailIgnoreCase(email)
                .filter(existing -> !existing.getId().equals(userId))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "This email is already registered.");
                });
        repository.findByUsernameIgnoreCase(request.username().trim())
                .filter(existing -> !existing.getId().equals(userId))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "This username is already registered.");
                });

        updateUser(user, request.username(), email, request.phone(), request.vehicles());
        return repository.save(user);
    }

    public User authenticate(LoginUserRequest request) {
        User user = repository.findByUsernameIgnoreCase(request.username().trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Username, password or vehicle details are incorrect."));
        if (user.getPasswordHash() == null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This account needs a password reset before signing in.");
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Username, password or vehicle details are incorrect.");
        }
        if (!hasRegisteredVehicle(user, request.vehicleType(), request.vehicleNumber())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Username, password or vehicle details are incorrect.");
        }
        return user;
    }

    public User verifyRegisteredVehicle(VerifyRegisteredUserRequest request) {
        User user;
        if (request.userId() != null && !request.userId().isBlank()) {
            user = repository.findById(request.userId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "No registered account was found. Please sign up first."));
        } else {
            user = repository.findByUsernameIgnoreCase(request.username().trim())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "No registered account was found. Please sign up first."));
        }

        if (!hasRegisteredVehicle(user, request.vehicleType(), request.vehicleNumber())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "This vehicle is not registered to the account.");
        }
        return user;
    }

    private void updateUser(
            User user,
            String username,
            String email,
            String phone,
            List<RegisterUserRequest.RegisteredVehicle> registeredVehicles) {
        user.setUsername(username.trim());
        user.setEmail(email);
        user.setPhone(phone.trim());
        List<Vehicle> vehicles = registeredVehicles.stream()
                .map(vehicle -> new Vehicle(
                        vehicle.vehicleType().trim(),
                        normalizeVehicleNumber(vehicle.vehicleNumber())))
                .toList();
        user.setVehicles(vehicles);
    }

    private String encodePassword(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must be no longer than 72 UTF-8 bytes.");
        }
        return passwordEncoder.encode(password);
    }

    private boolean hasRegisteredVehicle(User user, String vehicleType, String vehicleNumber) {
        String normalizedNumber = normalizeVehicleNumber(vehicleNumber);
        return user.getVehicles() != null && user.getVehicles().stream()
                .anyMatch(vehicle -> matchesVehicle(vehicle, vehicleType, normalizedNumber));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeVehicleNumber(String vehicleNumber) {
        return vehicleNumber.toUpperCase(Locale.ROOT).replaceAll("[\\s-]", "");
    }

    private boolean matchesVehicle(Vehicle vehicle, String type, String number) {
        return vehicle != null &&
                type.equals(vehicle.getVehicleType()) &&
                vehicle.getVehicleNumber() != null &&
                normalizeVehicleNumber(vehicle.getVehicleNumber()).equals(number);
    }
}
