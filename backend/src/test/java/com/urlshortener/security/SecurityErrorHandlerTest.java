package com.urlshortener.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import tools.jackson.databind.json.JsonMapper;

class SecurityErrorHandlerTest {

    private SecurityErrorHandler handler;

    @BeforeEach
    void setUp() {
        handler = new SecurityErrorHandler(JsonMapper.builder().build());
    }

    @Test
    void commence_writes401WithWwwAuthenticateHeader() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/urls");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.commence(request, response, new BadCredentialsException("bad credentials"));

        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(response.getHeader("WWW-Authenticate")).isEqualTo("Bearer");
        assertThat(response.getContentType()).contains("problem+json");
    }

    @Test
    void handle_writes403WithProblemBody() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/users");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.handle(request, response, new AccessDeniedException("forbidden"));

        assertThat(response.getStatus()).isEqualTo(HttpStatus.FORBIDDEN.value());
        assertThat(response.getContentType()).contains("problem+json");
        assertThat(response.getContentAsString()).contains("forbidden");
    }

    @Test
    void commence_includesDisabledMessage_forDisabledAccountException() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/urls");
        MockHttpServletResponse response = new MockHttpServletResponse();

        org.springframework.security.authentication.DisabledException ex =
                new org.springframework.security.authentication.DisabledException("This account has been deactivated.");
        handler.commence(request, response, ex);

        assertThat(response.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(response.getContentAsString()).contains("deactivated");
    }
}
