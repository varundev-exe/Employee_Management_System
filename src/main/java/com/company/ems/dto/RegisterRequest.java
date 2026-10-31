package com.company.ems.dto;

import com.company.ems.entity.Role;
import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "must be at least 8 characters") String password,
        @NotNull Role role,
        @NotBlank String firstName,
        @NotBlank String lastName) {}