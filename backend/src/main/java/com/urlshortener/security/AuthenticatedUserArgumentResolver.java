package com.urlshortener.security;

import com.urlshortener.user.Role;
import java.util.UUID;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@Component
public class AuthenticatedUserArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return AuthenticatedUser.class.equals(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory) {

        Object principal = SecurityContextHolder.getContext().getAuthentication() == null
                ? null
                : SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof Jwt jwt)) {
            
            throw new IllegalStateException("No authenticated JWT principal available");
        }
        return fromJwt(jwt);
    }

    static AuthenticatedUser fromJwt(Jwt jwt) {
        UUID id = UUID.fromString(jwt.getSubject());
        String email = jwt.getClaimAsString(JwtClaims.EMAIL);
        Role role = resolveRole(jwt);
        return new AuthenticatedUser(id, email, role);
    }

    private static Role resolveRole(Jwt jwt) {
        java.util.List<String> roles = jwt.getClaimAsStringList(JwtClaims.ROLES);
        if (roles == null || roles.isEmpty()) {
            return Role.USER;
        }
        
        return roles.contains(Role.ADMIN.name()) ? Role.ADMIN : Role.USER;
    }
}
