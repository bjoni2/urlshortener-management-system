package com.urlshortener.admin;

import com.urlshortener.common.PageResponse;
import com.urlshortener.security.AuthenticatedUser;
import com.urlshortener.url.ShortUrlService;
import com.urlshortener.url.UrlSearchCriteria;
import com.urlshortener.url.dto.ShortUrlResponse;
import com.urlshortener.url.dto.UrlStatsResponse;
import com.urlshortener.user.UserSearchCriteria;
import com.urlshortener.user.UserService;
import com.urlshortener.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Administration", description = "Manage users and inspect every short URL")
@ApiResponse(responseCode = "403", description = "Caller is not an administrator", content = @Content)
public class AdminController {

    private final UserService userService;
    private final ShortUrlService shortUrlService;

    public AdminController(UserService userService, ShortUrlService shortUrlService) {
        this.userService = userService;
        this.shortUrlService = shortUrlService;
    }

    @GetMapping("/users")
    @Operation(summary = "List registered users, searchable by email and filterable by role and state")
    public PageResponse<UserResponse> listUsers(
            @ParameterObject UserSearchCriteria criteria,
            @ParameterObject @PageableDefault(size = 10) Pageable pageable) {
        return userService.search(criteria, pageable);
    }

    @PatchMapping("/users/{id}/activate")
    @Operation(summary = "Activate a user account")
    public UserResponse activateUser(AuthenticatedUser caller, @PathVariable UUID id) {
        return userService.setEnabled(caller, id, true);
    }

    @PatchMapping("/users/{id}/deactivate")
    @Operation(
            summary = "Deactivate a user account",
            description = "Revokes the account's refresh tokens and blocks its existing access tokens at once.")
    @ApiResponse(responseCode = "400", description = "Administrators cannot deactivate themselves", content = @Content)
    public UserResponse deactivateUser(AuthenticatedUser caller, @PathVariable UUID id) {
        return userService.setEnabled(caller, id, false);
    }

    @GetMapping("/urls")
    @Operation(summary = "List every short URL in the system, with the same search, filter and sort options")
    public PageResponse<ShortUrlResponse> listUrls(
            @ParameterObject UrlSearchCriteria criteria,
            @ParameterObject @PageableDefault(size = 10) Pageable pageable) {
        return shortUrlService.searchAll(criteria, pageable);
    }

    @GetMapping("/urls/stats")
    @Operation(summary = "System-wide URL counters")
    public UrlStatsResponse globalStats() {
        return shortUrlService.globalStats();
    }

    @DeleteMapping("/urls/{id}")
    @Operation(summary = "Delete any short URL")
    @ApiResponse(responseCode = "204", description = "Deleted")
    public ResponseEntity<Void> deleteUrl(AuthenticatedUser caller, @PathVariable UUID id) {
        shortUrlService.delete(caller, id);
        return ResponseEntity.noContent().build();
    }
}
