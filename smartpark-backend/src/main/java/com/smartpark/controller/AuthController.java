package com.smartpark.controller;

import com.smartpark.dto.CreateUserRequest;
import com.smartpark.dto.LoginUserRequest;
import com.smartpark.dto.PasswordResetConfirmation;
import com.smartpark.dto.PasswordResetRequest;
import com.smartpark.dto.RegisterUserRequest;
import com.smartpark.dto.VerifyRegisteredUserRequest;
import com.smartpark.model.User;
import com.smartpark.service.UserService;
import com.smartpark.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;
    private final PasswordResetService passwordResetService;

    public AuthController(UserService userService, PasswordResetService passwordResetService) {
        this.userService = userService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public User register(@Valid @RequestBody CreateUserRequest request) {
        return userService.register(request);
    }

    @PostMapping("/login")
    public User login(@Valid @RequestBody LoginUserRequest request) {
        return userService.authenticate(request);
    }

    @PostMapping("/password-reset/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        passwordResetService.requestReset(request);
    }

    @PostMapping("/password-reset/confirm")
    public void confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmation request) {
        passwordResetService.confirmReset(request);
    }

    @PostMapping("/verify")
    public User verifyRegisteredVehicle(@Valid @RequestBody VerifyRegisteredUserRequest request) {
        return userService.verifyRegisteredVehicle(request);
    }

    @PutMapping("/{userId}")
    public User updateProfile(
            @PathVariable String userId,
            @Valid @RequestBody RegisterUserRequest request) {
        return userService.update(userId, request);
    }
}
