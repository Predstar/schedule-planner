package com.example.Schedule_Planner.auth.controller;

import com.example.Schedule_Planner.auth.entity.SystemRole;
import com.example.Schedule_Planner.auth.entity.User;
import com.example.Schedule_Planner.auth.mapper.UserMapperImpl;
import com.example.Schedule_Planner.auth.repository.UserRepository;
import com.example.Schedule_Planner.auth.service.UserService;
import com.example.Schedule_Planner.common.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserControllerTest {

    private UserRepositoryDouble userRepositoryDouble;
    private PasswordEncoderDouble passwordEncoderDouble;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        userRepositoryDouble = new UserRepositoryDouble();
        passwordEncoderDouble = new PasswordEncoderDouble();
        UserService userService = new UserService(userRepositoryDouble.proxy(), passwordEncoderDouble.proxy());
        mockMvc = MockMvcBuilders
                .standaloneSetup(new UserController(userService, new UserMapperImpl()))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void shouldCreateManagerAccountWhenAdmin() throws Exception {
        passwordEncoderDouble.encodedValue = "hashed-password";

        mockMvc.perform(post("/api/v1/users/managers")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "manager@restaurant.com",
                                  "password": "temporaryPassword123",
                                  "firstName": "Maria",
                                  "lastName": "Meyer"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("manager@restaurant.com"))
                .andExpect(jsonPath("$.systemRole").value("MANAGER"))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void shouldReturnConflictWhenEmailAlreadyExists() throws Exception {
        userRepositoryDouble.emailExists = true;

        mockMvc.perform(post("/api/v1/users/managers")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "manager@restaurant.com",
                                  "password": "temporaryPassword123",
                                  "firstName": "Maria",
                                  "lastName": "Meyer"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("USER_EMAIL_ALREADY_EXISTS"))
                .andExpect(jsonPath("$.message").value("User email already exists"));
    }

    @Test
    void shouldReturnValidationErrorWhenRequestIsInvalid() throws Exception {
        mockMvc.perform(post("/api/v1/users/managers")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "",
                                  "password": "",
                                  "firstName": "",
                                  "lastName": ""
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.details.length()").value(4));
    }

    private static final class UserRepositoryDouble {
        private boolean emailExists;
        private User savedUser;

        private UserRepository proxy() {
            return (UserRepository) Proxy.newProxyInstance(
                    UserRepository.class.getClassLoader(),
                    new Class<?>[]{UserRepository.class},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "existsByEmail" -> emailExists;
                        case "save" -> {
                            savedUser = (User) args[0];
                            assignIdIfMissing(savedUser);
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

        private void assignIdIfMissing(User user) throws Exception {
            if (user.getId() != null) {
                return;
            }
            Field idField = User.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(user, UUID.fromString("11111111-1111-1111-1111-111111111111"));
        }
    }

    private static final class PasswordEncoderDouble {
        private String encodedValue;

        private PasswordEncoder proxy() {
            return (PasswordEncoder) Proxy.newProxyInstance(
                    PasswordEncoder.class.getClassLoader(),
                    new Class<?>[]{PasswordEncoder.class},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "encode" -> encodedValue != null ? encodedValue : args[0];
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
