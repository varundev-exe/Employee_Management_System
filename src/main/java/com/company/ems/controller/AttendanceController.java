package com.company.ems.controller;

import com.company.ems.dto.AttendanceResponse;
import com.company.ems.service.AttendanceService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping("/check-in")
    public ResponseEntity<AttendanceResponse> checkIn(Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(attendanceService.checkIn(auth));
    }

    @PostMapping("/check-out")
    public AttendanceResponse checkOut(Authentication auth) {
        return attendanceService.checkOut(auth);
    }

    @GetMapping("/me")
    public List<AttendanceResponse> myHistory(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return attendanceService.myHistory(auth, from, to);
    }

    @GetMapping("/employee/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public List<AttendanceResponse> employeeHistory(
            @PathVariable Long id, Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return attendanceService.employeeHistory(id, auth, from, to);
    }
}