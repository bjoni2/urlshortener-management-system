package com.urlshortener.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Self-service registration for a new standard user")
public record RegisterRequest(
        @Schema(example = "jane.doe@example.com")
                @NotBlank(message = "Email is required")
                @Email(message = "Must be a valid email address")
                @Size(max = 254, message = "Email must be at most 254 characters")
                String email,
        @Schema(example = "Str0ngPassw0rd!", minLength = 8, maxLength = 72)
                @NotBlank(message = "Password is required")
                
                @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
                @Pattern(
                        regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$",
                        message = "Password must contain at least one letter and one digit")
                String password) {}
