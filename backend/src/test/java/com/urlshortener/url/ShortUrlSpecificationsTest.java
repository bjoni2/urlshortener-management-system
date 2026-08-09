package com.urlshortener.url;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

class ShortUrlSpecificationsTest {

    private static final Instant NOW = Instant.parse("2026-06-01T12:00:00Z");

    @Test
    void matching_returnsUnrestricted_whenNull() {
        assertThat(ShortUrlSpecifications.matching(null))
                .isEqualTo(Specification.unrestricted());
    }

    @Test
    void matching_returnsUnrestricted_whenBlank() {
        assertThat(ShortUrlSpecifications.matching("  "))
                .isEqualTo(Specification.unrestricted());
    }

    @Test
    void matching_returnsNonNull_whenTermProvided() {
        Specification<ShortUrl> spec = ShortUrlSpecifications.matching("example");
        assertThat(spec).isNotNull();
        assertThat(spec).isNotEqualTo(Specification.unrestricted());
    }

    @Test
    void withStatus_returnsUnrestricted_whenNull() {
        assertThat(ShortUrlSpecifications.withStatus(null, NOW))
                .isEqualTo(Specification.unrestricted());
    }

    @Test
    void withStatus_returnsNonNull_forActive() {
        assertThat(ShortUrlSpecifications.withStatus(UrlStatus.ACTIVE, NOW)).isNotNull();
    }

    @Test
    void withStatus_returnsNonNull_forInactive() {
        assertThat(ShortUrlSpecifications.withStatus(UrlStatus.INACTIVE, NOW)).isNotNull();
    }

    @Test
    void withStatus_returnsNonNull_forExpired() {
        assertThat(ShortUrlSpecifications.withStatus(UrlStatus.EXPIRED, NOW)).isNotNull();
    }

    @Test
    void createdFrom_returnsUnrestricted_whenNull() {
        assertThat(ShortUrlSpecifications.createdFrom(null))
                .isEqualTo(Specification.unrestricted());
    }

    @Test
    void createdFrom_returnsNonNull_whenInstantProvided() {
        assertThat(ShortUrlSpecifications.createdFrom(NOW)).isNotNull();
    }

    @Test
    void createdUntil_returnsUnrestricted_whenNull() {
        assertThat(ShortUrlSpecifications.createdUntil(null))
                .isEqualTo(Specification.unrestricted());
    }

    @Test
    void createdUntil_returnsNonNull_whenInstantProvided() {
        assertThat(ShortUrlSpecifications.createdUntil(NOW)).isNotNull();
    }

    @Test
    void ownerEmailContains_returnsUnrestricted_whenNull() {
        assertThat(ShortUrlSpecifications.ownerEmailContains(null))
                .isEqualTo(Specification.unrestricted());
    }

    @Test
    void ownerEmailContains_returnsUnrestricted_whenBlank() {
        assertThat(ShortUrlSpecifications.ownerEmailContains("   "))
                .isEqualTo(Specification.unrestricted());
    }

    @Test
    void ownerEmailContains_returnsNonNull_whenTermProvided() {
        assertThat(ShortUrlSpecifications.ownerEmailContains("example")).isNotNull();
    }

    @Test
    void withOwnerFetched_returnsNonNull() {
        assertThat(ShortUrlSpecifications.withOwnerFetched()).isNotNull();
    }

    @Test
    void ownedBy_returnsNonNull() {
        assertThat(ShortUrlSpecifications.ownedBy(java.util.UUID.randomUUID())).isNotNull();
    }
}
