package com.example.Schedule_Planner.common.security;

public interface JwtTokenServiceFacade {

    AuthenticatedUserPrincipal parseToken(String token);
}
