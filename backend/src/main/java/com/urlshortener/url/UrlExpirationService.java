package com.urlshortener.url;

import com.urlshortener.config.AppProperties;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UrlExpirationService {

    private final ShortUrlRepository shortUrlRepository;
    private final AppProperties appProperties;
    private final Clock clock;

    public UrlExpirationService(ShortUrlRepository shortUrlRepository, AppProperties appProperties, Clock clock) {
        this.shortUrlRepository = shortUrlRepository;
        this.appProperties = appProperties;
        this.clock = clock;
    }

    
    @Transactional
    public int markExpired() {
        return shortUrlRepository.markExpired(clock.instant());
    }

    

    @Transactional
    public int purgeExpired() {
        AppProperties.Expiration config = appProperties.expiration();
        if (!config.purgeEnabled()) {
            return 0;
        }
        Instant cutoff = clock.instant().minus(config.purgeAfter());
        List<UUID> candidates = shortUrlRepository.findPurgeCandidates(cutoff, Limit.of(config.batchSize()));
        if (candidates.isEmpty()) {
            return 0;
        }
        shortUrlRepository.deleteAllByIdInBatch(candidates);
        return candidates.size();
    }
}
