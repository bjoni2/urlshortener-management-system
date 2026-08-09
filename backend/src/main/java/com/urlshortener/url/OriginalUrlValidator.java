package com.urlshortener.url;

import com.urlshortener.common.exception.BusinessRuleException;
import com.urlshortener.config.AppProperties;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class OriginalUrlValidator {

    private static final Set<String> ALLOWED_SCHEMES = Set.of("http", "https");

    private final AppProperties appProperties;

    public OriginalUrlValidator(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    
    public String validate(String candidate) {
        String trimmed = candidate == null ? "" : candidate.trim();
        if (trimmed.isEmpty()) {
            throw new BusinessRuleException("The URL is required.");
        }

        URI uri;
        try {
            uri = new URI(trimmed);
        } catch (URISyntaxException ex) {
            throw new BusinessRuleException("The URL is not well-formed.");
        }

        if (uri.getScheme() == null || !ALLOWED_SCHEMES.contains(uri.getScheme().toLowerCase(Locale.ROOT))) {
            throw new BusinessRuleException("Only http and https URLs can be shortened.");
        }
        if (uri.getHost() == null || uri.getHost().isBlank()) {
            throw new BusinessRuleException("The URL must include a host name.");
        }
        if (isOwnShortUrl(trimmed)) {
            throw new BusinessRuleException("This is already a short link from this service.");
        }
        return trimmed;
    }

    private boolean isOwnShortUrl(String candidate) {
        String base = appProperties.shortUrl().baseUrl().toLowerCase(Locale.ROOT);
        return candidate.toLowerCase(Locale.ROOT).startsWith(base);
    }
}
