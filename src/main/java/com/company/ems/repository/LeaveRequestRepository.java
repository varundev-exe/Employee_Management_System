package com.company.ems.repository;

import com.company.ems.entity.LeaveRequest;
import com.company.ems.entity.LeaveStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    @EntityGraph(attributePaths = {"employee", "reviewedBy"})
    List<LeaveRequest> findByEmployeeIdOrderByStartDateDesc(Long employeeId);

    @EntityGraph(attributePaths = {"employee", "reviewedBy"})
    List<LeaveRequest> findByStatusOrderByCreatedAtAsc(LeaveStatus status);

    @EntityGraph(attributePaths = {"employee", "reviewedBy"})
    List<LeaveRequest> findByEmployeeManagerIdAndStatusOrderByCreatedAtAsc(Long managerId, LeaveStatus status);

    // true if the employee already has a request in these statuses touching [start, end]
    boolean existsByEmployeeIdAndStatusInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long employeeId, Collection<LeaveStatus> statuses, LocalDate end, LocalDate start);
}