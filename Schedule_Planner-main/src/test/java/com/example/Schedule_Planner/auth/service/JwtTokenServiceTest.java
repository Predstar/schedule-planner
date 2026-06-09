package com.example.Schedule_Planner.auth.service;

import com.example.Schedule_Planner.auth.entity.SystemRole;
import com.example.Schedule_Planner.auth.entity.User;
import com.example.Schedule_Planner.common.security.AuthenticatedUserPrincipal;
import com.example.Schedule_Planner.common.security.JwtProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JwtTokenServiceTest {

    @Test
    void shouldGenerateSignedJwtWithExpectedClaims() throws Exception {
        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setSecret("test-secret-key-which-is-long-enough");
        jwtProperties.setExpirationSeconds(3600);

        JwtTokenService jwtTokenService = new JwtTokenService(
                jwtProperties,
                new ObjectMapper(),
                Clock.fixed(Instant.parse("2026-06-08T12:00:00Z"), ZoneOffset.UTC)
        );

        User user = new User(
                "manager@restaurant.com",
                "stored-hash",
                SystemRole.MANAGER,
                UUID.fromString("33333333-3333-3333-3333-333333333333"),
                true
        );
        UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        setUserId(user, userId);

        String token = jwtTokenService.generateToken(user);
        String[] parts = token.split("\\.");

        assertEquals(3, parts.length);

        Map<String, Object> header = decodeJson(parts[0]);
        Map<String, Object> claims = decodeJson(parts[1]);

        assertEquals("HS256", header.get("alg"));
        assertEquals("JWT", header.get("typ"));
        assertEquals("manager@restaurant.com", claims.get("sub"));
        assertEquals("11111111-1111-1111-1111-111111111111", claims.get("uid"));
        assertEquals("MANAGER", claims.get("role"));
        assertEquals("33333333-3333-3333-3333-333333333333", claims.get("employeeId"));
        assertEquals(1780920000, ((Number) claims.get("iat")).longValue());
        assertEquals(1780923600, ((Number) claims.get("exp")).longValue());
    }

    @Test
    void shouldParseValidJwtTokenIntoAuthenticatedPrincipal() throws Exception {
        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setSecret("test-secret-key-which-is-long-enough");
        jwtProperties.setExpirationSeconds(3600);

        JwtTokenService jwtTokenService = new JwtTokenService(
                jwtProperties,
                new ObjectMapper(),
                Clock.fixed(Instant.parse("2026-06-08T12:00:00Z"), ZoneOffset.UTC)
        );

        User user = new User(
                "manager@restaurant.com",
                "stored-hash",
                SystemRole.MANAGER,
                UUID.fromString("33333333-3333-3333-3333-333333333333"),
                true
        );
        UUID userId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        setUserId(user, userId);

        AuthenticatedUserPrincipal principal = jwtTokenService.parseToken(jwtTokenService.generateToken(user));

        assertEquals(userId, principal.id());
        assertEquals("manager@restaurant.com", principal.email());
        assertEquals(SystemRole.MANAGER, principal.systemRole());
        assertEquals(UUID.fromString("33333333-3333-3333-3333-333333333333"), principal.employeeId());
    }

    private Map<String, Object> decodeJson(String value) throws Exception {
        byte[] bytes = Base64.getUrlDecoder().decode(value);
        return new ObjectMapper().readValue(new String(bytes, StandardCharsets.UTF_8), Map.class);
    }

    private void setUserId(User user, UUID id) throws Exception {
        Field idField = User.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(user, id);
    }
}
