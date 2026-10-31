package com.company.ems.dto;

import com.company.ems.entity.LeaveRequest;

import java.time.Instant;
import java.time.LocalDate;

public record LeaveResponse(
        Long id, Long employeeId, String employeeName, String leaveType,
        LocalDate startDate, LocalDate endDate, int days, String reason,
        String status, String reviewedByName, String reviewComment, Instant createdAt) {

    public static LeaveResponse from(LeaveRequest l) {
        var e = l.getEmployee();
        var r = l.getReviewedBy();
        return new LeaveResponse(
                l.getId(), e.getId(), e.getFirstName() + " " + e.getLastName(),
                l.getLeaveType().name(), l.getStartDate(), l.getEndDate(), l.getDays(),
                l.getReason(), l.getStatus().name(),
                r != null ? r.getFirstName() + " " + r.getLastName() : null,
                l.getReviewComment(), l.getCreatedAt());
    }
}