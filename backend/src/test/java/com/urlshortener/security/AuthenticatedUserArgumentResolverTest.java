package com.urlshortener.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class AuthenticatedUserArgumentResolverTest {

    @Test
    void resolvesCallerFromJwtClaims() {
        String id = UUID.randomUUID().toString();
        Jwt jwt = new Jwt("token", null, null, Map.of("alg", "none"), Map.of(
                "sub", id,
                JwtClaims.EMAIL, "test@example.com",
                JwtClaims.ROLES, List.of("USER")));

        AuthenticatedUser user = AuthenticatedUserArgumentResolver.fromJwt(jwt);
        assertThat(user.id().toString()).isEqualTo(id);
        assertThat(user.email()).isEqualTo("test@example.com");
    }
}
