package com.urlshortener.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.urlshortener.TestFixtures;
import com.urlshortener.common.exception.InvalidTokenException;
import com.urlshortener.user.Role;
import com.urlshortener.user.User;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PlatformTransactionManager transactionManager;

    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        Clock fixed = Clock.fixed(TestFixtures.NOW, ZoneOffset.UTC);
        refreshTokenService = new RefreshTokenService(
                refreshTokenRepository,
                TestFixtures.appProperties(),
                fixed,
                transactionManager);
    }

    @Test
    void issue_returnsNonBlankToken_andPersistsHash() {
        User user = TestFixtures.user("user@example.com", Role.USER);
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String token = refreshTokenService.issue(user);

        assertThat(token).isNotBlank();
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void consume_returnsUser_whenTokenIsValid() {
        User user = TestFixtures.user("user@example.com", Role.USER);
        Instant futureExpiry = TestFixtures.NOW.plusSeconds(3600);
        RefreshToken stored = new RefreshToken("hash", user, futureExpiry);
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(stored));
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        User result = refreshTokenService.consume("raw-token");

        assertThat(result).isSameAs(user);
        assertThat(stored.isRevoked()).isTrue();
    }

    @Test
    void consume_throwsInvalidToken_whenTokenNotFound() {
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> refreshTokenService.consume("no-such-token"))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void consume_throwsInvalidToken_whenTokenExpired() {
        User user = TestFixtures.user("user@example.com", Role.USER);
        Instant pastExpiry = TestFixtures.NOW.minusSeconds(1);
        RefreshToken stored = new RefreshToken("hash", user, pastExpiry);
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> refreshTokenService.consume("expired-token"))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void revoke_marksTokenAsRevoked() {
        User user = TestFixtures.user("user@example.com", Role.USER);
        RefreshToken stored = new RefreshToken("hash", user, TestFixtures.NOW.plusSeconds(3600));
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(stored));
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        refreshTokenService.revoke("some-token");

        assertThat(stored.isRevoked()).isTrue();
    }

    @Test
    void deleteExpired_delegatesToRepository() {
        when(refreshTokenRepository.deleteExpiredBefore(any())).thenReturn(5);

        int result = refreshTokenService.deleteExpired();

        assertThat(result).isEqualTo(5);
    }
}
