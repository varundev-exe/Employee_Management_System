package com.company.ems.service;

import com.company.ems.dto.DepartmentRequest;
import com.company.ems.dto.DepartmentResponse;
import com.company.ems.entity.Department;
import com.company.ems.exception.ResourceNotFoundException;
import com.company.ems.repository.DepartmentRepository;
import com.company.ems.repository.EmployeeRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;

    public DepartmentService(DepartmentRepository departmentRepository,
                             EmployeeRepository employeeRepository) {
        this.departmentRepository = departmentRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> getAll() {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : employeeRepository.countByDepartment()) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return departmentRepository.findAll(Sort.by("name")).stream()
                .map(d -> DepartmentResponse.from(d, counts.getOrDefault(d.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public DepartmentResponse getById(Long id) {
        Department d = findOrThrow(id);
        return DepartmentResponse.from(d, employeeRepository.countByDepartmentId(id));
    }

    @Transactional
    public DepartmentResponse create(DepartmentRequest req) {
        String name = req.name().trim();
        if (departmentRepository.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A department named '" + name + "' already exists");
        }
        Department d = departmentRepository.save(Department.builder()
                .name(name).description(req.description()).build());
        return DepartmentResponse.from(d, 0);
    }

    @Transactional
    public DepartmentResponse update(Long id, DepartmentRequest req) {
        Department d = findOrThrow(id);
        String name = req.name().trim();
        if (departmentRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A department named '" + name + "' already exists");
        }
        d.setName(name);
        d.setDescription(req.description());
        return DepartmentResponse.from(d, employeeRepository.countByDepartmentId(id));
    }

    @Transactional
    public void delete(Long id) {
        Department d = findOrThrow(id);
        if (employeeRepository.existsByDepartmentId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Move this department's employees elsewhere before deleting it");
        }
        departmentRepository.delete(d);
    }

    private Department findOrThrow(Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + id));
    }
}