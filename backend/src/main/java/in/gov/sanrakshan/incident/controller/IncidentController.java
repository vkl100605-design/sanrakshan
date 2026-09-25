package in.gov.sanrakshan.incident.controller;

import in.gov.sanrakshan.common.idempotency.IdempotencyService;
import in.gov.sanrakshan.incident.dto.ConfidenceExplanationResponse;
import in.gov.sanrakshan.incident.dto.CreateIncidentRequest;
import in.gov.sanrakshan.incident.dto.IncidentResponse;
import in.gov.sanrakshan.incident.service.IncidentService;
import in.gov.sanrakshan.outbox.service.OutboxService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/incidents")
@RequiredArgsConstructor
@Tag(name = "Incidents", description = "Incident ingestion, querying, idempotency, and Bayesian confidence explanation")
public class IncidentController {

    private final IncidentService incidentService;
    private final IdempotencyService idempotencyService;
    private final OutboxService outboxService;

    @PostMapping
    @Operation(summary = "Create or merge normalized incident with idempotency guarantee")
    public ResponseEntity<IncidentResponse> createIncident(
            @Valid @RequestBody CreateIncidentRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {

        if (idempotencyKey != null) {
            Optional<IncidentResponse> cached = idempotencyService.getCachedResponse(idempotencyKey);
            if (cached.isPresent()) {
                return ResponseEntity.ok(cached.get());
            }
        }

        IncidentResponse created = incidentService.createOrMergeIncident(request);

        // Stage Outbox event for Kafka publishing
        outboxService.stageEvent(
                "INCIDENT",
                created.getId(),
                "CREATED",
                Map.of(
                        "hazardType", created.getHazardType(),
                        "state", created.getState(),
                        "confidence", created.getConfidence(),
                        "location", Map.of("lat", created.getLocation().getLatitude(), "lon", created.getLocation().getLongitude())
                )
        );

        if (idempotencyKey != null) {
            idempotencyService.recordExecution(idempotencyKey, created);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    @Operation(summary = "List filtered incidents")
    public ResponseEntity<List<IncidentResponse>> listIncidents(
            @RequestParam(required = false) String hazardType,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) Double minConfidence) {
        return ResponseEntity.ok(incidentService.listIncidents(hazardType, state, minConfidence));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get incident details by ID")
    public ResponseEntity<IncidentResponse> getIncident(@PathVariable String id) {
        return incidentService.getIncident(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/explanation")
    @Operation(summary = "Get Bayesian fusion confidence explanation and signal attribution")
    public ResponseEntity<ConfidenceExplanationResponse> getExplanation(@PathVariable String id) {
        return incidentService.getExplanation(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
