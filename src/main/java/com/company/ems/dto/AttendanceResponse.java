package com.company.ems.dto;

import com.company.ems.entity.Attendance;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;

public record AttendanceResponse(
        Long id, Long employeeId, String employeeName, LocalDate workDate,
        LocalTime checkIn, LocalTime checkOut, String status, Long workedMinutes) {

    public static AttendanceResponse from(Attendance a) {
        var e = a.getEmployee();
        Long worked = a.getCheckOut() != null
                ? Duration.between(a.getCheckIn(), a.getCheckOut()).toMinutes()
                : null;
        return new AttendanceResponse(
                a.getId(), e.getId(), e.getFirstName() + " " + e.getLastName(),
                a.getWorkDate(), a.getCheckIn(), a.getCheckOut(),
                a.getStatus().name(), worked);
    }
}