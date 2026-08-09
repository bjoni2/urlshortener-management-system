package com.urlshortener.auth;

import com.urlshortener.config.AppProperties;
import com.urlshortener.user.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.urlshortener.common.exception.InvalidTokenException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository refreshTokenRepository;
    private final AppProperties appProperties;
    private final Clock clock;
    private final TransactionTemplate requiresNew;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            AppProperties appProperties,
            Clock clock,
            PlatformTransactionManager transactionManager) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.appProperties = appProperties;
        this.clock = clock;
        this.requiresNew = new TransactionTemplate(transactionManager);
        this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    
    @Transactional
    public String issue(User user) {
        byte[] raw = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);

        Instant expiresAt = clock.instant().plus(appProperties.security().jwt().refreshTokenTtl());
        refreshTokenRepository.save(new RefreshToken(hash(token), user, expiresAt));
        return token;
    }

    

    @Transactional
    public User consume(String rawToken) {
        Instant now = clock.instant();
        RefreshToken stored = refreshTokenRepository
                .findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new InvalidTokenException("Invalid refresh token."));

        if (stored.isRevoked()) {
            
            
            
            
            
            UUID userId = stored.getUser().getId();
            log.warn("Replay of a revoked refresh token for user {}; revoking all sessions", userId);
            requiresNew.executeWithoutResult(status -> refreshTokenRepository.revokeAllForUser(userId, now));
            throw new InvalidTokenException("Refresh token has already been used.");
        }
        if (!stored.isUsableAt(now)) {
            throw new InvalidTokenException("Refresh token has expired.");
        }

        stored.revoke(now);
        refreshTokenRepository.save(stored);
        return stored.getUser();
    }

    
    @Transactional
    public void revoke(String rawToken) {
        refreshTokenRepository
                .findByTokenHash(hash(rawToken))
                .ifPresent(token -> {
                    token.revoke(clock.instant());
                    refreshTokenRepository.save(token);
                });
    }

    @Transactional
    public int revokeAllForUser(UUID userId) {
        return refreshTokenRepository.revokeAllForUser(userId, clock.instant());
    }

    
    @Transactional
    public int deleteExpired() {
        return refreshTokenRepository.deleteExpiredBefore(clock.instant());
    }

    private static String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }
}
