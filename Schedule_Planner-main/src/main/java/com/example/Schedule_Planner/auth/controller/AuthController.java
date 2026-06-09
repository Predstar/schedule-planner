package com.example.Schedule_Planner.auth.controller;

import com.example.Schedule_Planner.auth.dto.LoginRequest;
import com.example.Schedule_Planner.auth.dto.LoginResponse;
import com.example.Schedule_Planner.auth.dto.UserResponse;
import com.example.Schedule_Planner.auth.service.AuthService;
import com.example.Schedule_Planner.common.security.AuthenticatedUserPrincipal;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request.email(), request.password());
    }

    @GetMapping("/me")
    public UserResponse getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        AuthenticatedUserPrincipal principal = authentication != null
                && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal authenticatedUserPrincipal
                ? authenticatedUserPrincipal
                : null;
        return authService.getCurrentUser(principal);
    }
}
