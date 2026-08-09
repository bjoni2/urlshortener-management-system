package com.urlshortener.common;

import java.util.List;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class PageUtils {

    public static final int MAX_PAGE_SIZE = 100;
    public static final int DEFAULT_PAGE_SIZE = 20;

    private PageUtils() {}

    public static Pageable sanitize(Pageable pageable, Set<String> sortableProperties, Sort fallbackSort) {
        
        int size = pageable.isPaged() ? Math.clamp(pageable.getPageSize(), 1, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
        int page = pageable.isPaged() ? Math.max(pageable.getPageNumber(), 0) : 0;
        return PageRequest.of(page, size, sanitizeSort(pageable.getSort(), sortableProperties, fallbackSort));
    }

    static Sort sanitizeSort(Sort requested, Set<String> sortableProperties, Sort fallbackSort) {
        List<Sort.Order> allowed = requested.stream()
                .filter(order -> sortableProperties.contains(order.getProperty()))
                .toList();
        return allowed.isEmpty() ? fallbackSort : Sort.by(allowed);
    }
}
