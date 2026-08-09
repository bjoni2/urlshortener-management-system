package com.urlshortener.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuditableEntityTest {

    static class ConcreteEntity extends AuditableEntity {}

    @Test
    void getId_setId_roundTrip() {
        ConcreteEntity e = new ConcreteEntity();
        UUID id = UUID.randomUUID();
        e.setId(id);
        assertThat(e.getId()).isEqualTo(id);
    }

    @Test
    void getCreatedAt_setCreatedAt_roundTrip() {
        ConcreteEntity e = new ConcreteEntity();
        Instant now = Instant.now();
        e.setCreatedAt(now);
        assertThat(e.getCreatedAt()).isEqualTo(now);
    }

    @Test
    void getUpdatedAt_setUpdatedAt_roundTrip() {
        ConcreteEntity e = new ConcreteEntity();
        Instant now = Instant.now();
        e.setUpdatedAt(now);
        assertThat(e.getUpdatedAt()).isEqualTo(now);
    }

    @Test
    void equals_isTrue_whenSameInstance() {
        ConcreteEntity e = new ConcreteEntity();
        e.setId(UUID.randomUUID());
        assertThat(e).isEqualTo(e);
    }

    @Test
    void equals_isTrue_whenSameIdAndSameClass() {
        UUID id = UUID.randomUUID();
        ConcreteEntity a = new ConcreteEntity();
        a.setId(id);
        ConcreteEntity b = new ConcreteEntity();
        b.setId(id);
        assertThat(a).isEqualTo(b);
    }

    @Test
    void equals_isFalse_whenDifferentId() {
        ConcreteEntity a = new ConcreteEntity();
        a.setId(UUID.randomUUID());
        ConcreteEntity b = new ConcreteEntity();
        b.setId(UUID.randomUUID());
        assertThat(a).isNotEqualTo(b);
    }

    @Test
    void equals_isFalse_whenIdIsNull() {
        ConcreteEntity a = new ConcreteEntity();
        ConcreteEntity b = new ConcreteEntity();
        assertThat(a).isNotEqualTo(b);
    }

    @Test
    void equals_isFalse_whenOtherIsNull() {
        ConcreteEntity e = new ConcreteEntity();
        e.setId(UUID.randomUUID());
        assertThat(e).isNotEqualTo(null);
    }

    @Test
    void equals_isFalse_whenOtherIsDifferentType() {
        ConcreteEntity e = new ConcreteEntity();
        e.setId(UUID.randomUUID());
        assertThat(e).isNotEqualTo("a string");
    }

    @Test
    void hashCode_isIdHashCode_whenIdNotNull() {
        UUID id = UUID.randomUUID();
        ConcreteEntity e = new ConcreteEntity();
        e.setId(id);
        assertThat(e.hashCode()).isEqualTo(id.hashCode());
    }

    @Test
    void hashCode_isIdentityHashCode_whenIdIsNull() {
        ConcreteEntity e = new ConcreteEntity();
        assertThat(e.hashCode()).isEqualTo(System.identityHashCode(e));
    }
}
