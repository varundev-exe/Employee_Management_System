package com.company.ems.dto;

import com.company.ems.entity.Department;

public record DepartmentResponse(Long id, String name, String description, long employeeCount) {

    public static DepartmentResponse from(Department d, long employeeCount) {
        return new DepartmentResponse(d.getId(), d.getName(), d.getDescription(), employeeCount);
    }
}