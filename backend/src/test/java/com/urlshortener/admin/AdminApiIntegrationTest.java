package com.urlshortener.admin;

import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.urlshortener.AbstractIntegrationTest;
import com.urlshortener.user.Role;
import com.urlshortener.user.User;
import com.urlshortener.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@AutoConfigureMockMvc
@Transactional
class AdminApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;

    private final JsonMapper json = JsonMapper.builder().build();
    private String adminToken;
    private String userToken;
    private User regularUser;

    @BeforeEach
    void setUp() throws Exception {
        User admin = new User("admin@admintest.local", passwordEncoder.encode("Admin123!"), Role.ADMIN);
        userRepository.save(admin);
        adminToken = loginAndGetToken("admin@admintest.local", "Admin123!");

        MvcResult r = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(APPLICATION_JSON)
                        .content("{\"email\":\"user@admintest.local\",\"password\":\"Password1!\"}"))
                .andExpect(status().isCreated()).andReturn();
        userToken = json.readTree(r.getResponse().getContentAsString()).path("accessToken").asText();
        regularUser = userRepository.findByEmail("user@admintest.local").orElseThrow();
    }

    // ── Security ──────────────────────────────────────────────────────────────

    @Test
    void listUsers_returns401_whenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")).andExpect(status().isUnauthorized());
    }

    @Test
    void listUrls_returns401_whenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/admin/urls")).andExpect(status().isUnauthorized());
    }

    @Test
    void globalStats_returns401_whenUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/admin/urls/stats")).andExpect(status().isUnauthorized());
    }

    @Test
    void listUsers_returns403_whenCallerIsNotAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users").header(AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void listUrls_returns403_whenCallerIsNotAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/admin/urls").header(AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    // ── listUsers ─────────────────────────────────────────────────────────────

    @Test
    void listUsers_returns200_withPageOfUsers_whenAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users").header(AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void listUsers_filtersBySearch() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header(AUTHORIZATION, "Bearer " + adminToken)
                        .param("search", "admintest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void listUsers_filtersByRole() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header(AUTHORIZATION, "Bearer " + adminToken)
                        .param("role", "ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void listUsers_filtersByEnabled() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header(AUTHORIZATION, "Bearer " + adminToken)
                        .param("enabled", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    // ── activate / deactivate user ────────────────────────────────────────────

    @Test
    void deactivateUser_returns200_andDisablesAccount() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/users/" + regularUser.getId() + "/deactivate")
                        .header(AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
    }

    @Test
    void activateUser_returns200_andEnablesAccount() throws Exception {
        regularUser.setEnabled(false);
        userRepository.save(regularUser);

        mockMvc.perform(patch("/api/v1/admin/users/" + regularUser.getId() + "/activate")
                        .header(AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));
    }

    @Test
    void deactivateUser_returns400_whenAdminDeactivatesSelf() throws Exception {
        User admin = userRepository.findByEmail("admin@admintest.local").orElseThrow();
        mockMvc.perform(patch("/api/v1/admin/users/" + admin.getId() + "/deactivate")
                        .header(AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deactivateUser_returns404_forUnknownUser() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/users/00000000-0000-0000-0000-000000000000/deactivate")
                        .header(AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    // ── listUrls / stats / delete ─────────────────────────────────────────────

    @Test
    void listUrls_returns200_withAllUrls() throws Exception {
        mockMvc.perform(get("/api/v1/admin/urls").header(AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void globalStats_returns200_withCounters() throws Exception {
        mockMvc.perform(get("/api/v1/admin/urls/stats").header(AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUrls").isNumber())
                .andExpect(jsonPath("$.totalClicks").isNumber());
    }

    @Test
    void deleteUrl_returns204_whenAdmin() throws Exception {
        MvcResult create = mockMvc.perform(post("/api/v1/urls")
                        .header(AUTHORIZATION, "Bearer " + userToken)
                        .contentType(APPLICATION_JSON)
                        .content("{\"originalUrl\":\"https://todelete.example.com\"}"))
                .andExpect(status().isCreated()).andReturn();

        String urlId = json.readTree(create.getResponse().getContentAsString()).path("id").asText();

        mockMvc.perform(delete("/api/v1/admin/urls/" + urlId).header(AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void listUrls_filtersByOwnerEmail() throws Exception {
        mockMvc.perform(get("/api/v1/admin/urls")
                        .header(AUTHORIZATION, "Bearer " + adminToken)
                        .param("ownerEmail", "admintest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String loginAndGetToken(String email, String password) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return json.readTree(r.getResponse().getContentAsString()).path("accessToken").asText();
    }
}
