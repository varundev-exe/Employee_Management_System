package com.company.ems.dto;

import com.company.ems.entity.LeaveType;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record LeaveApplyRequest(
        @NotNull LeaveType leaveType,
        @NotNull @FutureOrPresent LocalDate startDate,
        @NotNull LocalDate endDate,
        @Size(max = 500) String reason) {}