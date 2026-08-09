package com.urlshortener.security;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.urlshortener.user.UserRepository;
import jakarta.servlet.FilterChain;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.AuthenticationEntryPoint;

@ExtendWith(MockitoExtension.class)
class AccountStatusFilterTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private AuthenticationEntryPoint authenticationEntryPoint;
    @Mock
    private FilterChain filterChain;
    @Mock
    private Jwt jwt;
    @InjectMocks
    private AccountStatusFilter accountStatusFilter;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void passesThrough_whenNoAuthenticationInContext() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        SecurityContextHolder.clearContext();

        accountStatusFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(authenticationEntryPoint, never()).commence(any(), any(), any());
    }

    @Test
    void passesThrough_whenUserIsActive() throws Exception {
        UUID userId = UUID.randomUUID();
        when(jwt.getSubject()).thenReturn(userId.toString());
        when(userRepository.existsByIdAndEnabledTrue(userId)).thenReturn(true);
        JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        accountStatusFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    void blocksRequest_andCallsEntryPoint_whenUserIsDisabled() throws Exception {
        UUID userId = UUID.randomUUID();
        when(jwt.getSubject()).thenReturn(userId.toString());
        when(userRepository.existsByIdAndEnabledTrue(userId)).thenReturn(false);
        JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        accountStatusFilter.doFilter(request, response, filterChain);

        verify(filterChain, never()).doFilter(any(), any());
        verify(authenticationEntryPoint).commence(eq(request), eq(response), any());
    }
}
