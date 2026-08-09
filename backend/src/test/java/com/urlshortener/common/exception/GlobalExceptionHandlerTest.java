package com.urlshortener.common.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        request = new MockHttpServletRequest("GET", "/api/v1/urls/abc");
    }

    @Test
    void handleNotFound_returns404WithDetail() {
        ProblemDetail detail = handler.handleNotFound(
                new ResourceNotFoundException("Short URL not found."), request);

        assertThat(detail.getStatus()).isEqualTo(HttpStatus.NOT_FOUND.value());
        assertThat(detail.getDetail()).isEqualTo("Short URL not found.");
        assertThat(detail.getTitle()).isEqualTo("Resource not found");
    }

    @Test
    void handleDuplicate_returns409() {
        ProblemDetail detail = handler.handleDuplicate(
                new DuplicateResourceException("Email already registered."), request);

        assertThat(detail.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(detail.getDetail()).isEqualTo("Email already registered.");
    }

    @Test
    void handleBusinessRule_returns400() {
        ProblemDetail detail = handler.handleBusinessRule(
                new BusinessRuleException("Alias is reserved."), request);

        assertThat(detail.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(detail.getDetail()).contains("Alias");
    }

    @Test
    void handleInvalidToken_returns401() {
        ProblemDetail detail = handler.handleInvalidToken(
                new InvalidTokenException("Token expired."), request);

        assertThat(detail.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(detail.getDetail()).isEqualTo("Token expired.");
    }

    @Test
    void handleBadCredentials_returns401WithGenericMessage() {
        ProblemDetail detail = handler.handleBadCredentials(
                new BadCredentialsException("wrong"), request);

        assertThat(detail.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(detail.getDetail()).contains("Invalid email or password");
    }

    @Test
    void handleLinkGone_returns410() {
        ProblemDetail detail = handler.handleLinkGone(
                new LinkGoneException("This link has expired."), request);

        assertThat(detail.getStatus()).isEqualTo(HttpStatus.GONE.value());
    }

    @Test
    void handleUnexpected_returns500() {
        ProblemDetail detail = handler.handleUnexpected(
                new RuntimeException("Something went wrong"), request);

        assertThat(detail.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value());
    }
}
