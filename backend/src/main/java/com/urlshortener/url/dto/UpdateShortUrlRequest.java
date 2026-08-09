package com.urlshortener.url.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

@Schema(description = "New expiration date and activation state for a short URL")
public record UpdateShortUrlRequest(
        @Schema(
                        description = "New expiration timestamp, or null for a link that never expires. "
                                + "A date in the past expires the link immediately.",
                        example = "2027-01-31T23:59:59Z",
                        nullable = true)
                Instant expiresAt,
        @Schema(description = "Whether the link should resolve", example = "true")
                @NotNull(message = "Active flag is required")
                Boolean active) {}
