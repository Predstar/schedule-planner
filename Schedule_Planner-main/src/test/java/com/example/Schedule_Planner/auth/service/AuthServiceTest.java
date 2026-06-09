package com.example.Schedule_Planner.auth.service;

import com.example.Schedule_Planner.auth.dto.LoginResponse;
import com.example.Schedule_Planner.auth.dto.UserResponse;
import com.example.Schedule_Planner.auth.entity.SystemRole;
import com.example.Schedule_Planner.auth.entity.User;
import com.example.Schedule_Planner.auth.exception.InvalidCredentialsException;
import com.example.Schedule_Planner.auth.repository.UserRepository;
import com.example.Schedule_Planner.common.security.AuthenticatedUserPrincipal;
import com.example.Schedule_Planner.common.security.JwtProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AuthServiceTest {

    private UserRepositoryDouble userRepositoryDouble;
    private PasswordEncoderDouble passwordEncoderDouble;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepositoryDouble = new UserRepositoryDouble();
        passwordEncoderDouble = new PasswordEncoderDouble();
        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setSecret("test-secret-key-which-is-long-enough");
        jwtProperties.setExpirationSeconds(3600);
        authService = new AuthService(
                userRepositoryDouble.proxy(),
                passwordEncoderDouble.proxy(),
                new JwtTokenService(
                        jwtProperties,
                        new ObjectMapper(),
                        Clock.fixed(Instant.parse("2026-06-08T12:00:00Z"), ZoneOffset.UTC)
                )
        );
    }

    @Test
    void shouldAuthenticateUserWhenEmailAndPasswordAreValid() throws Exception {
        UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        UUID employeeId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        User user = new User(
                "employee@restaurant.com",
                "stored-hash",
                SystemRole.EMPLOYEE,
                employeeId,
                true
        );
        setUserId(user, userId);

        userRepositoryDouble.userByEmail = user;
        passwordEncoderDouble.matchesResult = true;

        UserResponse authenticatedUser = authService.authenticate(
                "employee@restaurant.com",
                "plain-password"
        );

        assertEquals(userId, authenticatedUser.id());
        assertEquals("employee@restaurant.com", authenticatedUser.email());
        assertEquals(SystemRole.EMPLOYEE, authenticatedUser.systemRole());
        assertEquals(employeeId, authenticatedUser.employeeId());
        assertEquals(null, authenticatedUser.active());
        assertEquals("employee@restaurant.com", userRepositoryDouble.lastFindByEmailArgument);
        assertEquals(1, userRepositoryDouble.findByEmailCalls);
        assertEquals("plain-password", passwordEncoderDouble.lastRawPassword);
        assertEquals("stored-hash", passwordEncoderDouble.lastEncodedPassword);
        assertEquals(1, passwordEncoderDouble.matchesCalls);
    }

    @Test
    void shouldReturnLoginResponseWithJwtTokenWhenCredentialsAreValid() throws Exception {
        UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        User user = new User(
                "manager@restaurant.com",
                "stored-hash",
                SystemRole.MANAGER,
                UUID.fromString("33333333-3333-3333-3333-333333333333"),
                true
        );
        setUserId(user, userId);
        userRepositoryDouble.userByEmail = user;
        passwordEncoderDouble.matchesResult = true;

        LoginResponse response = authService.login("manager@restaurant.com", "plain-password");

        assertEquals(3, response.accessToken().split("\\.").length);
        assertEquals("Bearer", response.tokenType());
        assertEquals(userId, response.user().id());
        assertEquals("manager@restaurant.com", response.user().email());
        assertEquals(SystemRole.MANAGER, response.user().systemRole());
        assertEquals(null, response.user().employeeId());
        assertEquals(null, response.user().active());
    }

    @Test
    void shouldThrowInvalidCredentialsWhenEmailDoesNotExist() {
        InvalidCredentialsException exception = assertThrows(
                InvalidCredentialsException.class,
                () -> authService.authenticate("missing@restaurant.com", "plain-password")
        );

        assertEquals("Invalid email or password.", exception.getMessage());
        assertEquals("missing@restaurant.com", userRepositoryDouble.lastFindByEmailArgument);
        assertEquals(1, userRepositoryDouble.findByEmailCalls);
        assertEquals(0, passwordEncoderDouble.matchesCalls);
    }

    @Test
    void shouldThrowInvalidCredentialsWhenPasswordDoesNotMatch() throws Exception {
        UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        User user = new User(
                "manager@restaurant.com",
                "stored-hash",
                SystemRole.MANAGER,
                null,
                true
        );
        setUserId(user, userId);
        userRepositoryDouble.userByEmail = user;
        passwordEncoderDouble.matchesResult = false;

        InvalidCredentialsException exception = assertThrows(
                InvalidCredentialsException.class,
                () -> authService.authenticate("manager@restaurant.com", "wrong-password")
        );

        assertEquals("Invalid email or password.", exception.getMessage());
        assertEquals("manager@restaurant.com", userRepositoryDouble.lastFindByEmailArgument);
        assertEquals(1, userRepositoryDouble.findByEmailCalls);
        assertEquals("wrong-password", passwordEncoderDouble.lastRawPassword);
        assertEquals("stored-hash", passwordEncoderDouble.lastEncodedPassword);
        assertEquals(1, passwordEncoderDouble.matchesCalls);
    }

    @Test
    void shouldReturnCurrentUserFromAuthenticatedPrincipal() {
        UserResponse response = authService.getCurrentUser(new AuthenticatedUserPrincipal(
                UUID.fromString("11111111-1111-1111-1111-111111111111"),
                "employee@restaurant.com",
                SystemRole.EMPLOYEE,
                UUID.fromString("22222222-2222-2222-2222-222222222222")
        ));

        assertEquals("11111111-1111-1111-1111-111111111111", response.id().toString());
        assertEquals("employee@restaurant.com", response.email());
        assertEquals(SystemRole.EMPLOYEE, response.systemRole());
        assertEquals("22222222-2222-2222-2222-222222222222", response.employeeId().toString());
        assertEquals(null, response.active());
    }

    private void setUserId(User user, UUID id) throws Exception {
        Field idField = User.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(user, id);
    }

    private static final class UserRepositoryDouble {
        private User userByEmail;
        private int findByEmailCalls;
        private String lastFindByEmailArgument;

        private UserRepository proxy() {
            return (UserRepository) Proxy.newProxyInstance(
                    UserRepository.class.getClassLoader(),
                    new Class<?>[]{UserRepository.class},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "findByEmail" -> {
                            findByEmailCalls++;
                            lastFindByEmailArgument = (String) args[0];
                            yield Optional.ofNullable(userByEmail);
                        }
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
        private int matchesCalls;
        private String lastRawPassword;
        private String lastEncodedPassword;

        private PasswordEncoder proxy() {
            return (PasswordEncoder) Proxy.newProxyInstance(
                    PasswordEncoder.class.getClassLoader(),
                    new Class<?>[]{PasswordEncoder.class},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "matches" -> {
                            matchesCalls++;
                            lastRawPassword = (String) args[0];
                            lastEncodedPassword = (String) args[1];
                            yield matchesResult;
                        }
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
