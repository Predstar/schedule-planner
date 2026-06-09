package com.example.Schedule_Planner.auth.mapper;

import com.example.Schedule_Planner.auth.dto.UserResponse;
import com.example.Schedule_Planner.auth.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserResponse toUserResponse(User user);
}
