package com.company.ems.service;

import com.company.ems.dto.AttendanceResponse;
import com.company.ems.entity.*;
import com.company.ems.exception.ResourceNotFoundException;
import com.company.ems.repository.AttendanceRepository;
import com.company.ems.repository.EmployeeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class AttendanceService {

    // Check-ins after this time are marked LATE
    private static final LocalTime LATE_AFTER = LocalTime.of(9, 30);

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;

    public AttendanceService(AttendanceRepository attendanceRepository,
                             EmployeeRepository employeeRepository) {
        this.attendanceRepository = attendanceRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional
    public AttendanceResponse checkIn(Authentication auth) {
        Employee me = currentEmployee(auth);
        LocalDate today = LocalDate.now();

        if (attendanceRepository.findByEmployeeIdAndWorkDate(me.getId(), today).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already checked in today");
        }

        LocalTime now = LocalTime.now().withNano(0);
        Attendance a = Attendance.builder()
                .employee(me)
                .workDate(today)
                .checkIn(now)
                .status(now.isAfter(LATE_AFTER) ? AttendanceStatus.LATE : AttendanceStatus.PRESENT)
                .build();
        return AttendanceResponse.from(attendanceRepository.save(a));
    }

    @Transactional
    public AttendanceResponse checkOut(Authentication auth) {
        Employee me = currentEmployee(auth);
        Attendance a = attendanceRepository
                .findByEmployeeIdAndWorkDate(me.getId(), LocalDate.now())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "You have not checked in today"));

        if (a.getCheckOut() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already checked out today");
        }
        a.setCheckOut(LocalTime.now().withNano(0));
        return AttendanceResponse.from(a);   // saved when the transaction commits
    }

    @Transactional(readOnly = true)
    public List<AttendanceResponse> myHistory(Authentication auth, LocalDate from, LocalDate to) {
        return history(currentEmployee(auth).getId(), from, to);
    }

    @Transactional(readOnly = true)
    public List<AttendanceResponse> employeeHistory(Long id, Authentication auth,
                                                    LocalDate from, LocalDate to) {
        Employee target = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + id));

        boolean admin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!admin) {
            Employee me = currentEmployee(auth);
            boolean isMine = me.getId().equals(target.getId());
            boolean isMyTeam = target.getManager() != null
                    && target.getManager().getId().equals(me.getId());
            if (!isMine && !isMyTeam) {
                throw new AccessDeniedException("Not allowed to view this employee's attendance");
            }
        }
        return history(id, from, to);
    }

    // ---- helpers ----

    private List<AttendanceResponse> history(Long employeeId, LocalDate from, LocalDate to) {
        LocalDate end = to != null ? to : LocalDate.now();
        LocalDate start = from != null ? from : end.minusDays(30);
        if (start.isAfter(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "'from' must not be after 'to'");
        }
        return attendanceRepository
                .findByEmployeeIdAndWorkDateBetweenOrderByWorkDateDesc(employeeId, start, end)
                .stream().map(AttendanceResponse::from).toList();
    }

    private Employee currentEmployee(Authentication auth) {
        return employeeRepository.findByUserEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No employee profile for " + auth.getName()));
    }
}