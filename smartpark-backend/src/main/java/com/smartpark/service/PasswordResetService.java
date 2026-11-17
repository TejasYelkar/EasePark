package com.smartpark.service;

import com.smartpark.dto.PasswordResetConfirmation;
import com.smartpark.dto.PasswordResetRequest;
import com.smartpark.model.User;
import com.smartpark.repository.UserRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

@Service
public class PasswordResetService {

    private static final Duration CODE_LIFETIME = Duration.ofMinutes(10);
    private static final Duration SEND_COOLDOWN = Duration.ofMinutes(1);
    private static final int MAX_CODE_ATTEMPTS = 5;
    private static final String INVALID_CODE_MESSAGE = "The reset code is invalid or expired.";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String mailHost;
    private final String mailFrom;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${spring.mail.host:}") String mailHost,
            @Value("${smartpark.mail.from:}") String mailFrom) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSenderProvider = mailSenderProvider;
        this.mailHost = mailHost;
        this.mailFrom = mailFrom;
    }

    public void requestReset(PasswordResetRequest request) {
        JavaMailSender mailSender = getConfiguredMailSender();
        Optional<User> matchingUser =
                userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()));
        if (matchingUser.isEmpty()) {
            return;
        }

        User user = matchingUser.get();
        LocalDateTime now = LocalDateTime.now();
        if (user.getPasswordResetSentAt() != null &&
                user.getPasswordResetSentAt().plus(SEND_COOLDOWN).isAfter(now)) {
            return;
        }

        String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(user.getEmail());
        message.setSubject("EasyPark password reset code");
        message.setText(
                "Your EasyPark password reset code is " + code +
                        ". It expires in 10 minutes. If you did not request this, ignore this email.");
        try {
            mailSender.send(message);
        } catch (MailException error) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Could not send the password reset email. Please try again later.");
        }

        user.setPasswordResetCodeHash(passwordEncoder.encode(code));
        user.setPasswordResetExpiresAt(now.plus(CODE_LIFETIME));
        user.setPasswordResetSentAt(now);
        user.setPasswordResetAttempts(0);
        userRepository.save(user);
    }

    public void confirmReset(PasswordResetConfirmation request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        INVALID_CODE_MESSAGE));
        LocalDateTime now = LocalDateTime.now();
        if (user.getPasswordResetCodeHash() == null ||
                user.getPasswordResetExpiresAt() == null ||
                !user.getPasswordResetExpiresAt().isAfter(now) ||
                user.getPasswordResetAttempts() >= MAX_CODE_ATTEMPTS) {
            clearResetState(user);
            userRepository.save(user);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_CODE_MESSAGE);
        }

        if (!passwordEncoder.matches(request.code(), user.getPasswordResetCodeHash())) {
            int attempts = user.getPasswordResetAttempts() + 1;
            if (attempts >= MAX_CODE_ATTEMPTS) {
                clearResetState(user);
            } else {
                user.setPasswordResetAttempts(attempts);
            }
            userRepository.save(user);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_CODE_MESSAGE);
        }

        if (request.newPassword().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must be no longer than 72 UTF-8 bytes.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        clearResetState(user);
        userRepository.save(user);
    }

    private JavaMailSender getConfiguredMailSender() {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailHost.isBlank() || mailFrom.isBlank() || mailSender == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Password reset email is not configured on the server.");
        }
        return mailSender;
    }

    private void clearResetState(User user) {
        user.setPasswordResetCodeHash(null);
        user.setPasswordResetExpiresAt(null);
        user.setPasswordResetAttempts(0);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
