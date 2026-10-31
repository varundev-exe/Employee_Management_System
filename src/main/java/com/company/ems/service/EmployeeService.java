package com.company.ems.service;

import com.company.ems.dto.*;
import com.company.ems.entity.*;
import com.company.ems.exception.ResourceNotFoundException;
import com.company.ems.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Pageable;
import java.util.Set;

import java.util.List;

@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;

    public EmployeeService(EmployeeRepository employeeRepository,
                           DepartmentRepository departmentRepository,
                           UserRepository userRepository) {
        this.employeeRepository = employeeRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getMyProfile(Authentication auth) {
        return EmployeeResponse.from(currentEmployee(auth));
    }

    @Transactional
    public EmployeeResponse updateMyProfile(Authentication auth, UpdateProfileRequest req) {
        Employee e = currentEmployee(auth);
        e.setFirstName(req.firstName());
        e.setLastName(req.lastName());
        e.setPhone(req.phone());
        return EmployeeResponse.from(e);   // saved automatically when the transaction commits
    }

    @Transactional(readOnly = true)
    public PageResponse<EmployeeResponse> getAll(Authentication auth, Long departmentId,
                                                 String search, Pageable pageable) {
        pageable.getSort().forEach(order -> {
            if (!SORTABLE.contains(order.getProperty())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Cannot sort by '" + order.getProperty() + "'. Allowed: " + SORTABLE);
            }
        });

        Long managerId = hasRole(auth, "ADMIN") ? null : currentEmployee(auth).getId();
        String pattern = (search == null || search.isBlank())
                ? "%" : "%" + search.trim().toLowerCase() + "%";

        return PageResponse.from(
                employeeRepository.search(managerId, departmentId, pattern, pageable)
                        .map(EmployeeResponse::from));
    }

    @Transactional(readOnly = true)
    public EmployeeResponse getById(Long id, Authentication auth) {
        Employee target = findOrThrow(id);
        if (!canView(auth, target)) {
            throw new AccessDeniedException("Not allowed to view this employee");
        }
        return EmployeeResponse.from(target);
    }

    @Transactional
    public EmployeeResponse update(Long id, EmployeeRequest req) {
        Employee e = findOrThrow(id);
        e.setFirstName(req.firstName());
        e.setLastName(req.lastName());
        e.setPhone(req.phone());
        e.setDesignation(req.designation());
        e.setSalary(req.salary());
        e.setJoiningDate(req.joiningDate());
        return EmployeeResponse.from(e);
    }

    @Transactional
    public EmployeeResponse assign(Long id, AssignmentRequest req) {
        Employee e = findOrThrow(id);

        if (req.managerId() == null) {
            e.setManager(null);
        } else {
            if (req.managerId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "An employee cannot be their own manager");
            }
            Employee manager = findOrThrow(req.managerId());
            if (manager.getUser().getRole() != Role.MANAGER) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "The chosen manager must have the MANAGER role");
            }
            e.setManager(manager);
        }

        if (req.departmentId() == null) {
            e.setDepartment(null);
        } else {
            e.setDepartment(departmentRepository.findById(req.departmentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Department not found: " + req.departmentId())));
        }
        return EmployeeResponse.from(e);
    }

    @Transactional
    public void delete(Long id, Authentication auth) {
        Employee e = findOrThrow(id);

        if (e.getId().equals(currentEmployee(auth).getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "You cannot delete your own account");
        }
        if (employeeRepository.existsByManagerId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Reassign this manager's team before deleting");
        }
        User user = e.getUser();
        employeeRepository.delete(e);
        employeeRepository.flush();      // surface FK errors (attendance/leave rows) now
        userRepository.delete(user);
    }

    // ---- helpers ----

    private Employee findOrThrow(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + id));
    }

    private Employee currentEmployee(Authentication auth) {
        return employeeRepository.findByUserEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("No employee profile for " + auth.getName()));
    }

    private boolean hasRole(Authentication auth, String role) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_" + role));
    }

    private boolean canView(Authentication auth, Employee target) {
        if (hasRole(auth, "ADMIN")) return true;
        Employee me = currentEmployee(auth);
        if (me.getId().equals(target.getId())) return true;
        return hasRole(auth, "MANAGER")
                && target.getManager() != null
                && target.getManager().getId().equals(me.getId());
    }
    private static final Set<String> SORTABLE =
            Set.of("id", "firstName", "lastName", "designation", "salary", "joiningDate");
}