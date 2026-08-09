package com.urlshortener.user;

import com.urlshortener.security.AuthenticatedUser;
import com.urlshortener.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users", description = "The signed-in account")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    @Operation(summary = "Profile of the currently authenticated account")
    public UserResponse me(AuthenticatedUser caller) {
        return userService.getCurrentUser(caller);
    }
}
