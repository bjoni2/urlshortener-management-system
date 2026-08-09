package com.urlshortener;

import static org.assertj.core.api.Assertions.assertThat;

import com.urlshortener.url.ShortUrlRepository;
import com.urlshortener.user.UserRepository;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class ApplicationContextTest {

    @Autowired
    private Flyway flyway;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ShortUrlRepository shortUrlRepository;

    @Test
    void contextLoads() {
        assertThat(flyway.info().applied()).isNotEmpty();
        assertThat(userRepository.count()).isZero();
        assertThat(shortUrlRepository.count()).isZero();
    }
}
