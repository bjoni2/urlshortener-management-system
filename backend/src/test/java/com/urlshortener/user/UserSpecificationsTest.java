package com.urlshortener.user;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

class UserSpecificationsTest {

    @Test
    void emailContains_returnsUnrestricted_whenNull() {
        Specification<User> spec = UserSpecifications.emailContains(null);
        assertThat(spec).isEqualTo(Specification.unrestricted());
    }

    @Test
    void emailContains_returnsUnrestricted_whenBlank() {
        Specification<User> spec = UserSpecifications.emailContains("   ");
        assertThat(spec).isEqualTo(Specification.unrestricted());
    }

    @Test
    void emailContains_returnsNonNull_whenTermProvided() {
        Specification<User> spec = UserSpecifications.emailContains("example");
        assertThat(spec).isNotNull();
        assertThat(spec).isNotEqualTo(Specification.unrestricted());
    }

    @Test
    void hasRole_returnsUnrestricted_whenNull() {
        Specification<User> spec = UserSpecifications.hasRole(null);
        assertThat(spec).isEqualTo(Specification.unrestricted());
    }

    @Test
    void hasRole_returnsNonNull_whenRoleProvided() {
        Specification<User> spec = UserSpecifications.hasRole(Role.ADMIN);
        assertThat(spec).isNotNull();
        assertThat(spec).isNotEqualTo(Specification.unrestricted());
    }

    @Test
    void isEnabled_returnsUnrestricted_whenNull() {
        Specification<User> spec = UserSpecifications.isEnabled(null);
        assertThat(spec).isEqualTo(Specification.unrestricted());
    }

    @Test
    void isEnabled_returnsNonNull_whenValueProvided() {
        Specification<User> specTrue = UserSpecifications.isEnabled(true);
        Specification<User> specFalse = UserSpecifications.isEnabled(false);
        assertThat(specTrue).isNotNull();
        assertThat(specFalse).isNotNull();
        assertThat(specTrue).isNotEqualTo(Specification.unrestricted());
    }
}
