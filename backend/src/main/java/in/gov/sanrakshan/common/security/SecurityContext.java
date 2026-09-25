package in.gov.sanrakshan.common.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

public class SecurityContext {

    private static final ThreadLocal<UserPrincipal> CURRENT_USER = new ThreadLocal<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserPrincipal {
        private String userId;
        private String username;
        private List<String> roles;

        public boolean hasRole(String role) {
            return roles != null && roles.contains(role);
        }
    }

    public static void setCurrentUser(UserPrincipal principal) {
        CURRENT_USER.set(principal);
    }

    public static UserPrincipal getCurrentUser() {
        UserPrincipal principal = CURRENT_USER.get();
        if (principal == null) {
            // Default anonymous / local simulation principal if no token supplied
            return UserPrincipal.builder()
                    .userId("op-default-anonymous")
                    .username("operator_control")
                    .roles(List.of("ROLE_OPERATOR", "ROLE_ADMIN"))
                    .build();
        }
        return principal;
    }

    public static void clear() {
        CURRENT_USER.remove();
    }
}
