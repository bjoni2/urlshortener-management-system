package com.urlshortener.url.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Aggregate usage statistics")
public record UrlStatsResponse(
        long totalUrls, long activeUrls, long inactiveUrls, long expiredUrls, long totalClicks) {}
