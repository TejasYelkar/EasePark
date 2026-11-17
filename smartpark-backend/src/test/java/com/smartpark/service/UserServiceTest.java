package com.smartpark.service;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.smartpark.dto.CreateUserRequest;
import com.smartpark.dto.LoginUserRequest;
import com.smartpark.dto.RegisterUserRequest;
import com.smartpark.dto.VerifyRegisteredUserRequest;
import com.smartpark.model.User;
import com.smartpark.model.Vehicle;
import com.smartpark.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserServiceTest {

    private UserRepository repository;
    private UserService service;
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        repository = mock(UserRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        service = new UserService(repository, passwordEncoder);
    }

    @Test
    void registrationStoresBcryptHashAndHidesItFromJson() throws Exception {
        when(repository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.empty());
        when(repository.findByUsernameIgnoreCase("user")).thenReturn(Optional.empty());
        when(repository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User registered = service.register(new CreateUserRequest(
                "user",
                "USER@example.com",
                "9876543210",
                List.of(new RegisterUserRequest.RegisteredVehicle("2 Wheeler", "MH03AQ7091")),
                "password-123"));

        assertNotEquals("password-123", registered.getPasswordHash());
        assertTrue(passwordEncoder.matches("password-123", registered.getPasswordHash()));
        assertTrue(User.class.getMethod("getPasswordHash").isAnnotationPresent(JsonIgnore.class));
    }

    @Test
    void loginAcceptsMatchingPasswordAndRegisteredVehicle() {
        User user = new User();
        user.setId("user-1");
        user.setUsername("tejas");
        user.setPasswordHash(passwordEncoder.encode("password-123"));
        user.setVehicles(List.of(new Vehicle("2 Wheeler", "MH03AQ7091")));
        when(repository.findByUsernameIgnoreCase("tejas")).thenReturn(Optional.of(user));

        User authenticated = service.authenticate(new LoginUserRequest(
                "tejas",
                "password-123",
                "2 Wheeler",
                "mh03 aq-7091"));

        assertSame(user, authenticated);
    }

    @Test
    void loginRejectsIncorrectPassword() {
        User user = new User();
        user.setUsername("tejas");
        user.setPasswordHash(passwordEncoder.encode("password-123"));
        user.setVehicles(List.of(new Vehicle("2 Wheeler", "MH03AQ7091")));
        when(repository.findByUsernameIgnoreCase("tejas")).thenReturn(Optional.of(user));

        assertThrows(
                ResponseStatusException.class,
                () -> service.authenticate(new LoginUserRequest(
                        "tejas",
                        "wrong-password",
                        "2 Wheeler",
                        "MH03AQ7091")));
    }

    @Test
    void verifiesRegisteredVehicleByUsername() {
        User user = new User();
        user.setId("user-1");
        user.setUsername("tejas");
        user.setVehicles(List.of(new Vehicle("2 Wheeler", "MH03AQ7091")));
        when(repository.findByUsernameIgnoreCase("tejas")).thenReturn(Optional.of(user));

        User verified = service.verifyRegisteredVehicle(new VerifyRegisteredUserRequest(
                null,
                "tejas",
                "2 Wheeler",
                "mh03 aq-7091"));

        assertSame(user, verified);
        assertEquals("user-1", verified.getId());
    }

    @Test
    void rejectsVehicleNotRegisteredToAccount() {
        User user = new User();
        user.setId("user-1");
        user.setVehicles(List.of(new Vehicle("2 Wheeler", "MH03AQ7091")));
        when(repository.findById("user-1")).thenReturn(Optional.of(user));

        assertThrows(
                ResponseStatusException.class,
                () -> service.verifyRegisteredVehicle(new VerifyRegisteredUserRequest(
                        "user-1",
                        "tejas",
                        "4 Wheeler",
                        "MH03AQ7091")));
    }
}
