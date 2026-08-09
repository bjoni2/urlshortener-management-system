package com.urlshortener.url;

import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.urlshortener.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@AutoConfigureMockMvc
@Transactional
class ShortUrlApiIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Test
    void createShortUrl_returns201_forAuthenticatedUser() throws Exception {
        String token = registerAndGetToken("urltest@example.com");

        mockMvc.perform(post("/api/v1/urls")
                        .header(AUTHORIZATION, "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"originalUrl":"https://example.com"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.shortCode").isNotEmpty())
                .andExpect(jsonPath("$.originalUrl").value("https://example.com"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void listUrls_returns200_withEmptyPageForNewUser() throws Exception {
        String token = registerAndGetToken("listempty@example.com");

        mockMvc.perform(get("/api/v1/urls")
                        .header(AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void createUrl_returns401_whenUnauthenticated() throws Exception {
        mockMvc.perform(post("/api/v1/urls")
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"originalUrl":"https://example.com"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getUrl_returns404_forNonExistentId() throws Exception {
        String token = registerAndGetToken("notfound@example.com");

        mockMvc.perform(get("/api/v1/urls/00000000-0000-0000-0000-000000000000")
                        .header(AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void createThenDeleteShortUrl_returns204() throws Exception {
        String token = registerAndGetToken("deletetest@example.com");

        MvcResult createResult = mockMvc.perform(post("/api/v1/urls")
                        .header(AUTHORIZATION, "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"originalUrl":"https://delete-me.example.com"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode created = jsonMapper.readTree(createResult.getResponse().getContentAsString());
        String id = created.path("id").asText();

        mockMvc.perform(delete("/api/v1/urls/" + id)
                        .header(AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    private String registerAndGetToken(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Password1!\"}")
                )
                .andExpect(status().isCreated())
                .andReturn();

        return jsonMapper.readTree(result.getResponse().getContentAsString())
                .path("accessToken").asText();
    }
}
