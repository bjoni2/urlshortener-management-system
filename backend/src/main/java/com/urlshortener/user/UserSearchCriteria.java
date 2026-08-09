package com.urlshortener.user;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Search and filter parameters for the user list")
public record UserSearchCriteria(
        @Schema(description = "Matches the email, case-insensitive", example = "example.com") String search,
        @Schema(description = "Restrict to one role") Role role,
        @Schema(description = "Restrict to activated or deactivated accounts") Boolean enabled) {}
