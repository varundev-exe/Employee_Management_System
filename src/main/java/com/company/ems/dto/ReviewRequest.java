package com.company.ems.dto;

import jakarta.validation.constraints.Size;

public record ReviewRequest(@Size(max = 500) String comment) {}