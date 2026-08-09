package com.urlshortener.config;

import com.urlshortener.user.Role;
import com.urlshortener.user.User;
import com.urlshortener.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(prefix = "app.security.bootstrap-admin", name = "enabled", havingValue = "true")
public class AdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;

    public AdminSeeder(
            UserRepository userRepository, PasswordEncoder passwordEncoder, AppProperties appProperties) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.appProperties = appProperties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        AppProperties.Security.BootstrapAdmin config = appProperties.security().bootstrapAdmin();
        String email = User.normalizeEmail(config.email());

        if (userRepository.existsByEmail(email)) {
            log.debug("Bootstrap administrator {} already present", email);
            return;
        }

        userRepository.save(new User(email, passwordEncoder.encode(config.password()), Role.ADMIN));
        log.warn(
                "Created bootstrap administrator {}. Change this password before exposing the application.",
                email);
    }
}
