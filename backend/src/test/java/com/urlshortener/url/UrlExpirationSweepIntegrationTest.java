package com.urlshortener.url;

import static org.assertj.core.api.Assertions.assertThat;

import com.urlshortener.AbstractIntegrationTest;
import com.urlshortener.auth.RefreshTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class UrlExpirationSweepIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private UrlExpirationService urlExpirationService;
    @Autowired
    private RefreshTokenService refreshTokenService;
    @Autowired
    private UrlExpirationScheduler urlExpirationScheduler;

    @Test
    void markExpired_returnsZero_whenDatabaseIsEmpty() {
        int marked = urlExpirationService.markExpired();
        assertThat(marked).isZero();
    }

    @Test
    void purgeExpired_returnsZero_whenPurgeIsDisabledInTestConfig() {
        int purged = urlExpirationService.purgeExpired();
        assertThat(purged).isZero();
    }

    @Test
    void deleteExpiredRefreshTokens_returnsZero_whenNoExpiredTokensExist() {
        int deleted = refreshTokenService.deleteExpired();
        assertThat(deleted).isZero();
    }

    @Test
    void sweep_completesWithoutError_onEmptyDatabase() {
        urlExpirationScheduler.sweep();
    }
}
