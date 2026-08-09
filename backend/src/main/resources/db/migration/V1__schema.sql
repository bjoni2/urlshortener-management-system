CREATE TABLE users (
    id            UUID          NOT NULL,
    email         VARCHAR(254)  NOT NULL,
    password_hash VARCHAR(100)  NOT NULL,
    role          VARCHAR(20)   NOT NULL,
    enabled       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP     NOT NULL,
    updated_at    TIMESTAMP     NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('USER', 'ADMIN'))
);

CREATE TABLE short_urls (
    id               UUID           NOT NULL,
    short_code       VARCHAR(64)    NOT NULL,
    original_url     VARCHAR(2048)  NOT NULL,
    owner_id         UUID           NOT NULL,
    status           VARCHAR(20)    NOT NULL,
    expires_at       TIMESTAMP,
    click_count      BIGINT         NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMP,
    custom_alias     BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP      NOT NULL,
    updated_at       TIMESTAMP      NOT NULL,
    CONSTRAINT pk_short_urls PRIMARY KEY (id),
    CONSTRAINT uk_short_urls_short_code UNIQUE (short_code),
    CONSTRAINT fk_short_urls_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_short_urls_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED')),
    CONSTRAINT ck_short_urls_click_count CHECK (click_count >= 0)
);

CREATE INDEX ix_short_urls_owner ON short_urls (owner_id);
CREATE INDEX ix_short_urls_status_expires_at ON short_urls (status, expires_at);

CREATE TABLE refresh_tokens (
    id         UUID         NOT NULL,
    token_hash VARCHAR(64)  NOT NULL,
    user_id    UUID         NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP    NOT NULL,
    updated_at TIMESTAMP    NOT NULL,
    CONSTRAINT pk_refresh_tokens PRIMARY KEY (id),
    CONSTRAINT uk_refresh_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_refresh_tokens_user ON refresh_tokens (user_id);
