package com.example.Schedule_Planner.auth.exception;

public class UserEmailAlreadyExistsException extends RuntimeException {

    public UserEmailAlreadyExistsException(String email) {
        super("A user with email '%s' already exists.".formatted(email));
    }
}
