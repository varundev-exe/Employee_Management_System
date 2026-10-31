package com.company.ems.dto;

public record AuthResponse(String token, String email, String role) {}