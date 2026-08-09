package com.urlshortener.url;

import com.urlshortener.auth.RefreshTokenService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class UrlExpirationScheduler {

    private static final Logger log = LoggerFactory.getLogger(UrlExpirationScheduler.class);

    private final UrlExpirationService urlExpirationService;
    private final RefreshTokenService refreshTokenService;

    public UrlExpirationScheduler(UrlExpirationService urlExpirationService, RefreshTokenService refreshTokenService) {
        this.urlExpirationService = urlExpirationService;
        this.refreshTokenService = refreshTokenService;
    }

    @Scheduled(cron = "${app.expiration.cron}")
    public void sweep() {
        int marked = urlExpirationService.markExpired();
        int purged = urlExpirationService.purgeExpired();
        int tokens = refreshTokenService.deleteExpired();

        if (marked > 0 || purged > 0 || tokens > 0) {
            log.info(
                    "Expiration sweep: marked {} URL(s), deleted {} URL(s), pruned {} refresh token(s)",
                    marked,
                    purged,
                    tokens);
        }
    }
}
