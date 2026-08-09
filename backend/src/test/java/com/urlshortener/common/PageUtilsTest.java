package com.urlshortener.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

class PageUtilsTest {

    @Test
    void sanitizeCapsPageSizeAndKeepsAllowedSort() {
        Pageable input = PageRequest.of(0, 10_000, Sort.by("createdAt").descending());
        Pageable sanitized = PageUtils.sanitize(input, Set.of("createdAt"), Sort.by("createdAt").descending());
        assertThat(sanitized.getPageSize()).isEqualTo(PageUtils.MAX_PAGE_SIZE);
        assertThat(sanitized.getSort().toString()).contains("createdAt");
    }
}
