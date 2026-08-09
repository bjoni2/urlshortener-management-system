package com.urlshortener.user;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class UserSearchCriteriaTest {

    @Test
    void constructor_andAccessors_work() {
        UserSearchCriteria criteria = new UserSearchCriteria("example.com", Role.ADMIN, true);

        assertThat(criteria.search()).isEqualTo("example.com");
        assertThat(criteria.role()).isEqualTo(Role.ADMIN);
        assertThat(criteria.enabled()).isTrue();
    }

    @Test
    void nullFields_areAllowed() {
        UserSearchCriteria criteria = new UserSearchCriteria(null, null, null);

        assertThat(criteria.search()).isNull();
        assertThat(criteria.role()).isNull();
        assertThat(criteria.enabled()).isNull();
    }

    @Test
    void equals_andHashCode_areValueBased() {
        UserSearchCriteria a = new UserSearchCriteria("test", Role.USER, false);
        UserSearchCriteria b = new UserSearchCriteria("test", Role.USER, false);

        assertThat(a).isEqualTo(b);
        assertThat(a.hashCode()).isEqualTo(b.hashCode());
    }
}
