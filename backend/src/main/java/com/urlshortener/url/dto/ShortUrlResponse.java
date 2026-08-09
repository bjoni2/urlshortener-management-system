package com.urlshortener.url.dto;

import com.urlshortener.url.ShortUrl;
import com.urlshortener.url.UrlStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

@Schema(description = "A shortened URL with its usage counters")
public record ShortUrlResponse(
        UUID id,
        String shortCode,
        @Schema(description = "Absolute URL to share", example = "http://localhost:8080/r/aB3dEf9") String shortUrl,
        String originalUrl,
        @Schema(description = "Status as of this response, derived from the activation flag and expiration date")
                UrlStatus status,
        @Schema(nullable = true) Instant expiresAt,
        long clickCount,
        @Schema(nullable = true) Instant lastAccessedAt,
        boolean customAlias,
        @Schema(description = "Email of the owning account; useful in the administrator view") String ownerEmail,
        Instant createdAt,
        Instant updatedAt) {

    

    public static ShortUrlResponse from(ShortUrl entity, String shortUrl, Instant now) {
        return new ShortUrlResponse(
                entity.getId(),
                entity.getShortCode(),
                shortUrl,
                entity.getOriginalUrl(),
                entity.effectiveStatusAt(now),
                entity.getExpiresAt(),
                entity.getClickCount(),
                entity.getLastAccessedAt(),
                entity.isCustomAlias(),
                entity.getOwner() == null ? null : entity.getOwner().getEmail(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
