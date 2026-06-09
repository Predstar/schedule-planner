package com.example.Schedule_Planner.auth.controller;

import com.example.Schedule_Planner.auth.entity.SystemRole;
import com.example.Schedule_Planner.auth.entity.User;
import com.example.Schedule_Planner.auth.repository.UserRepository;
import com.example.Schedule_Planner.auth.service.AuthService;
import com.example.Schedule_Planner.auth.service.JwtTokenService;
import com.example.Schedule_Planner.common.exception.GlobalExceptionHandler;
import com.example.Schedule_Planner.common.security.JwtAuthenticationFilter;
import com.example.Schedule_Planner.common.security.JwtProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest {

    private UserRepositoryDouble userRepositoryDouble;
    private PasswordEncoderDouble passwordEncoderDouble;
    private JwtTokenService jwtTokenService;
    private MockMvc mockMvc;
    private User validUser;

    @BeforeEach
    void setUp() throws Exception {
        userRepositoryDouble = new UserRepositoryDouble();
        passwordEncoderDouble = new PasswordEncoderDouble();

        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setSecret("test-secret-key-which-is-long-enough");
        jwtProperties.setExpirationSeconds(3600);

        jwtTokenService = new JwtTokenService(
                jwtProperties,
                new ObjectMapper(),
                Clock.fixed(Instant.parse("2026-06-08T12:00:00Z"), ZoneOffset.UTC)
        );

        AuthService authService = new AuthService(
                userRepositoryDouble.proxy(),
                passwordEncoderDouble.proxy(),
                jwtTokenService
        );

        validUser = new User(
                "manager@restaurant.com",
                "stored-hash",
                SystemRole.MANAGER,
                UUID.fromString("33333333-3333-3333-3333-333333333333"),
                true
        );
        setUserId(validUser, UUID.fromString("11111111-1111-1111-1111-111111111111"));
        userRepositoryDouble.userByEmail = validUser;

        mockMvc = MockMvcBuilders
                .standaloneSetup(new AuthController(authService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .addFilters(new JwtAuthenticationFilter(jwtTokenService))
                .build();
    }

    @Test
    void shouldReturnUnauthorizedWhenCredentialsAreInvalid() throws Exception {
        passwordEncoderDouble.matchesResult = false;

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "manager@restaurant.com",
                                  "password": "wrong-password"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("Invalid credentials"));
    }

    @Test
    void shouldReturnValidationErrorWhenLoginRequestIsInvalid() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "",
                                  "password": ""
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details.length()").value(2));
    }

    @Test
    void shouldReturnLoginResponseWhenCredentialsAreValid() throws Exception {
        passwordEncoderDouble.matchesResult = true;

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "manager@restaurant.com",
                                  "password": "correct-password"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.user.id").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.user.email").value("manager@restaurant.com"))
                .andExpect(jsonPath("$.user.systemRole").value("MANAGER"))
                .andExpect(jsonPath("$.user.employeeId").doesNotExist())
                .andExpect(jsonPath("$.user.active").doesNotExist());
    }

    @Test
    void shouldReturnCurrentUserWhenBearerTokenIsValid() throws Exception {
        String token = jwtTokenService.generateToken(validUser);

        mockMvc.perform(get("/api/v1/auth/me")
                        .header(AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.email").value("manager@restaurant.com"))
                .andExpect(jsonPath("$.systemRole").value("MANAGER"))
                .andExpect(jsonPath("$.employeeId").value("33333333-3333-3333-3333-333333333333"));
    }

    @Test
    void shouldReturnUnauthorizedWhenBearerTokenIsMissing() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void shouldReturnUnauthorizedWhenBearerTokenIsInvalid() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                        .header(AUTHORIZATION, "Bearer invalid-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    private void setUserId(User user, UUID id) throws Exception {
        Field idField = User.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(user, id);
    }

    private static final class UserRepositoryDouble {
        private User userByEmail;

        private UserRepository proxy() {
            return (UserRepository) Proxy.newProxyInstance(
                    UserRepository.class.getClassLoader(),
                    new Class<?>[]{UserRepository.class},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "findByEmail" -> Optional.ofNullable(userByEmail);
                        case "equals" -> proxy == args[0];
                        case "hashCode" -> System.identityHashCode(proxy);
                        case "toString" -> "UserRepositoryDouble";
                        default -> throw new UnsupportedOperationException(method.getName());
                    }
            );
        }
    }

    private static final class PasswordEncoderDouble {
        private boolean matchesResult;

        private PasswordEncoder proxy() {
            return (PasswordEncoder) Proxy.newProxyInstance(
                    PasswordEncoder.class.getClassLoader(),
                    new Class<?>[]{PasswordEncoder.class},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "matches" -> matchesResult;
                        case "encode" -> args[0];
                        case "upgradeEncoding" -> false;
                        case "equals" -> proxy == args[0];
                        case "hashCode" -> System.identityHashCode(proxy);
                        case "toString" -> "PasswordEncoderDouble";
                        default -> throw new UnsupportedOperationException(method.getName());
                    }
            );
        }
    }
}
