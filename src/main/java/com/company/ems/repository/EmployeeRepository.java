package com.company.ems.repository;

import com.company.ems.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    @Override
    @EntityGraph(attributePaths = {"user", "department", "manager"})
    Optional<Employee> findById(Long id);

    @EntityGraph(attributePaths = {"user", "department", "manager"})
    Optional<Employee> findByUserEmail(String email);

    List<Employee> findByManagerId(Long managerId);

    boolean existsByManagerId(Long managerId);

    boolean existsByDepartmentId(Long departmentId);

    long countByDepartmentId(Long departmentId);

    @Query("select e.department.id, count(e) from Employee e " +
            "where e.department is not null group by e.department.id")
    List<Object[]> countByDepartment();

    @EntityGraph(attributePaths = {"user", "department", "manager"})
    @Query("""
            select e from Employee e
            where (:managerId is null or e.manager.id = :managerId)
              and (:departmentId is null or e.department.id = :departmentId)
              and (lower(e.firstName) like :search
                   or lower(e.lastName) like :search
                   or lower(e.user.email) like :search)
            """)
    Page<Employee> search(@Param("managerId") Long managerId,
                          @Param("departmentId") Long departmentId,
                          @Param("search") String search,
                          Pageable pageable);
}