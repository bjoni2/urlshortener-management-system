package com.urlshortener.security;

import com.urlshortener.user.Role;
import java.util.UUID;

public record AuthenticatedUser(UUID id, String email, Role role) {

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}
