package com.example.Schedule_Planner.common.response;

import java.util.List;

public record ApiErrorResponse(
        String timestamp,
        int status,
        String code,
        String message,
        List<ErrorDetail> details
) {
}
