package com.urlshortener.auth;

import com.urlshortener.auth.dto.AuthResponse;
import com.urlshortener.auth.dto.LoginRequest;
import com.urlshortener.auth.dto.RegisterRequest;
import com.urlshortener.common.exception.DuplicateResourceException;
import com.urlshortener.security.AppUserDetails;
import com.urlshortener.security.JwtTokenService;
import com.urlshortener.user.Role;
import com.urlshortener.user.User;
import com.urlshortener.user.UserRepository;
import com.urlshortener.user.dto.UserResponse;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenService jwtTokenService;
    private final RefreshTokenService refreshTokenService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtTokenService jwtTokenService,
            RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtTokenService = jwtTokenService;
        this.refreshTokenService = refreshTokenService;
    }

    
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = User.normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("An account with this email already exists.");
        }

        User user = userRepository.save(new User(email, passwordEncoder.encode(request.password()), Role.USER));
        log.info("Registered new user {}", user.getId());
        return issueTokens(user);
    }

    

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(User.normalizeEmail(request.email()), request.password()));

        User user = ((AppUserDetails) authentication.getPrincipal()).user();
        return issueTokens(user);
    }

    
    @Transactional
    public AuthResponse refresh(String refreshToken) {
        User user = refreshTokenService.consume(refreshToken);
        return issueTokens(user);
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
    }

    @Transactional
    public void logoutEverywhere(UUID userId) {
        int revoked = refreshTokenService.revokeAllForUser(userId);
        log.info("Revoked {} refresh token(s) for user {}", revoked, userId);
    }

    private AuthResponse issueTokens(User user) {
        return AuthResponse.of(
                jwtTokenService.createAccessToken(user),
                refreshTokenService.issue(user),
                jwtTokenService.accessTokenTtl().toSeconds(),
                UserResponse.from(user));
    }
}
