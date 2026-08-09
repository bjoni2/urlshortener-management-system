package com.urlshortener.security;

import com.urlshortener.config.AppProperties;
import com.urlshortener.user.User;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class JwtTokenService {

    private final JwtEncoder jwtEncoder;
    private final AppProperties.Security.Jwt properties;
    private final Clock clock;

    public JwtTokenService(JwtEncoder jwtEncoder, AppProperties appProperties, Clock clock) {
        this.jwtEncoder = jwtEncoder;
        this.properties = appProperties.security().jwt();
        this.clock = clock;
    }

    public String createAccessToken(User user) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(properties.issuer())
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plus(properties.accessTokenTtl()))
                
                .id(UUID.randomUUID().toString())
                .claim(JwtClaims.EMAIL, user.getEmail())
                .claim(JwtClaims.ROLES, List.of(user.getRole().name()))
                .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    
    public Duration accessTokenTtl() {
        return properties.accessTokenTtl();
    }
}
