package com.urlshortener.user;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class UserTest {

    @Test
    void emailIsNormalisedOnConstruction() {
        User user = new User(" Jane@Example.COM ", "{bcrypt}hash", Role.USER);
        assertThat(user.getEmail()).isEqualTo("jane@example.com");
        assertThat(user.isEnabled()).isTrue();
    }

    @Test
    void deactivateAndActivateToggle() {
        User user = new User("a@b.co", "hash", Role.USER);
        user.deactivate();
        assertThat(user.isEnabled()).isFalse();
        user.activate();
        assertThat(user.isEnabled()).isTrue();
    }

    @Test
    void adminRoleIsRecognised() {
        assertThat(new User("a@b.co", "hash", Role.ADMIN).isAdmin()).isTrue();
        assertThat(new User("a@b.co", "hash", Role.USER).isAdmin()).isFalse();
    }
}
