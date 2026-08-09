package com.urlshortener.url;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.urlshortener.auth.RefreshTokenService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UrlExpirationSchedulerTest {

    @Mock
    private UrlExpirationService urlExpirationService;
    @Mock
    private RefreshTokenService refreshTokenService;
    @InjectMocks
    private UrlExpirationScheduler scheduler;

    @Test
    void sweep_callsMarkExpired_purgeExpired_andDeleteExpiredTokens() {
        when(urlExpirationService.markExpired()).thenReturn(0);
        when(urlExpirationService.purgeExpired()).thenReturn(0);
        when(refreshTokenService.deleteExpired()).thenReturn(0);

        scheduler.sweep();

        verify(urlExpirationService).markExpired();
        verify(urlExpirationService).purgeExpired();
        verify(refreshTokenService).deleteExpired();
    }

    @Test
    void sweep_logsWhenUrlsAreExpiredOrPurged() {
        when(urlExpirationService.markExpired()).thenReturn(3);
        when(urlExpirationService.purgeExpired()).thenReturn(1);
        when(refreshTokenService.deleteExpired()).thenReturn(2);

        scheduler.sweep();

        verify(urlExpirationService).markExpired();
        verify(urlExpirationService).purgeExpired();
        verify(refreshTokenService).deleteExpired();
    }
}
