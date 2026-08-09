package com.urlshortener.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.urlshortener.TestFixtures;
import com.urlshortener.auth.dto.AuthResponse;
import com.urlshortener.auth.dto.LoginRequest;
import com.urlshortener.auth.dto.RegisterRequest;
import com.urlshortener.common.exception.DuplicateResourceException;
import com.urlshortener.security.AppUserDetails;
import com.urlshortener.security.JwtTokenService;
import com.urlshortener.user.Role;
import com.urlshortener.user.User;
import com.urlshortener.user.UserRepository;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtTokenService jwtTokenService;
    @Mock
    private RefreshTokenService refreshTokenService;
    @InjectMocks
    private AuthService authService;

    @Test
    void register_createsUserAndReturnsTokenPair() {
        User saved = TestFixtures.user("user@example.com", Role.USER);
        when(userRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password1!")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenReturn(saved);
        when(jwtTokenService.createAccessToken(saved)).thenReturn("access-token");
        when(refreshTokenService.issue(saved)).thenReturn("refresh-token");
        when(jwtTokenService.accessTokenTtl()).thenReturn(Duration.ofMinutes(15));

        AuthResponse response = authService.register(new RegisterRequest("user@example.com", "Password1!"));

        assertThat(response.accessToken()).isEqualTo("access-token");
        assertThat(response.refreshToken()).isEqualTo("refresh-token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
    }

    @Test
    void register_throwsDuplicateResourceException_whenEmailAlreadyExists() {
        when(userRepository.existsByEmail("dup@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(new RegisterRequest("dup@example.com", "Password1!")))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void login_returnsTokenPair_onValidCredentials() {
        User user = TestFixtures.user("user@example.com", Role.USER);
        AppUserDetails details = new AppUserDetails(user);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(jwtTokenService.createAccessToken(user)).thenReturn("access");
        when(refreshTokenService.issue(user)).thenReturn("refresh");
        when(jwtTokenService.accessTokenTtl()).thenReturn(Duration.ofMinutes(15));

        AuthResponse response = authService.login(new LoginRequest("user@example.com", "Password1!"));

        assertThat(response.accessToken()).isEqualTo("access");
        assertThat(response.user().email()).isEqualTo("user@example.com");
    }

    @Test
    void logout_delegatesRevocationToRefreshTokenService() {
        authService.logout("some-refresh-token");
        verify(refreshTokenService).revoke("some-refresh-token");
    }

    @Test
    void logoutEverywhere_revokesAllSessionsForUser() {
        UUID userId = UUID.randomUUID();
        when(refreshTokenService.revokeAllForUser(userId)).thenReturn(3);

        authService.logoutEverywhere(userId);

        verify(refreshTokenService).revokeAllForUser(userId);
    }
}
