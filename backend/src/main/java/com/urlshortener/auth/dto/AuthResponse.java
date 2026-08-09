package com.urlshortener.auth.dto;

import com.urlshortener.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Issued token pair plus the profile of the authenticated account")
public record AuthResponse(
        @Schema(description = "Bearer token for the Authorization header") String accessToken,
        @Schema(description = "Opaque token used to obtain a new access token; rotated on every use")
                String refreshToken,
        @Schema(example = "Bearer") String tokenType,
        @Schema(description = "Lifetime of the access token in seconds", example = "900") long expiresIn,
        UserResponse user) {

    public static AuthResponse of(String accessToken, String refreshToken, long expiresIn, UserResponse user) {
        return new AuthResponse(accessToken, refreshToken, "Bearer", expiresIn, user);
    }
}
