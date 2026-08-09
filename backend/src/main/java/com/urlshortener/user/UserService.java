package com.urlshortener.user;

import com.urlshortener.auth.RefreshTokenService;
import com.urlshortener.common.PageResponse;
import com.urlshortener.common.PageUtils;
import com.urlshortener.common.exception.BusinessRuleException;
import com.urlshortener.common.exception.ResourceNotFoundException;
import com.urlshortener.security.AuthenticatedUser;
import com.urlshortener.user.dto.UserResponse;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    static final Set<String> SORTABLE_PROPERTIES = Set.of("email", "role", "enabled", "createdAt", "updatedAt");
    private static final Sort DEFAULT_SORT = Sort.by(Sort.Direction.DESC, "createdAt");

    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;

    public UserService(UserRepository userRepository, RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(AuthenticatedUser caller) {
        return userRepository
                .findById(caller.id())
                .map(UserResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("The account no longer exists."));
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> search(UserSearchCriteria criteria, Pageable pageable) {
        Specification<User> specification = Specification.allOf(
                UserSpecifications.emailContains(criteria.search()),
                UserSpecifications.hasRole(criteria.role()),
                UserSpecifications.isEnabled(criteria.enabled()));

        Pageable sanitized = PageUtils.sanitize(pageable, SORTABLE_PROPERTIES, DEFAULT_SORT);
        return PageResponse.from(userRepository.findAll(specification, sanitized), UserResponse::from);
    }

    

    @Transactional
    public UserResponse setEnabled(AuthenticatedUser caller, UUID userId, boolean enabled) {
        if (caller.id().equals(userId) && !enabled) {
            throw new BusinessRuleException("You cannot deactivate your own account.");
        }

        User user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        if (enabled) {
            user.activate();
        } else {
            user.deactivate();
            refreshTokenService.revokeAllForUser(userId);
        }

        UserResponse response = UserResponse.from(userRepository.save(user));
        log.info("Administrator {} set account {} enabled={}", caller.id(), userId, enabled);
        return response;
    }
}
