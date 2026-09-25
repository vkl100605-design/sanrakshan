package in.gov.sanrakshan.audit.service;

import in.gov.sanrakshan.audit.model.AuditEvent;
import in.gov.sanrakshan.common.filter.CorrelationIdFilter;
import in.gov.sanrakshan.common.security.SecurityContext;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AuditService {

    private final List<AuditEvent> auditLog = Collections.synchronizedList(new ArrayList<>());

    public AuditEvent recordEvent(String actionType, String entityType, String entityId,
                                  Map<String, Object> stateBefore, Map<String, Object> stateAfter) {
        String actorId = SecurityContext.getCurrentUser().getUserId();
        String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);
        String eventId = "aud-" + UUID.randomUUID().toString().substring(0, 8);

        AuditEvent event = AuditEvent.builder()
                .id(eventId)
                .actorId(actorId)
                .actionType(actionType)
                .entityType(entityType)
                .entityId(entityId)
                .stateBefore(stateBefore)
                .stateAfter(stateAfter)
                .ipAddress("127.0.0.1")
                .correlationId(correlationId)
                .timestamp(Instant.now())
                .build();

        auditLog.add(event);
        log.info("IMMUTABLE AUDIT LOG APPENDED: [id={}, actor={}, action={}, entity={}:{}]",
                eventId, actorId, actionType, entityType, entityId);

        return event;
    }

    public List<AuditEvent> queryAuditLogs(String entityType, String entityId, String actorId) {
        return auditLog.stream()
                .filter(a -> entityType == null || a.getEntityType().equalsIgnoreCase(entityType))
                .filter(a -> entityId == null || a.getEntityId().equalsIgnoreCase(entityId))
                .filter(a -> actorId == null || a.getActorId().equalsIgnoreCase(actorId))
                .sorted(Comparator.comparing(AuditEvent::getTimestamp).reversed())
                .collect(Collectors.toList());
    }
}
