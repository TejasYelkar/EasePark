package com.smartpark.controller;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiValidationExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Map<String, Object> handleMethodArgumentNotValid(MethodArgumentNotValidException exception) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
                fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return Map.of(
                "message", "Please correct the highlighted fields.",
                "fieldErrors", fieldErrors,
                "status", HttpStatus.BAD_REQUEST.value());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public Map<String, Object> handleConstraintViolation(ConstraintViolationException exception) {
        return Map.of(
                "message", "Please correct the highlighted fields.",
                "status", HttpStatus.BAD_REQUEST.value());
    }
}
