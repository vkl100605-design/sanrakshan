package in.gov.sanrakshan.decision.controller;

import in.gov.sanrakshan.audit.service.AuditService;
import in.gov.sanrakshan.common.filter.CorrelationIdFilter;
import in.gov.sanrakshan.common.idempotency.IdempotencyService;
import in.gov.sanrakshan.common.security.SecurityContext;
import in.gov.sanrakshan.decision.dto.DecisionResponse;
import in.gov.sanrakshan.decision.dto.RecordDecisionRequest;
import in.gov.sanrakshan.incident.service.IncidentService;
import in.gov.sanrakshan.outbox.service.OutboxService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/decisions")
@RequiredArgsConstructor
@Tag(name = "Operator Decisions", description = "Human-in-the-loop decision recording, RBAC verification and simulated dispatches")
public class DecisionController {

    private final IncidentService incidentService;
    private final IdempotencyService idempotencyService;
    private final AuditService auditService;
    private final OutboxService outboxService;

    private final Map<String, DecisionResponse> decisions = new ConcurrentHashMap<>();

    @PostMapping
    @Operation(summary = "Record operator approval, adjustment, override, or rejection with RBAC enforcement and audit trail")
    public ResponseEntity<DecisionResponse> recordDecision(
            @Valid @RequestBody RecordDecisionRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {

        // 1. RBAC check: Only users with ROLE_OPERATOR or ROLE_ADMIN can record decisions
        SecurityContext.UserPrincipal principal = SecurityContext.getCurrentUser();
        if (!principal.hasRole("ROLE_OPERATOR") && !principal.hasRole("ROLE_ADMIN")) {
            throw new SecurityException("Forbidden: User '" + principal.getUsername() +
                    "' does not possess ROLE_OPERATOR to approve or modify dispatches.");
        }

        // 2. Idempotency check: Return cached response if previously executed
        if (idempotencyKey != null) {
            Optional<DecisionResponse> cached = idempotencyService.getCachedResponse(idempotencyKey);
            if (cached.isPresent()) {
                return ResponseEntity.ok(cached.get());
            }
        }

        String decisionId = "dec-" + UUID.randomUUID().toString().substring(0, 8);
        String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);

        // 3. Update the incident lifecycle state based on operator action
        String newState = switch (request.getAction()) {
            case "APPROVE" -> "APPROVED";
            case "ADJUST" -> "ADJUSTED";
            case "OVERRIDE" -> "OVERRIDDEN";
            case "REJECT" -> "REJECTED";
            default -> "REVIEW_READY";
        };

        var incidentOpt = incidentService.getIncident(request.getIncidentId());
        String previousState = incidentOpt.map(i -> i.getState()).orElse("UNKNOWN");

        incidentService.updateIncidentState(request.getIncidentId(), newState, request.getAdjustedConfidence());

        DecisionResponse response = DecisionResponse.builder()
                .id(decisionId)
                .incidentId(request.getIncidentId())
                .operatorId(principal.getUserId())
                .action(request.getAction())
                .justification(request.getJustification())
                .adjustedConfidence(request.getAdjustedConfidence())
                .dispatchPlan(request.getDispatchPlan())
                .correlationId(correlationId)
                .recordedAt(Instant.now())
                .build();

        decisions.put(decisionId, response);

        // 4. Record Immutable Audit Event (FR-05)
        auditService.recordEvent(
                "DECISION_" + request.getAction(),
                "INCIDENT",
                request.getIncidentId(),
                Map.of("state", previousState),
                Map.of("state", newState, "decisionId", decisionId, "justification", request.getJustification())
        );

        // 5. Stage Transactional Outbox Event to Kafka
        outboxService.stageEvent(
                "DECISION",
                decisionId,
                "ACTION_RECORDED",
                Map.of(
                        "incidentId", request.getIncidentId(),
                        "action", request.getAction(),
                        "newState", newState,
                        "operatorId", principal.getUserId()
                )
        );

        // 6. Cache for Idempotency
        if (idempotencyKey != null) {
            idempotencyService.recordExecution(idempotencyKey, response);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
