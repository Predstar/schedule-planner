package com.example.Schedule_Planner.auth.dto;

public record LoginResponse(
        String accessToken,
        String tokenType,
        UserResponse user
) {
}
