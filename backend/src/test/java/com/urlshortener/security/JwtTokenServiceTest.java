package com.urlshortener.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.urlshortener.TestFixtures;
import com.urlshortener.user.Role;
import com.urlshortener.user.User;
import java.time.Clock;
import java.time.Duration;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;

@ExtendWith(MockitoExtension.class)
class JwtTokenServiceTest {

    @Mock
    private JwtEncoder jwtEncoder;
    @Mock
    private Jwt jwt;

    private JwtTokenService jwtTokenService;

    @BeforeEach
    void setUp() {
        Clock fixed = Clock.fixed(TestFixtures.NOW, ZoneOffset.UTC);
        jwtTokenService = new JwtTokenService(jwtEncoder, TestFixtures.appProperties(), fixed);
    }

    @Test
    void createAccessToken_returnsEncodedTokenValue() {
        when(jwtEncoder.encode(any())).thenReturn(jwt);
        when(jwt.getTokenValue()).thenReturn("eyJhbGciOiJIUzI1NiJ9.payload.sig");

        User user = TestFixtures.user("alice@example.com", Role.USER);
        String token = jwtTokenService.createAccessToken(user);

        assertThat(token).isEqualTo("eyJhbGciOiJIUzI1NiJ9.payload.sig");
    }

    @Test
    void accessTokenTtl_matchesConfiguredDuration() {
        Duration ttl = jwtTokenService.accessTokenTtl();
        assertThat(ttl).isEqualTo(Duration.ofMinutes(15));
    }
}
