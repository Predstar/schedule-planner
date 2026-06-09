package com.example.Schedule_Planner.auth.service;

import com.example.Schedule_Planner.auth.dto.LoginResponse;
import com.example.Schedule_Planner.auth.dto.UserResponse;
import com.example.Schedule_Planner.auth.entity.User;
import com.example.Schedule_Planner.auth.exception.InvalidCredentialsException;
import com.example.Schedule_Planner.auth.repository.UserRepository;
import com.example.Schedule_Planner.common.security.AuthenticatedUserPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(String email, String password) {
        User user = authenticateUser(email, password);
        return new LoginResponse(
                jwtTokenService.generateToken(user),
                "Bearer",
                toLoginUserResponse(user)
        );
    }

    @Transactional(readOnly = true)
    public UserResponse authenticate(String email, String password) {
        return toAuthenticatedUserResponse(authenticateUser(email, password));
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(AuthenticatedUserPrincipal principal) {
        if (principal == null) {
            throw new InvalidCredentialsException();
        }

        return new UserResponse(
                principal.id(),
                principal.email(),
                principal.systemRole(),
                principal.employeeId(),
                null
        );
    }

    private User authenticateUser(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        return user;
    }

    private UserResponse toAuthenticatedUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getSystemRole(),
                user.getEmployeeId(),
                null
        );
    }

    private UserResponse toLoginUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getSystemRole(),
                null,
                null
        );
    }
}
