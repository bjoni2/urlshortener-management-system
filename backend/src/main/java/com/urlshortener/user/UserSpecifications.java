package com.urlshortener.user;

import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class UserSpecifications {

    private static final char LIKE_ESCAPE = '\\';

    private UserSpecifications() {}

    public static Specification<User> emailContains(String term) {
        if (term == null || term.isBlank()) {
            return Specification.unrestricted();
        }
        String pattern = "%" + escapeLike(term.trim().toLowerCase(Locale.ROOT)) + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("email")), pattern, LIKE_ESCAPE);
    }

    public static Specification<User> hasRole(Role role) {
        return role == null ? Specification.unrestricted() : (root, query, cb) -> cb.equal(root.get("role"), role);
    }

    public static Specification<User> isEnabled(Boolean enabled) {
        return enabled == null
                ? Specification.unrestricted()
                : (root, query, cb) -> cb.equal(root.get("enabled"), enabled);
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
