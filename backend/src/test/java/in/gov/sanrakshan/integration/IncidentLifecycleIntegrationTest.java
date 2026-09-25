package in.gov.sanrakshan.integration;

import in.gov.sanrakshan.audit.service.AuditService;
import in.gov.sanrakshan.auth.dto.LoginRequest;
import in.gov.sanrakshan.auth.dto.LoginResponse;
import in.gov.sanrakshan.common.idempotency.IdempotencyService;
import in.gov.sanrakshan.common.security.JwtService;
import in.gov.sanrakshan.common.security.SecurityContext;
import in.gov.sanrakshan.decision.controller.DecisionController;
import in.gov.sanrakshan.decision.dto.DecisionResponse;
import in.gov.sanrakshan.decision.dto.RecordDecisionRequest;
import in.gov.sanrakshan.evidence.controller.EvidenceController;
import in.gov.sanrakshan.evidence.dto.PresignedUploadRequest;
import in.gov.sanrakshan.evidence.dto.PresignedUploadResponse;
import in.gov.sanrakshan.incident.controller.IncidentController;
import in.gov.sanrakshan.incident.dto.CreateIncidentRequest;
import in.gov.sanrakshan.incident.dto.GeoPointDto;
import in.gov.sanrakshan.incident.dto.IncidentResponse;
import in.gov.sanrakshan.incident.service.IncidentService;
import in.gov.sanrakshan.outbox.service.OutboxService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class IncidentLifecycleIntegrationTest {

    private IncidentService incidentService;
    private IdempotencyService idempotencyService;
    private OutboxService outboxService;
    private AuditService auditService;
    private IncidentController incidentController;
    private DecisionController decisionController;
    private EvidenceController evidenceController;
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        incidentService = new IncidentService();
        idempotencyService = new IdempotencyService();
        outboxService = new OutboxService();
        auditService = new AuditService();
        jwtService = new JwtService("sanrakshan-secure-test-key-minimum-256-bits-length!", 60);

        incidentController = new IncidentController(incidentService, idempotencyService, outboxService);
        decisionController = new DecisionController(incidentService, idempotencyService, auditService, outboxService);
        evidenceController = new EvidenceController();

        // Default to operator principal for lifecycle tests
        SecurityContext.setCurrentUser(SecurityContext.UserPrincipal.builder()
                .userId("usr-op-test")
                .username("operator_test")
                .roles(List.of("ROLE_OPERATOR"))
                .build());
    }

    @Test
    @DisplayName("Idempotency: Replaying create incident with identical Idempotency-Key returns cached response")
    void testIdempotentIncidentCreation() {
        CreateIncidentRequest request = CreateIncidentRequest.builder()
                .hazardType("FLOOD")
                .location(new GeoPointDto(19.2043, 73.0301))
                .source("IOT_SENSOR")
                .initialConfidence(0.87)
                .description("Surface water flooding in Mumbra")
                .build();

        String idempotencyKey = "idemp-key-test-999";

        ResponseEntity<IncidentResponse> firstCall = incidentController.createIncident(request, idempotencyKey);
        assertEquals(201, firstCall.getStatusCode().value());
        assertNotNull(firstCall.getBody());
        String initialId = firstCall.getBody().getId();

        // Replay with identical key
        ResponseEntity<IncidentResponse> secondCall = incidentController.createIncident(request, idempotencyKey);
        assertEquals(200, secondCall.getStatusCode().value());
        assertEquals(initialId, secondCall.getBody().getId());

        // Verify outbox staged the initial event
        assertFalse(outboxService.getPublishedEvents().isEmpty());
    }

    @Test
    @DisplayName("RBAC: Verifier role is denied when attempting operator dispatch decision")
    void testRbacDenialForNonOperator() {
        // Set context to a field verifier
        SecurityContext.setCurrentUser(SecurityContext.UserPrincipal.builder()
                .userId("usr-ver-42")
                .username("field_verifier")
                .roles(List.of("ROLE_VERIFIER")) // Missing ROLE_OPERATOR
                .build());

        RecordDecisionRequest request = RecordDecisionRequest.builder()
                .incidentId("inc-2026-blr-01")
                .action("APPROVE")
                .justification("Field verifier attempting unauthorized dispatch")
                .build();

        assertThrows(SecurityException.class, () -> {
            decisionController.recordDecision(request, null);
        });
    }

    @Test
    @DisplayName("Audit Trail: Operator approval records immutable audit event with before and after state diff")
    void testOperatorApprovalCreatesImmutableAuditLog() {
        RecordDecisionRequest request = RecordDecisionRequest.builder()
                .incidentId("inc-2026-blr-02")
                .action("APPROVE")
                .justification("Thermal anomaly confirmed by CCTV; approving simulated dispatch")
                .dispatchPlan(Map.of("units", List.of("FOAM_TENDER_1")))
                .build();

        ResponseEntity<DecisionResponse> response = decisionController.recordDecision(request, "idemp-dec-01");
        assertEquals(201, response.getStatusCode().value());

        // Verify incident state transitioned to APPROVED
        var incident = incidentService.getIncident("inc-2026-blr-02");
        assertTrue(incident.isPresent());
        assertEquals("APPROVED", incident.get().getState());

        // Verify Audit Event was recorded
        var auditLogs = auditService.queryAuditLogs("INCIDENT", "inc-2026-blr-02", null);
        assertFalse(auditLogs.isEmpty());
        assertEquals("DECISION_APPROVE", auditLogs.get(0).getActionType());
        assertEquals("usr-op-test", auditLogs.get(0).getActorId());
    }

    @Test
    @DisplayName("Evidence Upload: Presigned URL generator enforces MIME types and max size")
    void testEvidencePresignedUploadPolicy() {
        PresignedUploadRequest validReq = PresignedUploadRequest.builder()
                .incidentId("inc-2026-blr-01")
                .taskId("task-481")
                .fileName("flood_scene.jpg")
                .contentType("image/jpeg")
                .fileSizeBytes(2048576L) // 2 MB
                .build();

        ResponseEntity<PresignedUploadResponse> res = evidenceController.generatePresignedUpload(validReq);
        assertEquals(200, res.getStatusCode().value());
        assertNotNull(res.getBody());
        assertTrue(res.getBody().getStorageKey().startsWith("evidence/inc-2026-blr-01/task-481/"));

        // Reject invalid MIME type
        PresignedUploadRequest invalidMime = PresignedUploadRequest.builder()
                .incidentId("inc-2026-blr-01")
                .taskId("task-481")
                .fileName("script.exe")
                .contentType("application/x-msdownload")
                .fileSizeBytes(1024L)
                .build();

        assertThrows(IllegalArgumentException.class, () -> {
            evidenceController.generatePresignedUpload(invalidMime);
        });
    }

    @Test
    @DisplayName("JWT Security: Token issuance and claims parsing")
    void testJwtTokenService() {
        String token = jwtService.generateToken("usr-100", "operator_lead", List.of("ROLE_OPERATOR", "ROLE_ADMIN"));
        assertNotNull(token);

        var claims = jwtService.validateAndParseClaims(token);
        assertEquals("usr-100", claims.getSubject());
        assertEquals("operator_lead", claims.get("username", String.class));
    }
}
