package com.urlshortener.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.urlshortener.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class AdminApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listUsers_returns401_whenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void globalStats_returns401_whenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/admin/urls/stats"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void listUrls_returns401_whenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/admin/urls"))
                .andExpect(status().isUnauthorized());
    }
}
