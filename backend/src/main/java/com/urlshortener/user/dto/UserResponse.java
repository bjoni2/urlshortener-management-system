package com.urlshortener.user.dto;

import com.urlshortener.user.Role;
import com.urlshortener.user.User;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

@Schema(description = "A registered account. Never exposes the password hash.")
public record UserResponse(UUID id, String email, Role role, boolean enabled, Instant createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getRole(), user.isEnabled(), user.getCreatedAt());
    }
}
