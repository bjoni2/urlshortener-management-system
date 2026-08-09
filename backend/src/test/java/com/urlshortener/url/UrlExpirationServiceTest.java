package com.urlshortener.url;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.urlshortener.TestFixtures;
import com.urlshortener.config.AppProperties;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Limit;

@ExtendWith(MockitoExtension.class)
class UrlExpirationServiceTest {

    @Mock
    private ShortUrlRepository shortUrlRepository;

    private UrlExpirationService service;
    private Clock fixed;

    @BeforeEach
    void setUp() {
        fixed = Clock.fixed(TestFixtures.NOW, ZoneOffset.UTC);
        service = new UrlExpirationService(shortUrlRepository, TestFixtures.appProperties(), fixed);
    }

    @Test
    void markExpired_delegatesToRepository_andReturnsCount() {
        when(shortUrlRepository.markExpired(TestFixtures.NOW)).thenReturn(5);
        assertThat(service.markExpired()).isEqualTo(5);
        verify(shortUrlRepository).markExpired(TestFixtures.NOW);
    }

    @Test
    void purgeExpired_returnsZero_whenPurgeIsDisabled() {
        int result = service.purgeExpired();
        assertThat(result).isZero();
        verify(shortUrlRepository, never()).deleteAllByIdInBatch(any());
    }

    @Test
    void purgeExpired_deletesIds_whenPurgeIsEnabled() {
        AppProperties propsWithPurge = TestFixtures.appPropertiesWithExpiration(
                new AppProperties.Expiration("-", true, java.time.Duration.ofDays(30), 500));
        service = new UrlExpirationService(shortUrlRepository, propsWithPurge, fixed);

        List<UUID> ids = List.of(UUID.randomUUID(), UUID.randomUUID());
        when(shortUrlRepository.findPurgeCandidates(any(), any(Limit.class))).thenReturn(ids);

        int result = service.purgeExpired();

        assertThat(result).isEqualTo(2);
        verify(shortUrlRepository).deleteAllByIdInBatch(ids);
    }

    @Test
    void purgeExpired_returnsZero_whenNoCandidates() {
        AppProperties propsWithPurge = TestFixtures.appPropertiesWithExpiration(
                new AppProperties.Expiration("-", true, java.time.Duration.ofDays(30), 500));
        service = new UrlExpirationService(shortUrlRepository, propsWithPurge, fixed);

        when(shortUrlRepository.findPurgeCandidates(any(), any(Limit.class))).thenReturn(List.of());

        int result = service.purgeExpired();

        assertThat(result).isZero();
        verify(shortUrlRepository, never()).deleteAllByIdInBatch(any());
    }
}
