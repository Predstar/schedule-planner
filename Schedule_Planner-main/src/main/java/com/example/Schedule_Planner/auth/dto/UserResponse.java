package com.example.Schedule_Planner.auth.dto;

import com.example.Schedule_Planner.auth.entity.SystemRole;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserResponse(
        UUID id,
        String email,
        SystemRole systemRole,
        UUID employeeId,
        Boolean active
) {
}
