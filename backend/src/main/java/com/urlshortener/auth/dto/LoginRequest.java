package com.urlshortener.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Credentials exchanged for an access and refresh token pair")
public record LoginRequest(
        @Schema(example = "jane.doe@example.com") @NotBlank(message = "Email is required") String email,
        @Schema(example = "Str0ngPassw0rd!") @NotBlank(message = "Password is required") String password) {}
