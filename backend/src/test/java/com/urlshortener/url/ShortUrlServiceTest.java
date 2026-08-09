package com.urlshortener.url;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.urlshortener.TestFixtures;
import com.urlshortener.common.exception.BusinessRuleException;
import com.urlshortener.common.exception.DuplicateResourceException;
import com.urlshortener.common.exception.LinkGoneException;
import com.urlshortener.common.exception.ResourceNotFoundException;
import com.urlshortener.security.AuthenticatedUser;
import com.urlshortener.url.dto.CreateShortUrlRequest;
import com.urlshortener.url.dto.ShortUrlResponse;
import com.urlshortener.user.Role;
import com.urlshortener.user.User;
import com.urlshortener.user.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

@ExtendWith(MockitoExtension.class)
class ShortUrlServiceTest {

    @Mock private ShortUrlRepository shortUrlRepository;
    @Mock private UserRepository userRepository;
    @Mock private ShortCodeGenerator shortCodeGenerator;
    @Mock private OriginalUrlValidator originalUrlValidator;
    @Mock private PlatformTransactionManager transactionManager;
    @Mock private TransactionStatus transactionStatus;

    private ShortUrlService shortUrlService;
    private User owner;
    private AuthenticatedUser caller;

    @BeforeEach
    void setUp() {
        Clock fixed = Clock.fixed(TestFixtures.NOW, ZoneOffset.UTC);
        shortUrlService = new ShortUrlService(
                shortUrlRepository,
                userRepository,
                shortCodeGenerator,
                originalUrlValidator,
                TestFixtures.appProperties(),
                fixed,
                transactionManager);
        owner = TestFixtures.user("user@example.com", Role.USER);
        caller = TestFixtures.caller(owner);
    }

    @Test
    void create_returnsShortUrlResponse_forValidRequest() {
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
        when(originalUrlValidator.validate(anyString())).thenReturn("https://example.com");
        when(shortCodeGenerator.generate(7)).thenReturn("abc1234");
        when(shortUrlRepository.existsByShortCode("abc1234")).thenReturn(false);
        ShortUrl entity = buildActiveUrl("abc1234", "https://example.com", TestFixtures.NOW.plusSeconds(3600));
        when(shortUrlRepository.save(any())).thenReturn(entity);

        ShortUrlResponse response = shortUrlService.create(caller,
                new CreateShortUrlRequest("https://example.com", null, null));

        assertThat(response.shortCode()).isEqualTo("abc1234");
        assertThat(response.originalUrl()).isEqualTo("https://example.com");
        assertThat(response.status()).isEqualTo(UrlStatus.ACTIVE);
    }

    @Test
    void create_throwsDuplicateResourceException_whenCustomAliasAlreadyTaken() {
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
        when(originalUrlValidator.validate(anyString())).thenReturn("https://example.com");
        when(shortUrlRepository.existsByShortCode("myalias")).thenReturn(true);

        assertThatThrownBy(() -> shortUrlService.create(caller,
                new CreateShortUrlRequest("https://example.com", "myalias", null)))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("already in use");
    }

    @Test
    void create_throwsBusinessRule_whenAliasIsReserved() {
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
        when(originalUrlValidator.validate(anyString())).thenReturn("https://example.com");

        assertThatThrownBy(() -> shortUrlService.create(caller,
                new CreateShortUrlRequest("https://example.com", "api", null)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("reserved");
    }

    @Test
    void create_throwsBusinessRule_whenExpiryIsInThePast() {
        when(userRepository.findById(owner.getId())).thenReturn(Optional.of(owner));
        when(originalUrlValidator.validate(anyString())).thenReturn("https://example.com");

        assertThatThrownBy(() -> shortUrlService.create(caller,
                new CreateShortUrlRequest("https://example.com", null,
                        TestFixtures.NOW.minusSeconds(1))))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void resolveForRedirect_returnsOriginalUrl_whenActiveAndNotExpired() {
        ShortUrl url = buildActiveUrl("abc1234", "https://example.com", TestFixtures.NOW.plusSeconds(3600));
        when(shortUrlRepository.findByShortCode("abc1234")).thenReturn(Optional.of(url));

        String result = shortUrlService.resolveForRedirect("abc1234");

        assertThat(result).isEqualTo("https://example.com");
        verify(shortUrlRepository).registerClick(url.getId(), TestFixtures.NOW);
    }

    @Test
    void resolveForRedirect_throwsLinkGone_whenExpired() {
        ShortUrl url = buildActiveUrl("exp1234", "https://example.com", TestFixtures.NOW.minusSeconds(1));
        when(shortUrlRepository.findByShortCode("exp1234")).thenReturn(Optional.of(url));
        when(transactionManager.getTransaction(any())).thenReturn(transactionStatus);
        when(shortUrlRepository.save(any())).thenReturn(url);

        assertThatThrownBy(() -> shortUrlService.resolveForRedirect("exp1234"))
                .isInstanceOf(LinkGoneException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void resolveForRedirect_throwsLinkGone_whenDeactivated() {
        ShortUrl url = buildActiveUrl("off1234", "https://example.com", TestFixtures.NOW.plusSeconds(3600));
        url.deactivate();
        when(shortUrlRepository.findByShortCode("off1234")).thenReturn(Optional.of(url));

        assertThatThrownBy(() -> shortUrlService.resolveForRedirect("off1234"))
                .isInstanceOf(LinkGoneException.class)
                .hasMessageContaining("deactivated");
    }

    @Test
    void resolveForRedirect_throwsResourceNotFoundException_whenShortCodeDoesNotExist() {
        when(shortUrlRepository.findByShortCode("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> shortUrlService.resolveForRedirect("missing"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_removesEntity_forOwner() {
        ShortUrl url = buildActiveUrl("abc1234", "https://example.com", TestFixtures.NOW.plusSeconds(3600));
        when(shortUrlRepository.findByIdAndOwnerId(url.getId(), owner.getId()))
                .thenReturn(Optional.of(url));

        shortUrlService.delete(caller, url.getId());

        verify(shortUrlRepository).delete(url);
    }

    private ShortUrl buildActiveUrl(String code, String originalUrl, Instant expiresAt) {
        ShortUrl url = new ShortUrl(code, originalUrl, owner, expiresAt, false);
        url.setId(UUID.randomUUID());
        url.setCreatedAt(TestFixtures.NOW);
        url.setUpdatedAt(TestFixtures.NOW);
        return url;
    }
}
