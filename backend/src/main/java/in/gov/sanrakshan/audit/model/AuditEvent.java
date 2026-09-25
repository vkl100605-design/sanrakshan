package in.gov.sanrakshan.audit.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditEvent {
    private String id;
    private String actorId;
    private String actionType;
    private String entityType;
    private String entityId;
    private Map<String, Object> stateBefore;
    private Map<String, Object> stateAfter;
    private String ipAddress;
    private String correlationId;
    private Instant timestamp;
}
