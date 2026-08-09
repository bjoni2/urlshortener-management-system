package com.urlshortener.security;

import com.urlshortener.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AccountStatusFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;
    private final AuthenticationEntryPoint authenticationEntryPoint;

    public AccountStatusFilter(UserRepository userRepository, AuthenticationEntryPoint authenticationEntryPoint) {
        this.userRepository = userRepository;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof Jwt jwt
                && !isActive(jwt)) {

            SecurityContextHolder.clearContext();
            authenticationEntryPoint.commence(
                    request, response, new DisabledException("This account has been deactivated."));
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean isActive(Jwt jwt) {
        try {
            return userRepository.existsByIdAndEnabledTrue(UUID.fromString(jwt.getSubject()));
        } catch (IllegalArgumentException ex) {
            
            return false;
        }
    }
}
