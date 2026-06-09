package com.example.Schedule_Planner.auth.repository;

import com.example.Schedule_Planner.auth.entity.SystemRole;
import com.example.Schedule_Planner.auth.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@Transactional
@Disabled("Requires Docker-backed Testcontainers in this environment.")
class UserRepositoryIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void shouldFindUserByEmail() {
        User savedUser = userRepository.saveAndFlush(new User(
            "manager@restaurant.com",
            "hashed-password",
            SystemRole.MANAGER,
            null,
            true
        ));

        Optional<User> result = userRepository.findByEmail("manager@restaurant.com");

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getId()).isEqualTo(savedUser.getId());
        assertThat(result.orElseThrow().getSystemRole()).isEqualTo(SystemRole.MANAGER);
    }

    @Test
    void shouldReturnTrueWhenEmailExists() {
        userRepository.saveAndFlush(new User(
            "admin@restaurant.com",
            "hashed-password",
            SystemRole.ADMIN,
            null,
            true
        ));

        boolean exists = userRepository.existsByEmail("admin@restaurant.com");

        assertThat(exists).isTrue();
    }

    @Test
    void shouldReturnFalseWhenEmailDoesNotExist() {
        boolean exists = userRepository.existsByEmail("missing@restaurant.com");

        assertThat(exists).isFalse();
    }

    @Test
    void shouldReturnTrueWhenEmployeeIdExists() {
        UUID employeeId = UUID.randomUUID();
        userRepository.saveAndFlush(new User(
            "employee@restaurant.com",
            "hashed-password",
            SystemRole.EMPLOYEE,
            employeeId,
            true
        ));

        boolean exists = userRepository.existsByEmployeeId(employeeId);

        assertThat(exists).isTrue();
    }

    @Test
    void shouldReturnFalseWhenEmployeeIdDoesNotExist() {
        boolean exists = userRepository.existsByEmployeeId(UUID.randomUUID());

        assertThat(exists).isFalse();
    }

    @Test
    void shouldAllowNullEmployeeIdForNonEmployeeAccount() {
        User savedUser = userRepository.saveAndFlush(new User(
            "manager-null-employee@restaurant.com",
            "hashed-password",
            SystemRole.MANAGER,
            null,
            true
        ));

        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getEmployeeId()).isNull();
    }

    @Test
    void shouldPersistSystemRoleAsStringBackedEnum() {
        userRepository.saveAndFlush(new User(
            "role-check@restaurant.com",
            "hashed-password",
            SystemRole.EMPLOYEE,
            UUID.randomUUID(),
            true
        ));

        String persistedRole = (String) entityManager.createNativeQuery(
                "SELECT system_role FROM users WHERE email = :email"
            )
            .setParameter("email", "role-check@restaurant.com")
            .getSingleResult();

        assertThat(persistedRole).isEqualTo("EMPLOYEE");
    }

    @Test
    void shouldEnforceUniqueEmailConstraint() {
        userRepository.saveAndFlush(new User(
            "duplicate@restaurant.com",
            "hashed-password",
            SystemRole.ADMIN,
            null,
            true
        ));

        userRepository.save(new User(
            "duplicate@restaurant.com",
            "another-hash",
            SystemRole.MANAGER,
            null,
            true
        ));

        assertThrows(DataIntegrityViolationException.class, () -> userRepository.flush());
    }
}
