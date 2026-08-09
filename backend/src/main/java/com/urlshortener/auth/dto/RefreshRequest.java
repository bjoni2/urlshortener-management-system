package com.urlshortener.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Refresh token previously issued by login or refresh")
public record RefreshRequest(@NotBlank(message = "Refresh token is required") String refreshToken) {}
