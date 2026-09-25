package in.gov.sanrakshan.audit.controller;

import in.gov.sanrakshan.audit.model.AuditEvent;
import in.gov.sanrakshan.audit.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/audit-events")
@RequiredArgsConstructor
@Tag(name = "Audit & Compliance", description = "Query immutable audit logs and operator action trails")
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    @Operation(summary = "Search immutable audit logs")
    public ResponseEntity<List<AuditEvent>> getAuditEvents(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) String actorId) {
        return ResponseEntity.ok(auditService.queryAuditLogs(entityType, entityId, actorId));
    }
}
