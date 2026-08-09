package com.urlshortener.url.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

@Schema(description = "Request to shorten a URL")
public record CreateShortUrlRequest(
        @Schema(example = "https://www.example.com/some/very/long/path?with=parameters")
                @NotBlank(message = "URL is required")
                @Size(max = 2048, message = "URL must be at most 2048 characters")
                @Pattern(
                        regexp = "^(?i)https?://.+",
                        message = "URL must start with http:// or https://")
                String originalUrl,
        @Schema(
                        description = "Optional custom alias. Letters, digits, hyphen and underscore only.",
                        example = "my-link",
                        nullable = true)
                @Size(min = 3, max = 32, message = "Alias must be between 3 and 32 characters")
                @Pattern(
                        regexp = "^[A-Za-z0-9_-]+$",
                        message = "Alias may only contain letters, digits, hyphens and underscores")
                String customAlias,
        @Schema(
                        description = "When the link stops resolving. Omit to apply the configured default lifetime.",
                        example = "2027-01-31T23:59:59Z",
                        nullable = true)
                Instant expiresAt) {}
