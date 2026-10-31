package com.company.ems.controller;

import com.company.ems.dto.*;
import com.company.ems.service.LeaveService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leaves")
public class LeaveController {

    private final LeaveService leaveService;

    public LeaveController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    @PostMapping
    public ResponseEntity<LeaveResponse> apply(Authentication auth,
                                               @Valid @RequestBody LeaveApplyRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(leaveService.apply(auth, req));
    }

    @GetMapping("/me")
    public List<LeaveResponse> myLeaves(Authentication auth) {
        return leaveService.myLeaves(auth);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public List<LeaveResponse> pending(Authentication auth) {
        return leaveService.pending(auth);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public LeaveResponse approve(@PathVariable Long id, Authentication auth,
                                 @Valid @RequestBody(required = false) ReviewRequest req) {
        return leaveService.approve(id, auth, req != null ? req.comment() : null);
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public LeaveResponse reject(@PathVariable Long id, Authentication auth,
                                @Valid @RequestBody(required = false) ReviewRequest req) {
        return leaveService.reject(id, auth, req != null ? req.comment() : null);
    }

    @PutMapping("/{id}/cancel")
    public LeaveResponse cancel(@PathVariable Long id, Authentication auth) {
        return leaveService.cancel(id, auth);
    }
}