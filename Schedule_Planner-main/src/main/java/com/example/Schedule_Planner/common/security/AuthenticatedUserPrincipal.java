package com.example.Schedule_Planner.common.security;

import com.example.Schedule_Planner.auth.entity.SystemRole;

import java.util.UUID;

public record AuthenticatedUserPrincipal(
        UUID id,
        String email,
        SystemRole systemRole,
        UUID employeeId
) {
}
