package com.company.ems.dto;

import com.company.ems.entity.Employee;
import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeeResponse(
        Long id, String firstName, String lastName, String email, String role,
        String phone, String designation, BigDecimal salary, LocalDate joiningDate,
        int leaveBalance, Long departmentId, String departmentName,
        Long managerId, String managerName) {

    public static EmployeeResponse from(Employee e) {
        var dept = e.getDepartment();
        var mgr = e.getManager();
        return new EmployeeResponse(
                e.getId(), e.getFirstName(), e.getLastName(),
                e.getUser().getEmail(), e.getUser().getRole().name(),
                e.getPhone(), e.getDesignation(), e.getSalary(), e.getJoiningDate(),
                e.getLeaveBalance(),
                dept != null ? dept.getId() : null,
                dept != null ? dept.getName() : null,
                mgr != null ? mgr.getId() : null,
                mgr != null ? mgr.getFirstName() + " " + mgr.getLastName() : null);
    }
}