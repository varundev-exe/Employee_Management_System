package com.company.ems.controller;

import com.company.ems.dto.*;
import com.company.ems.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springdoc.core.annotations.ParameterObject;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping("/me")
    public EmployeeResponse me(Authentication auth) {
        return employeeService.getMyProfile(auth);
    }

    @PutMapping("/me")
    public EmployeeResponse updateMe(Authentication auth, @Valid @RequestBody UpdateProfileRequest req) {
        return employeeService.updateMyProfile(auth, req);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public PageResponse<EmployeeResponse> getAll(
            Authentication auth,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) String search,
            @ParameterObject @PageableDefault(size = 10, sort = "id") Pageable pageable) {
        return employeeService.getAll(auth, departmentId, search, pageable);
    }

    @GetMapping("/{id}")
    public EmployeeResponse getById(@PathVariable Long id, Authentication auth) {
        return employeeService.getById(id, auth);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public EmployeeResponse update(@PathVariable Long id, @Valid @RequestBody EmployeeRequest req) {
        return employeeService.update(id, req);
    }

    @PutMapping("/{id}/assignment")
    @PreAuthorize("hasRole('ADMIN')")
    public EmployeeResponse assign(@PathVariable Long id, @RequestBody AssignmentRequest req) {
        return employeeService.assign(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        employeeService.delete(id, auth);
        return ResponseEntity.noContent().build();
    }
}