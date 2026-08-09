package com.urlshortener.url;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/r")
@Tag(name = "Redirect", description = "Public resolution of short links")
@SecurityRequirements
public class RedirectController {

    private final ShortUrlService shortUrlService;

    public RedirectController(ShortUrlService shortUrlService) {
        this.shortUrlService = shortUrlService;
    }

    @GetMapping("/{shortCode}")
    @Operation(summary = "Resolve a short code and record the visit")
    @ApiResponses({
        @ApiResponse(responseCode = "302", description = "Redirect to the original URL", content = @Content),
        @ApiResponse(responseCode = "404", description = "Unknown short code", content = @Content),
        @ApiResponse(responseCode = "410", description = "The link is deactivated or expired", content = @Content)
    })
    public ResponseEntity<Void> redirect(
            @PathVariable
                    @Size(max = 64)
                    @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Not a valid short code")
                    String shortCode) {

        String target = shortUrlService.resolveForRedirect(shortCode);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(target))
                .cacheControl(CacheControl.noStore())
                .build();
    }
}
