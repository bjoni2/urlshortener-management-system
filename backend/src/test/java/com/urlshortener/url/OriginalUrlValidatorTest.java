package com.urlshortener.url;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.urlshortener.TestFixtures;
import com.urlshortener.common.exception.BusinessRuleException;
import org.junit.jupiter.api.Test;

class OriginalUrlValidatorTest {

    private final OriginalUrlValidator validator = new OriginalUrlValidator(TestFixtures.appProperties());

    @Test
    void acceptsHttpsUrl() {
        assertThat(validator.validate("https://example.com")).isEqualTo("https://example.com");
    }

    @Test
    void trimsSurroundingWhitespace() {
        assertThat(validator.validate("  https://example.com  ")).isEqualTo("https://example.com");
    }

    @Test
    void rejectsEmptyUrl() {
        assertThatThrownBy(() -> validator.validate(""))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void rejectsNonHttpScheme() {
        assertThatThrownBy(() -> validator.validate("ftp://example.com"))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void rejectsOwnShortLinks() {
        assertThatThrownBy(() -> validator.validate(TestFixtures.SHORT_URL_BASE + "/aB3dEf9"))
                .isInstanceOf(BusinessRuleException.class);
    }
}
