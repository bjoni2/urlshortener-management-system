package com.urlshortener;

import com.urlshortener.config.AppProperties;
import com.urlshortener.security.AuthenticatedUser;
import com.urlshortener.user.Role;
import com.urlshortener.user.User;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Shared builders so unit tests state only the values they actually care about. */
public final class TestFixtures {

    public static final Instant NOW = Instant.parse("2026-06-01T12:00:00Z");
    public static final String SHORT_URL_BASE = "http://localhost:8080/r";

    private TestFixtures() {}

    public static AppProperties appProperties() {
        return appProperties(builderDefaults());
    }

    /** Overriding only the short-URL block keeps alias and expiry tests readable. */
    public static AppProperties appProperties(AppProperties.ShortUrl shortUrl) {
        return new AppProperties(
                new AppProperties.Cors(List.of("http://localhost:4200")),
                new AppProperties.Security(
                        new AppProperties.Security.Jwt(
                                "urlshortener-test",
                                "test-secret-that-is-long-enough-for-hs256-aaaa",
                                Duration.ofMinutes(15),
                                Duration.ofDays(7)),
                        new AppProperties.Security.BootstrapAdmin(false, "admin@test.local", "Admin123!")),
                shortUrl,
                new AppProperties.Expiration("-", false, Duration.ofDays(30), 500));
    }

    public static AppProperties appPropertiesWithExpiration(AppProperties.Expiration expiration) {
        AppProperties base = appProperties();
        return new AppProperties(base.cors(), base.security(), base.shortUrl(), expiration);
    }

    public static AppProperties.ShortUrl builderDefaults() {
        return new AppProperties.ShortUrl(
                SHORT_URL_BASE,
                7,
                5,
                Duration.ofDays(30),
                Duration.ofDays(365),
                List.of("api", "admin", "swagger-ui", "r"));
    }

    public static User user(String email, Role role) {
        User user = new User(email, "{noop}password", role);
        user.setId(UUID.randomUUID());
        user.setCreatedAt(NOW);
        user.setUpdatedAt(NOW);
        return user;
    }

    public static AuthenticatedUser caller(User user) {
        return new AuthenticatedUser(user.getId(), user.getEmail(), user.getRole());
    }
}
