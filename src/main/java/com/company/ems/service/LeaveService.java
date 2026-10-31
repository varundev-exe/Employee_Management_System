package com.company.ems.service;

import com.company.ems.dto.LeaveApplyRequest;
import com.company.ems.dto.LeaveResponse;
import com.company.ems.entity.*;
import com.company.ems.exception.ResourceNotFoundException;
import com.company.ems.repository.EmployeeRepository;
import com.company.ems.repository.LeaveRequestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
public class LeaveService {

    private final LeaveRequestRepository leaveRepository;
    private final EmployeeRepository employeeRepository;

    public LeaveService(LeaveRequestRepository leaveRepository,
                        EmployeeRepository employeeRepository) {
        this.leaveRepository = leaveRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional
    public LeaveResponse apply(Authentication auth, LeaveApplyRequest req) {
        Employee me = currentEmployee(auth);

        if (req.endDate().isBefore(req.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "End date must not be before start date");
        }

        int days = (int) req.startDate().datesUntil(req.endDate().plusDays(1))
                .filter(d -> d.getDayOfWeek() != DayOfWeek.SATURDAY
                        && d.getDayOfWeek() != DayOfWeek.SUNDAY)
                .count();
        if (days == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "The selected dates contain no working days");
        }
        if (days > me.getLeaveBalance()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Insufficient leave balance: requested " + days
                            + ", available " + me.getLeaveBalance());
        }

        boolean overlaps = leaveRepository
                .existsByEmployeeIdAndStatusInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        me.getId(), Set.of(LeaveStatus.PENDING, LeaveStatus.APPROVED),
                        req.endDate(), req.startDate());
        if (overlaps) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You already have a pending or approved leave in these dates");
        }

        LeaveRequest leave = LeaveRequest.builder()
                .employee(me)
                .leaveType(req.leaveType())
                .startDate(req.startDate())
                .endDate(req.endDate())
                .days(days)
                .reason(req.reason())
                .status(LeaveStatus.PENDING)
                .createdAt(Instant.now())
                .build();
        return LeaveResponse.from(leaveRepository.save(leave));
    }

    @Transactional
    public LeaveResponse cancel(Long id, Authentication auth) {
        LeaveRequest leave = findOrThrow(id);
        if (!leave.getEmployee().getId().equals(currentEmployee(auth).getId())) {
            throw new AccessDeniedException("You can only cancel your own leave requests");
        }
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only pending requests can be cancelled");
        }
        leave.setStatus(LeaveStatus.CANCELLED);
        return LeaveResponse.from(leave);
    }

    @Transactional
    public LeaveResponse approve(Long id, Authentication auth, String comment) {
        return review(id, auth, comment, LeaveStatus.APPROVED);
    }

    @Transactional
    public LeaveResponse reject(Long id, Authentication auth, String comment) {
        return review(id, auth, comment, LeaveStatus.REJECTED);
    }

    @Transactional(readOnly = true)
    public List<LeaveResponse> myLeaves(Authentication auth) {
        return leaveRepository.findByEmployeeIdOrderByStartDateDesc(currentEmployee(auth).getId())
                .stream().map(LeaveResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<LeaveResponse> pending(Authentication auth) {
        List<LeaveRequest> list = isAdmin(auth)
                ? leaveRepository.findByStatusOrderByCreatedAtAsc(LeaveStatus.PENDING)
                : leaveRepository.findByEmployeeManagerIdAndStatusOrderByCreatedAtAsc(
                currentEmployee(auth).getId(), LeaveStatus.PENDING);
        return list.stream().map(LeaveResponse::from).toList();
    }

    // ---- helpers ----

    private LeaveResponse review(Long id, Authentication auth, String comment, LeaveStatus newStatus) {
        LeaveRequest leave = findOrThrow(id);
        Employee reviewer = currentEmployee(auth);
        Employee requester = leave.getEmployee();

        if (requester.getId().equals(reviewer.getId())) {
            throw new AccessDeniedException("You cannot review your own leave request");
        }
        if (!isAdmin(auth)) {
            Employee requesterManager = requester.getManager();
            if (requesterManager == null || !requesterManager.getId().equals(reviewer.getId())) {
                throw new AccessDeniedException("This employee is not on your team");
            }
        }
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This request has already been " + leave.getStatus().name().toLowerCase());
        }

        if (newStatus == LeaveStatus.APPROVED) {
            if (leave.getDays() > requester.getLeaveBalance()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Employee no longer has enough leave balance");
            }
            requester.setLeaveBalance(requester.getLeaveBalance() - leave.getDays());
        }

        leave.setStatus(newStatus);
        leave.setReviewedBy(reviewer);
        leave.setReviewComment(comment);
        return LeaveResponse.from(leave);
    }

    private LeaveRequest findOrThrow(Long id) {
        return leaveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request not found: " + id));
    }

    private Employee currentEmployee(Authentication auth) {
        return employeeRepository.findByUserEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No employee profile for " + auth.getName()));
    }

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}