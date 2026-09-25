package in.gov.sanrakshan.decision.controller;

import in.gov.sanrakshan.common.filter.CorrelationIdFilter;
import in.gov.sanrakshan.decision.dto.DecisionResponse;
import in.gov.sanrakshan.decision.dto.RecordDecisionRequest;
import in.gov.sanrakshan.incident.service.IncidentService;
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
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/decisions")
@RequiredArgsConstructor
@Tag(name = "Operator Decisions", description = "Human-in-the-loop decision recording and simulated dispatch approvals")
public class DecisionController {

    private final IncidentService incidentService;
    private final Map<String, DecisionResponse> decisions = new ConcurrentHashMap<>();

    @PostMapping
    @Operation(summary = "Record operator approval, adjustment, override, or rejection")
    public ResponseEntity<DecisionResponse> recordDecision(
            @Valid @RequestBody RecordDecisionRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {

        String decisionId = "dec-" + UUID.randomUUID().toString().substring(0, 8);
        String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);

        // Update the incident lifecycle state based on operator action
        String newState = switch (request.getAction()) {
            case "APPROVE" -> "APPROVED";
            case "ADJUST" -> "ADJUSTED";
            case "OVERRIDE" -> "OVERRIDDEN";
            case "REJECT" -> "REJECTED";
            default -> "REVIEW_READY";
        };

        incidentService.updateIncidentState(request.getIncidentId(), newState, request.getAdjustedConfidence());

        DecisionResponse response = DecisionResponse.builder()
                .id(decisionId)
                .incidentId(request.getIncidentId())
                .operatorId("op-cmd-lead")
                .action(request.getAction())
                .justification(request.getJustification())
                .adjustedConfidence(request.getAdjustedConfidence())
                .dispatchPlan(request.getDispatchPlan())
                .correlationId(correlationId)
                .recordedAt(Instant.now())
                .build();

        decisions.put(decisionId, response);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
