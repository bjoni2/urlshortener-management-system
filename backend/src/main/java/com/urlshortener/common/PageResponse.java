package com.urlshortener.common;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

@Schema(description = "A page of results")
public record PageResponse<T>(
        List<T> content,
        @Schema(description = "Zero-based page index") int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last) {

    public static <S, T> PageResponse<T> from(Page<S> page, Function<S, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast());
    }
}
