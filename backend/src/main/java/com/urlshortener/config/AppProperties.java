package com.urlshortener.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @NotNull @Valid Cors cors,
        @NotNull @Valid Security security,
        @NotNull @Valid ShortUrl shortUrl,
        @NotNull @Valid Expiration expiration) {

    public record Cors(@NotEmpty List<String> allowedOrigins) {}

    public record Security(@NotNull @Valid Jwt jwt, @NotNull @Valid BootstrapAdmin bootstrapAdmin) {

        public record Jwt(
                @NotBlank String issuer,
                
                @NotBlank @Size(min = 32) String secret,
                @NotNull Duration accessTokenTtl,
                @NotNull Duration refreshTokenTtl) {}

        public record BootstrapAdmin(boolean enabled, @NotBlank String email, @NotBlank String password) {}
    }

    public record ShortUrl(
            @NotBlank String baseUrl,
            @Min(4) @Max(32) int codeLength,
            @Min(1) @Max(20) int maxGenerationAttempts,
            @NotNull Duration defaultTtl,
            @NotNull Duration maxTtl,
            @NotNull List<String> reservedAliases) {

        
        public Set<String> reservedAliasSet() {
            return reservedAliases.stream()
                    .map(alias -> alias.toLowerCase(Locale.ROOT))
                    .collect(Collectors.toUnmodifiableSet());
        }

        
        public String toShortUrl(String code) {
            String prefix = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
            return prefix + "/" + code;
        }
    }

    public record Expiration(
            @NotBlank String cron, boolean purgeEnabled, @NotNull Duration purgeAfter, @Min(1) int batchSize) {}
}
