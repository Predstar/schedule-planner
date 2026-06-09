package com.example.Schedule_Planner.auth.service;

import com.example.Schedule_Planner.auth.entity.SystemRole;
import com.example.Schedule_Planner.auth.entity.User;
import com.example.Schedule_Planner.auth.exception.UserEmailAlreadyExistsException;
import com.example.Schedule_Planner.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Proxy;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

class UserServiceTest {

    private UserRepositoryDouble userRepositoryDouble;
    private PasswordEncoderDouble passwordEncoderDouble;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepositoryDouble = new UserRepositoryDouble();
        passwordEncoderDouble = new PasswordEncoderDouble();
        userService = new UserService(userRepositoryDouble.proxy(), passwordEncoderDouble.proxy());
    }

    @Test
    void shouldCreateUserSuccessfully() {
        User createdUser = userService.createUser(
                "admin@restaurant.com",
                "hashed-password",
                SystemRole.ADMIN,
                null
        );

        assertEquals("admin@restaurant.com", createdUser.getEmail());
        assertEquals("hashed-password", createdUser.getPasswordHash());
        assertEquals(SystemRole.ADMIN, createdUser.getSystemRole());
        assertNull(createdUser.getEmployeeId());
        assertEquals(true, createdUser.isActive());
        assertEquals("admin@restaurant.com", userRepositoryDouble.lastExistsByEmailArgument);
        assertEquals(1, userRepositoryDouble.existsByEmailCalls);
        assertSame(createdUser, userRepositoryDouble.savedUser);
        assertEquals(1, userRepositoryDouble.saveCalls);
    }

    @Test
    void shouldThrowExceptionWhenEmailAlreadyExists() {
        userRepositoryDouble.emailExists = true;

        UserEmailAlreadyExistsException exception = assertThrows(
                UserEmailAlreadyExistsException.class,
                () -> userService.createUser(
                        "duplicate@restaurant.com",
                        "hashed-password",
                        SystemRole.EMPLOYEE,
                        UUID.randomUUID()
                )
        );

        assertEquals("A user with email 'duplicate@restaurant.com' already exists.", exception.getMessage());
        assertEquals("duplicate@restaurant.com", userRepositoryDouble.lastExistsByEmailArgument);
        assertEquals(1, userRepositoryDouble.existsByEmailCalls);
        assertEquals(0, userRepositoryDouble.saveCalls);
    }

    @Test
    void shouldAssignManagerRoleWhenCreatingManagerUser() {
        passwordEncoderDouble.encodedValue = "encoded-password";

        User createdUser = userService.createManagerUser(
                "manager@restaurant.com",
                "temporaryPassword123",
                "Maria",
                "Meyer"
        );

        assertEquals(SystemRole.MANAGER, createdUser.getSystemRole());
        assertEquals("encoded-password", createdUser.getPasswordHash());
        assertNull(createdUser.getEmployeeId());
        assertEquals("temporaryPassword123", passwordEncoderDouble.lastRawPassword);
        assertEquals(1, passwordEncoderDouble.encodeCalls);
        assertSame(createdUser, userRepositoryDouble.savedUser);
    }

    @Test
    void shouldAssignEmployeeRoleWhenCreatingEmployeeUser() {
        UUID employeeId = UUID.randomUUID();

        User createdUser = userService.createUser(
                "employee@restaurant.com",
                "hashed-password",
                SystemRole.EMPLOYEE,
                employeeId
        );

        assertEquals(SystemRole.EMPLOYEE, createdUser.getSystemRole());
        assertEquals(employeeId, createdUser.getEmployeeId());
        assertEquals("employee@restaurant.com", userRepositoryDouble.lastExistsByEmailArgument);
        assertEquals(1, userRepositoryDouble.saveCalls);
    }

    private static final class UserRepositoryDouble {
        private boolean emailExists;
        private int existsByEmailCalls;
        private int saveCalls;
        private String lastExistsByEmailArgument;
        private User savedUser;

        private UserRepository proxy() {
            return (UserRepository) Proxy.newProxyInstance(
                    UserRepository.class.getClassLoader(),
                    new Class<?>[]{UserRepository.class},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "existsByEmail" -> {
                            existsByEmailCalls++;
                            lastExistsByEmailArgument = (String) args[0];
                            yield emailExists;
                        }
                        case "save" -> {
                            saveCalls++;
                            savedUser = (User) args[0];
                            yield savedUser;
                        }
                        case "findByEmail" -> Optional.empty();
                        case "existsByEmployeeId" -> false;
                        case "equals" -> proxy == args[0];
                        case "hashCode" -> System.identityHashCode(proxy);
                        case "toString" -> "UserRepositoryDouble";
                        default -> throw new UnsupportedOperationException(method.getName());
                    }
            );
        }
    }

    private static final class PasswordEncoderDouble {
        private String encodedValue;
        private int encodeCalls;
        private String lastRawPassword;

        private PasswordEncoder proxy() {
            return (PasswordEncoder) Proxy.newProxyInstance(
                    PasswordEncoder.class.getClassLoader(),
                    new Class<?>[]{PasswordEncoder.class},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "encode" -> {
                            encodeCalls++;
                            lastRawPassword = (String) args[0];
                            yield encodedValue != null ? encodedValue : args[0];
                        }
                        case "matches" -> false;
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
