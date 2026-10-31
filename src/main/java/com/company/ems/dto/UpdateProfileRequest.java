package com.company.ems.dto;

import jakarta.validation.constraints.*;

public record UpdateProfileRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @Size(max = 20) String phone) {}