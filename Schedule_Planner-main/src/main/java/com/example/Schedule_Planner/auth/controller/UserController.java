package com.example.Schedule_Planner.auth.controller;

import com.example.Schedule_Planner.auth.dto.CreateManagerUserRequest;
import com.example.Schedule_Planner.auth.dto.UserResponse;
import com.example.Schedule_Planner.auth.mapper.UserMapper;
import com.example.Schedule_Planner.auth.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final UserMapper userMapper;

    public UserController(UserService userService, UserMapper userMapper) {
        this.userService = userService;
        this.userMapper = userMapper;
    }

    @PostMapping("/managers")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createManagerAccount(@Valid @RequestBody CreateManagerUserRequest request) {
        return userMapper.toUserResponse(
                userService.createManagerUser(
                        request.email(),
                        request.password(),
                        request.firstName(),
                        request.lastName()
                )
        );
    }
}
