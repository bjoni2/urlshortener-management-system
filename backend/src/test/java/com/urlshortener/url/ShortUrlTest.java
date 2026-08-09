package com.urlshortener.url;

import static org.assertj.core.api.Assertions.assertThat;

import com.urlshortener.user.Role;
import com.urlshortener.user.User;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class ShortUrlTest {

    private static final Instant NOW = Instant.parse("2026-06-01T12:00:00Z");

    private static ShortUrl url(Instant expiresAt) {
        User owner = new User("owner@example.com", "{noop}secret", Role.USER);
        return new ShortUrl("aB3dEf9", "https://example.com", owner, expiresAt, false);
    }

    @Test
    void noExpiryNeverExpires() {
        assertThat(url(null).isExpiredAt(NOW)).isFalse();
    }

    @Test
    void pastExpiryIsExpired() {
        assertThat(url(NOW.minusSeconds(1)).isExpiredAt(NOW)).isTrue();
    }

    @Test
    void futureExpiryIsNotExpired() {
        assertThat(url(NOW.plusSeconds(60)).isExpiredAt(NOW)).isFalse();
    }

    @Test
    void deactivatedLinkDoesNotRedirect() {
        ShortUrl u = url(NOW.plusSeconds(60));
        u.deactivate();
        assertThat(u.isRedirectableAt(NOW)).isFalse();
    }

    @Test
    void activeLinkRedirects() {
        assertThat(url(NOW.plusSeconds(60)).isRedirectableAt(NOW)).isTrue();
    }
}
