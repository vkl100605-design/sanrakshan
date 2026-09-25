package in.gov.sanrakshan.auth.controller;

import in.gov.sanrakshan.auth.dto.LoginRequest;
import in.gov.sanrakshan.auth.dto.LoginResponse;
import in.gov.sanrakshan.common.security.JwtService;
import in.gov.sanrakshan.common.security.SecurityContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication & RBAC", description = "OAuth2/JWT token issuance and identity verification")
public class AuthController {

    private final JwtService jwtService;

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and issue short-lived JWT token")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        String username = request.getUsername().toLowerCase();
        String userId;
        List<String> roles;

        if (username.contains("admin")) {
            userId = "usr-admin-01";
            roles = List.of("ROLE_ADMIN", "ROLE_OPERATOR");
        } else if (username.contains("verifier") || username.contains("field")) {
            userId = "usr-verifier-01";
            roles = List.of("ROLE_VERIFIER");
        } else if (username.contains("responder")) {
            userId = "usr-resp-01";
            roles = List.of("ROLE_RESPONDER");
        } else {
            userId = "usr-operator-01";
            roles = List.of("ROLE_OPERATOR");
        }

        String token = jwtService.generateToken(userId, username, roles);

        return ResponseEntity.ok(LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(userId)
                .username(username)
                .roles(roles)
                .build());
    }

    @GetMapping("/me")
    @Operation(summary = "Retrieve current authenticated user context and roles")
    public ResponseEntity<SecurityContext.UserPrincipal> getCurrentUser() {
        return ResponseEntity.ok(SecurityContext.getCurrentUser());
    }
}
