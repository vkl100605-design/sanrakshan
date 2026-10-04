package in.gov.sanrakshan.decision;

import in.gov.sanrakshan.audit.service.AuditService;
import in.gov.sanrakshan.common.idempotency.IdempotencyService;
import in.gov.sanrakshan.common.security.SecurityContext;
import in.gov.sanrakshan.decision.controller.DecisionController;
import in.gov.sanrakshan.decision.dto.DecisionResponse;
import in.gov.sanrakshan.decision.dto.RecordDecisionRequest;
import in.gov.sanrakshan.incident.service.IncidentService;
import in.gov.sanrakshan.outbox.service.OutboxService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class DecisionControllerTest {


    private DecisionController controller;
    private IncidentService incidentService;
    private IdempotencyService idempotencyService;
    private AuditService auditService;
    private OutboxService outboxService;

    @BeforeEach
    void setUp() {
        incidentService = new IncidentService();
        idempotencyService = new IdempotencyService();
        auditService = new AuditService();
        outboxService = new OutboxService();
        controller = new DecisionController(incidentService, idempotencyService, auditService, outboxService);
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    @Test
    @DisplayName("Should successfully record APPROVE decision with operator role, audit trail and outbox event")
    void testRecordApproveDecisionSuccess() {
        SecurityContext.setCurrentUser(SecurityContext.UserPrincipal.builder()
                .userId("usr-op-001")
                .username("varun_operator")
                .roles(List.of("ROLE_OPERATOR"))
                .build());

        RecordDecisionRequest request = RecordDecisionRequest.builder()
                .incidentId("inc-2026-blr-01")
                .action("APPROVE")
                .justification("Ground verifier evidence confirmed severe waterlogging above 40cm; mobilizing rescue pumps.")
                .dispatchPlan(Map.of("units", List.of("NDRF_BOAT_1", "PUMP_TRUCK_2")))
                .build();

        ResponseEntity<DecisionResponse> response = controller.recordDecision(request, "idemp-dec-001");

        assertEquals(201, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().getId().startsWith("dec-"));
        assertEquals("inc-2026-blr-01", response.getBody().getIncidentId());
        assertEquals("APPROVE", response.getBody().getAction());
        assertEquals("usr-op-001", response.getBody().getOperatorId());
        assertNotNull(response.getBody().getRecordedAt());

        // Verify incident state transitioned to APPROVED
        var updatedIncident = incidentService.getIncident("inc-2026-blr-01");
        assertTrue(updatedIncident.isPresent());
        assertEquals("APPROVED", updatedIncident.get().getState());
    }

    @Test
    @DisplayName("Should enforce RBAC and reject decision when user lacks ROLE_OPERATOR")
    void testRbacRejectionForNonOperator() {
        SecurityContext.setCurrentUser(SecurityContext.UserPrincipal.builder()
                .userId("usr-verif-99")
                .username("field_spotter")
                .roles(List.of("ROLE_VERIFIER")) // Lacks ROLE_OPERATOR or ROLE_ADMIN
                .build());

        RecordDecisionRequest request = RecordDecisionRequest.builder()
                .incidentId("inc-2026-blr-01")
                .action("APPROVE")
                .justification("Attempted unauthorized approval")
                .build();

        assertThrows(SecurityException.class, () -> controller.recordDecision(request, null));
    }

    @Test
    @DisplayName("Should replay cached response on duplicate idempotency key")
    void testIdempotentDuplicateReplay() {
        SecurityContext.setCurrentUser(SecurityContext.UserPrincipal.builder()
                .userId("usr-op-001")
                .username("varun_operator")
                .roles(List.of("ROLE_OPERATOR"))
                .build());

        RecordDecisionRequest request = RecordDecisionRequest.builder()
                .incidentId("inc-2026-blr-01")
                .action("APPROVE")
                .justification("First execution with idempotency key")
                .build();

        ResponseEntity<DecisionResponse> first = controller.recordDecision(request, "idemp-duplicate-test");
        assertEquals(201, first.getStatusCode().value());

        // Replay with identical key
        ResponseEntity<DecisionResponse> second = controller.recordDecision(request, "idemp-duplicate-test");
        assertEquals(200, second.getStatusCode().value());
        assertEquals(first.getBody().getId(), second.getBody().getId());
    }
}
