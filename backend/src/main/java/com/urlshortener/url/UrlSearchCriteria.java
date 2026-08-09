package com.urlshortener.url;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(description = "Search, filter and date-range parameters")
public record UrlSearchCriteria(
        @Schema(description = "Matches the short code or the target URL, case-insensitive", example = "example.com")
                String search,
        @Schema(description = "Restrict to one lifecycle state") UrlStatus status,
        @Schema(description = "Only URLs created at or after this instant") Instant createdFrom,
        @Schema(description = "Only URLs created at or before this instant") Instant createdTo,
        @Schema(description = "Administrator only: matches the owning account's email") String ownerEmail) {}
