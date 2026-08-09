package com.urlshortener.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.urlshortener.user.Role;
import com.urlshortener.user.User;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class RefreshTokenTest {

    @Test
    void revokeMarksTokenAsRevoked() {
        User user = new User("test@example.com", "hash", Role.USER);
        RefreshToken token = new RefreshToken("hash", user, Instant.now().plusSeconds(3600));
        token.revoke(Instant.now());
        assertThat(token.isRevoked()).isTrue();
    }
}
