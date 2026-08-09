package com.urlshortener.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.urlshortener.TestFixtures;
import com.urlshortener.auth.RefreshTokenService;
import com.urlshortener.common.exception.BusinessRuleException;
import com.urlshortener.common.exception.ResourceNotFoundException;
import com.urlshortener.security.AuthenticatedUser;
import com.urlshortener.user.dto.UserResponse;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RefreshTokenService refreshTokenService;
    @InjectMocks
    private UserService userService;

    @Test
    void getCurrentUser_returnsUserResponse() {
        User user = TestFixtures.user("alice@example.com", Role.USER);
        AuthenticatedUser caller = TestFixtures.caller(user);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        UserResponse response = userService.getCurrentUser(caller);

        assertThat(response.email()).isEqualTo("alice@example.com");
        assertThat(response.role()).isEqualTo(Role.USER);
    }

    @Test
    void getCurrentUser_throwsResourceNotFoundException_whenUserDeleted() {
        User user = TestFixtures.user("gone@example.com", Role.USER);
        AuthenticatedUser caller = TestFixtures.caller(user);
        when(userRepository.findById(user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getCurrentUser(caller))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void setEnabled_false_disablesUser_andRevokesRefreshTokens() {
        User admin = TestFixtures.user("admin@example.com", Role.ADMIN);
        AuthenticatedUser caller = TestFixtures.caller(admin);
        User target = TestFixtures.user("user@example.com", Role.USER);
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));
        when(userRepository.save(target)).thenReturn(target);

        userService.setEnabled(caller, target.getId(), false);

        assertThat(target.isEnabled()).isFalse();
        verify(refreshTokenService).revokeAllForUser(target.getId());
    }

    @Test
    void setEnabled_true_activatesUser_withoutRevokingTokens() {
        User admin = TestFixtures.user("admin@example.com", Role.ADMIN);
        AuthenticatedUser caller = TestFixtures.caller(admin);
        User target = TestFixtures.user("user@example.com", Role.USER);
        target.deactivate();
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));
        when(userRepository.save(target)).thenReturn(target);

        userService.setEnabled(caller, target.getId(), true);

        assertThat(target.isEnabled()).isTrue();
        verify(refreshTokenService, never()).revokeAllForUser(any());
    }

    @Test
    void setEnabled_throwsBusinessRule_whenAdminTriesToDeactivateSelf() {
        User admin = TestFixtures.user("admin@example.com", Role.ADMIN);
        AuthenticatedUser caller = TestFixtures.caller(admin);

        assertThatThrownBy(() -> userService.setEnabled(caller, admin.getId(), false))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("cannot deactivate your own account");
    }

    @Test
    void setEnabled_throwsResourceNotFoundException_whenUserDoesNotExist() {
        User admin = TestFixtures.user("admin@example.com", Role.ADMIN);
        AuthenticatedUser caller = TestFixtures.caller(admin);
        UUID unknownId = UUID.randomUUID();
        when(userRepository.findById(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.setEnabled(caller, unknownId, false))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
