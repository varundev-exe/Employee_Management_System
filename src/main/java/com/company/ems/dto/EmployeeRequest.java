package com.company.ems.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeeRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @Size(max = 20) String phone,
        String designation,
        @PositiveOrZero BigDecimal salary,
        @PastOrPresent LocalDate joiningDate) {}