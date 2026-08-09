package com.urlshortener.url;

import com.urlshortener.common.AuditableEntity;
import com.urlshortener.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "short_urls",
        uniqueConstraints = @UniqueConstraint(name = "uk_short_urls_short_code", columnNames = "short_code"),
        indexes = {
            @Index(name = "ix_short_urls_owner", columnList = "owner_id"),
            @Index(name = "ix_short_urls_status_expires_at", columnList = "status,expires_at")
        })
public class ShortUrl extends AuditableEntity {

    @Column(name = "short_code", nullable = false, length = 64)
    private String shortCode;

    @Column(name = "original_url", nullable = false, length = 2048)
    private String originalUrl;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false, foreignKey = @ForeignKey(name = "fk_short_urls_owner"))
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UrlStatus status = UrlStatus.ACTIVE;

    
    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "click_count", nullable = false)
    private long clickCount;

    @Column(name = "last_accessed_at")
    private Instant lastAccessedAt;

    @Column(name = "custom_alias", nullable = false)
    private boolean customAlias;

    protected ShortUrl() {
        
    }

    public ShortUrl(String shortCode, String originalUrl, User owner, Instant expiresAt, boolean customAlias) {
        this.shortCode = shortCode;
        this.originalUrl = originalUrl;
        this.owner = owner;
        this.expiresAt = expiresAt;
        this.customAlias = customAlias;
        this.status = UrlStatus.ACTIVE;
        this.clickCount = 0L;
    }

    public boolean isExpiredAt(Instant now) {
        return expiresAt != null && !expiresAt.isAfter(now);
    }

    
    public boolean isRedirectableAt(Instant now) {
        return status == UrlStatus.ACTIVE && !isExpiredAt(now);
    }

    

    public UrlStatus effectiveStatusAt(Instant now) {
        if (status == UrlStatus.INACTIVE) {
            return UrlStatus.INACTIVE;
        }
        return isExpiredAt(now) ? UrlStatus.EXPIRED : UrlStatus.ACTIVE;
    }

    public boolean isOwnedBy(UUID userId) {
        return owner != null && owner.getId() != null && owner.getId().equals(userId);
    }

    

    public void activate(Instant now) {
        this.status = isExpiredAt(now) ? UrlStatus.EXPIRED : UrlStatus.ACTIVE;
    }

    public void deactivate() {
        this.status = UrlStatus.INACTIVE;
    }

    public void markExpired() {
        this.status = UrlStatus.EXPIRED;
    }

    

    public void changeExpiresAt(Instant expiresAt, Instant now) {
        this.expiresAt = expiresAt;
        if (isExpiredAt(now)) {
            this.status = UrlStatus.EXPIRED;
        } else if (this.status == UrlStatus.EXPIRED) {
            this.status = UrlStatus.ACTIVE;
        }
    }

    public String getShortCode() {
        return shortCode;
    }

    public void setShortCode(String shortCode) {
        this.shortCode = shortCode;
    }

    public String getOriginalUrl() {
        return originalUrl;
    }

    public void setOriginalUrl(String originalUrl) {
        this.originalUrl = originalUrl;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public UrlStatus getStatus() {
        return status;
    }

    public void setStatus(UrlStatus status) {
        this.status = status;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public long getClickCount() {
        return clickCount;
    }

    public void setClickCount(long clickCount) {
        this.clickCount = clickCount;
    }

    public Instant getLastAccessedAt() {
        return lastAccessedAt;
    }

    public void setLastAccessedAt(Instant lastAccessedAt) {
        this.lastAccessedAt = lastAccessedAt;
    }

    public boolean isCustomAlias() {
        return customAlias;
    }

    public void setCustomAlias(boolean customAlias) {
        this.customAlias = customAlias;
    }
}
