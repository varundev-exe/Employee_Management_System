package com.company.ems;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class EmsApiTests {

    @Autowired WebApplicationContext context;
    MockMvc mvc;
    String admin;

    @BeforeEach
    void setUp() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        admin = login("admin@company.com", "Admin@123");
    }

    // ---------- helpers ----------

    private String json(String... kv) {
        StringBuilder sb = new StringBuilder("{");
        for (int i = 0; i < kv.length; i += 2) {
            if (i > 0) sb.append(",");
            sb.append("\"").append(kv[i]).append("\":\"").append(kv[i + 1]).append("\"");
        }
        return sb.append("}").toString();
    }

    private MockHttpServletRequestBuilder withBody(MockHttpServletRequestBuilder b, String token, String body) {
        b.contentType(MediaType.APPLICATION_JSON).content(body);
        return token == null ? b : b.header("Authorization", "Bearer " + token);
    }

    private String grab(String body, String regex) {
        Matcher m = Pattern.compile(regex).matcher(body);
        if (!m.find()) throw new AssertionError("Pattern " + regex + " not found in: " + body);
        return m.group(1);
    }

    private String login(String email, String password) throws Exception {
        String body = mvc.perform(withBody(post("/api/auth/login"), null,
                        json("email", email, "password", password)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return grab(body, "\"token\":\"([^\"]+)\"");
    }

    /** Registers a user with a unique email and returns that email. */
    private String register(String role, String first) throws Exception {
        String email = first.toLowerCase() + "-" + UUID.randomUUID().toString().substring(0, 6) + "@test.com";
        mvc.perform(withBody(post("/api/auth/register"), admin,
                        json("email", email, "password", "Password@123", "role", role,
                                "firstName", first, "lastName", "Test")))
                .andExpect(status().isCreated());
        return email;
    }

    private long myId(String token) throws Exception {
        String body = mvc.perform(get("/api/employees/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return Long.parseLong(grab(body, "\"id\":(\\d+)"));
    }

    private void assign(long employeeId, long managerId) throws Exception {
        mvc.perform(put("/api/employees/" + employeeId + "/assignment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"managerId\":" + managerId + ",\"departmentId\":1}")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk());
    }

    // ---------- auth ----------

    @Test
    void wrongPasswordIs401() throws Exception {
        mvc.perform(withBody(post("/api/auth/login"), null,
                        json("email", "admin@company.com", "password", "wrong")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registerRules() throws Exception {
        String bad = json("email", "x@test.com", "password", "Password@123", "role", "EMPLOYEE",
                "firstName", "X", "lastName", "Y");
        mvc.perform(withBody(post("/api/auth/register"), null, bad)).andExpect(status().isUnauthorized());

        String managerToken = login(register("MANAGER", "Mia"), "Password@123");
        mvc.perform(withBody(post("/api/auth/register"), managerToken, bad)).andExpect(status().isForbidden());

        String email = register("EMPLOYEE", "Dup");
        mvc.perform(withBody(post("/api/auth/register"), admin,
                        json("email", email, "password", "Password@123", "role", "EMPLOYEE",
                                "firstName", "D", "lastName", "D")))
                .andExpect(status().isConflict());

        mvc.perform(withBody(post("/api/auth/register"), admin,
                        json("email", "short@test.com", "password", "123", "role", "EMPLOYEE",
                                "firstName", "S", "lastName", "S")))
                .andExpect(status().isBadRequest());
    }

    // ---------- employees ----------

    @Test
    void employeeListRules() throws Exception {
        String empToken = login(register("EMPLOYEE", "Emp"), "Password@123");
        mvc.perform(get("/api/employees").header("Authorization", "Bearer " + empToken))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/employees")).andExpect(status().isUnauthorized());

        mvc.perform(get("/api/employees?size=1000").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.size").value(100));

        mvc.perform(get("/api/employees?sort=password,asc").header("Authorization", "Bearer " + admin))
                .andExpect(status().isBadRequest());

        mvc.perform(get("/api/employees/99999").header("Authorization", "Bearer " + admin))
                .andExpect(status().isNotFound());
    }

    @Test
    void managerSeesOnlyTheirTeam() throws Exception {
        String mgrEmail = register("MANAGER", "Boss");
        String mgrToken = login(mgrEmail, "Password@123");
        String eliEmail = register("EMPLOYEE", "Eli");
        register("EMPLOYEE", "Outsider");

        assign(myId(login(eliEmail, "Password@123")), myId(mgrToken));

        mvc.perform(get("/api/employees").header("Authorization", "Bearer " + mgrToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].firstName").value("Eli"));

        mvc.perform(get("/api/employees/1").header("Authorization", "Bearer " + mgrToken))
                .andExpect(status().isForbidden());
    }

    // ---------- departments ----------

    @Test
    void departmentRules() throws Exception {
        String name = "Dept" + UUID.randomUUID().toString().substring(0, 5);
        mvc.perform(withBody(post("/api/departments"), admin, json("name", name)))
                .andExpect(status().isCreated());
        mvc.perform(withBody(post("/api/departments"), admin, json("name", name.toLowerCase())))
                .andExpect(status().isConflict());
        mvc.perform(withBody(post("/api/departments"), admin, json("name", "")))
                .andExpect(status().isBadRequest());

        String empToken = login(register("EMPLOYEE", "Dee"), "Password@123");
        mvc.perform(withBody(post("/api/departments"), empToken, json("name", "Nope")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/departments").header("Authorization", "Bearer " + empToken))
                .andExpect(status().isOk());
    }

    // ---------- attendance ----------
    // Match these to your AttendanceController. Check-in/out may be PUT instead of POST.
    private static final String CHECK_IN = "/api/attendance/check-in";
    private static final String CHECK_OUT = "/api/attendance/check-out";
    private static final String MY_HISTORY = "/api/attendance/me";
    private static final String EMPLOYEE_HISTORY = "/api/attendance/employee/";

    private String bearer(String token) {
        return "Bearer " + token;
    }

    @Test
    void attendanceFlow() throws Exception {
        String empToken = login(register("EMPLOYEE", "Punch"), "Password@123");

        // check-out before check-in
        mvc.perform(post(CHECK_OUT).header("Authorization", bearer(empToken)))
                .andExpect(status().isBadRequest());

        // check-in works once, then conflicts
        mvc.perform(post(CHECK_IN).header("Authorization", bearer(empToken)))
                .andExpect(status().is2xxSuccessful());
        mvc.perform(post(CHECK_IN).header("Authorization", bearer(empToken)))
                .andExpect(status().isConflict());

        // check-out works once, then conflicts
        mvc.perform(post(CHECK_OUT).header("Authorization", bearer(empToken)))
                .andExpect(status().is2xxSuccessful());
        mvc.perform(post(CHECK_OUT).header("Authorization", bearer(empToken)))
                .andExpect(status().isConflict());

        // today's record shows in my history
        mvc.perform(get(MY_HISTORY).header("Authorization", bearer(empToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // 'from' after 'to'
        mvc.perform(get(MY_HISTORY + "?from=2026-02-01&to=2026-01-01")
                        .header("Authorization", bearer(empToken)))
                .andExpect(status().isBadRequest());

        // no token
        mvc.perform(post(CHECK_IN)).andExpect(status().isUnauthorized());
    }

    @Test
    void attendanceVisibility() throws Exception {
        String mgrToken = login(register("MANAGER", "Chief"), "Password@123");
        String empToken = login(register("EMPLOYEE", "Member"), "Password@123");
        String outsiderToken = login(register("EMPLOYEE", "Stranger"), "Password@123");
        long mgrId = myId(mgrToken);
        long empId = myId(empToken);
        long outsiderId = myId(outsiderToken);
        assign(empId, mgrId);

        // employees can't use the employee-history endpoint at all (they use /me)
        mvc.perform(get(EMPLOYEE_HISTORY + empId).header("Authorization", bearer(empToken)))
                .andExpect(status().isForbidden());
        mvc.perform(get(EMPLOYEE_HISTORY + outsiderId).header("Authorization", bearer(empToken)))
                .andExpect(status().isForbidden());

        // manager: own team yes, outsider no
        mvc.perform(get(EMPLOYEE_HISTORY + empId).header("Authorization", bearer(mgrToken)))
                .andExpect(status().isOk());
        mvc.perform(get(EMPLOYEE_HISTORY + outsiderId).header("Authorization", bearer(mgrToken)))
                .andExpect(status().isForbidden());

        // admin: anyone, and unknown id is 404
        mvc.perform(get(EMPLOYEE_HISTORY + outsiderId).header("Authorization", bearer(admin)))
                .andExpect(status().isOk());
        mvc.perform(get(EMPLOYEE_HISTORY + 99999).header("Authorization", bearer(admin)))
                .andExpect(status().isNotFound());
    }

    // ---------- search and filter (Phase 8 gaps) ----------

    @Test
    void searchAndDepartmentFilter() throws Exception {
        String mgrToken = login(register("MANAGER", "Head"), "Password@123");
        String unique = "Srch" + UUID.randomUUID().toString().substring(0, 5);
        String empToken = login(register("EMPLOYEE", unique), "Password@123");

        // search by first name, case-insensitive
        mvc.perform(get("/api/employees?search=" + unique.toUpperCase())
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        // not in department 1 yet
        mvc.perform(get("/api/employees?departmentId=1&search=" + unique)
                        .header("Authorization", bearer(admin)))
                .andExpect(jsonPath("$.totalElements").value(0));

        assign(myId(empToken), myId(mgrToken));   // assign() puts them in department 1

        mvc.perform(get("/api/employees?departmentId=1&search=" + unique)
                        .header("Authorization", bearer(admin)))
                .andExpect(jsonPath("$.totalElements").value(1));

        // nonexistent department matches nobody
        mvc.perform(get("/api/employees?departmentId=99999&search=" + unique)
                        .header("Authorization", bearer(admin)))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    // ---------- leave ----------

    @Test
    void leaveFlow() throws Exception {
        String mgrToken = login(register("MANAGER", "Lead"), "Password@123");
        String empToken = login(register("EMPLOYEE", "Worker"), "Password@123");
        assign(myId(empToken), myId(mgrToken));

        LocalDate monday = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY)).plusWeeks(1);
        String leave = "{\"leaveType\":\"CASUAL\",\"startDate\":\"" + monday
                + "\",\"endDate\":\"" + monday.plusDays(2) + "\",\"reason\":\"Trip\"}";

        String created = mvc.perform(post("/api/leaves").contentType(MediaType.APPLICATION_JSON)
                        .content(leave).header("Authorization", "Bearer " + empToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.days").value(3))
                .andReturn().getResponse().getContentAsString();
        String id = grab(created, "\"id\":(\\d+)");

        // overlapping request
        mvc.perform(post("/api/leaves").contentType(MediaType.APPLICATION_JSON)
                        .content(leave).header("Authorization", "Bearer " + empToken))
                .andExpect(status().isConflict());

        // employee cannot approve
        mvc.perform(put("/api/leaves/" + id + "/approve").header("Authorization", "Bearer " + empToken))
                .andExpect(status().isForbidden());

        // manager approves
        mvc.perform(put("/api/leaves/" + id + "/approve").header("Authorization", "Bearer " + mgrToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // balance deducted
        mvc.perform(get("/api/employees/me").header("Authorization", "Bearer " + empToken))
                .andExpect(jsonPath("$.leaveBalance").value(17));

        // second approval and cancel both conflict
        mvc.perform(put("/api/leaves/" + id + "/approve").header("Authorization", "Bearer " + mgrToken))
                .andExpect(status().isConflict());
        mvc.perform(put("/api/leaves/" + id + "/cancel").header("Authorization", "Bearer " + empToken))
                .andExpect(status().isConflict());
    }
}