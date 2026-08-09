package com.urlshortener.url;

import jakarta.persistence.criteria.JoinType;
import java.time.Instant;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class ShortUrlSpecifications {

    private static final char LIKE_ESCAPE = '\\';

    private ShortUrlSpecifications() {}

    public static Specification<ShortUrl> ownedBy(java.util.UUID ownerId) {
        return (root, query, cb) -> cb.equal(root.get("owner").get("id"), ownerId);
    }

    
    public static Specification<ShortUrl> matching(String term) {
        if (term == null || term.isBlank()) {
            return Specification.unrestricted();
        }
        String pattern = "%" + escapeLike(term.trim().toLowerCase(Locale.ROOT)) + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("shortCode")), pattern, LIKE_ESCAPE),
                cb.like(cb.lower(root.get("originalUrl")), pattern, LIKE_ESCAPE));
    }

    

    public static Specification<ShortUrl> withStatus(UrlStatus status, Instant now) {
        if (status == null) {
            return Specification.unrestricted();
        }
        return switch (status) {
            case INACTIVE -> (root, query, cb) -> cb.equal(root.get("status"), UrlStatus.INACTIVE);
            case ACTIVE -> (root, query, cb) -> cb.and(
                    cb.notEqual(root.get("status"), UrlStatus.INACTIVE),
                    cb.or(cb.isNull(root.get("expiresAt")), cb.greaterThan(root.get("expiresAt"), now)));
            case EXPIRED -> (root, query, cb) -> cb.and(
                    cb.notEqual(root.get("status"), UrlStatus.INACTIVE),
                    cb.isNotNull(root.get("expiresAt")),
                    cb.lessThanOrEqualTo(root.get("expiresAt"), now));
        };
    }

    public static Specification<ShortUrl> createdFrom(Instant from) {
        return from == null
                ? Specification.unrestricted()
                : (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<ShortUrl> createdUntil(Instant until) {
        return until == null
                ? Specification.unrestricted()
                : (root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), until);
    }

    

    public static Specification<ShortUrl> withOwnerFetched() {
        return (root, query, cb) -> {
            if (query != null && Long.class != query.getResultType()) {
                root.fetch("owner", JoinType.LEFT);
            }
            return null;
        };
    }

    
    public static Specification<ShortUrl> ownerEmailContains(String term) {
        if (term == null || term.isBlank()) {
            return Specification.unrestricted();
        }
        String pattern = "%" + escapeLike(term.trim().toLowerCase(Locale.ROOT)) + "%";
        return (root, query, cb) ->
                cb.like(cb.lower(root.join("owner", JoinType.INNER).get("email")), pattern, LIKE_ESCAPE);
    }

    
    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
