package com.example.Schedule_Planner.auth.service;

import com.example.Schedule_Planner.auth.entity.SystemRole;
import com.example.Schedule_Planner.auth.entity.User;
import com.example.Schedule_Planner.auth.exception.InvalidCredentialsException;
import com.example.Schedule_Planner.common.security.AuthenticatedUserPrincipal;
import com.example.Schedule_Planner.common.security.JwtProperties;
import com.example.Schedule_Planner.common.security.JwtTokenServiceFacade;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtTokenService implements JwtTokenServiceFacade {

    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();

    private final JwtProperties jwtProperties;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public JwtTokenService(JwtProperties jwtProperties, ObjectMapper objectMapper, Clock clock) {
        this.jwtProperties = jwtProperties;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public String generateToken(User user) {
        Instant issuedAt = Instant.now(clock);
        Instant expiresAt = issuedAt.plusSeconds(jwtProperties.getExpirationSeconds());

        String header = encodeJson(Map.of("alg", "HS256", "typ", "JWT"));
        String claims = encodeJson(buildClaims(user, issuedAt, expiresAt));
        String unsignedToken = header + "." + claims;

        return unsignedToken + "." + sign(unsignedToken);
    }

    @Override
    public AuthenticatedUserPrincipal parseToken(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new InvalidCredentialsException();
        }

        String unsignedToken = parts[0] + "." + parts[1];
        if (!sign(unsignedToken).equals(parts[2])) {
            throw new InvalidCredentialsException();
        }

        Map<String, Object> claims = decodeJson(parts[1]);
        long expiration = ((Number) claims.get("exp")).longValue();
        if (expiration < Instant.now(clock).getEpochSecond()) {
            throw new InvalidCredentialsException();
        }

        Object employeeIdValue = claims.get("employeeId");
        UUID employeeId = employeeIdValue instanceof String employeeIdString && !employeeIdString.isBlank()
                ? UUID.fromString(employeeIdString)
                : null;

        return new AuthenticatedUserPrincipal(
                UUID.fromString((String) claims.get("uid")),
                (String) claims.get("sub"),
                SystemRole.valueOf((String) claims.get("role")),
                employeeId
        );
    }

    private Map<String, Object> buildClaims(User user, Instant issuedAt, Instant expiresAt) {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("sub", user.getEmail());
        claims.put("uid", user.getId().toString());
        claims.put("role", user.getSystemRole().name());
        claims.put("employeeId", user.getEmployeeId() != null ? user.getEmployeeId().toString() : null);
        claims.put("iat", issuedAt.getEpochSecond());
        claims.put("exp", expiresAt.getEpochSecond());
        return claims;
    }

    private Map<String, Object> decodeJson(String value) {
        try {
            return objectMapper.readValue(BASE64_URL_DECODER.decode(value), Map.class);
        } catch (Exception exception) {
            throw new InvalidCredentialsException();
        }
    }

    private String encodeJson(Map<String, Object> value) {
        try {
            return BASE64_URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize JWT content.", exception);
        }
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return BASE64_URL_ENCODER.encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to sign JWT token.", exception);
        }
    }
}
