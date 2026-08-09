package com.urlshortener.url;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import org.junit.jupiter.api.Test;

class ShortCodeGeneratorTest {

    private final ShortCodeGenerator generator = new ShortCodeGenerator();

    @Test
    void generatesCodeOfTheRequestedLength() {
        assertThat(generator.generate(7)).hasSize(7);
    }

    @Test
    void rejectsZeroLength() {
        assertThatIllegalArgumentException().isThrownBy(() -> generator.generate(0));
    }

    @Test
    void usesOnlyUrlSafeCharacters() {
        assertThat(generator.generate(200)).matches("^[A-Za-z0-9]+$");
    }
}
