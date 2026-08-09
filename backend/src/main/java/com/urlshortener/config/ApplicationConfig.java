package com.urlshortener.config;

import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
@EnableJpaAuditing
@EnableConfigurationProperties(AppProperties.class)
public class ApplicationConfig {

    

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
