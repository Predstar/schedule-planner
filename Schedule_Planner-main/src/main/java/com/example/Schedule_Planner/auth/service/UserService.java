package com.example.Schedule_Planner.auth.service;

import com.example.Schedule_Planner.auth.entity.SystemRole;
import com.example.Schedule_Planner.auth.entity.User;
import com.example.Schedule_Planner.auth.exception.UserEmailAlreadyExistsException;
import com.example.Schedule_Planner.auth.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User createUser(String email, String passwordHash, SystemRole systemRole, UUID employeeId) {
        return persistUser(email, passwordHash, systemRole, employeeId);
    }

    @Transactional
    public User createManagerUser(String email, String password, String firstName, String lastName) {
        return persistUser(email, passwordEncoder.encode(password), SystemRole.MANAGER, null);
    }

    private User persistUser(String email, String passwordHash, SystemRole systemRole, UUID employeeId) {
        if (userRepository.existsByEmail(email)) {
            throw new UserEmailAlreadyExistsException(email);
        }

        User user = new User(email, passwordHash, systemRole, employeeId, true);
        return userRepository.save(user);
    }
}
