package in.gov.sanrakshan.outbox.service;

import in.gov.sanrakshan.common.filter.CorrelationIdFilter;
import in.gov.sanrakshan.outbox.model.OutboxEvent;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedQueue;

@Slf4j
@Service
public class OutboxService {

    private final Queue<OutboxEvent> outboxQueue = new ConcurrentLinkedQueue<>();
    private final List<OutboxEvent> publishedArchive = Collections.synchronizedList(new ArrayList<>());

    public OutboxEvent stageEvent(String aggregateType, String aggregateId, String eventType, Map<String, Object> payload) {
        String eventId = "evt-" + UUID.randomUUID().toString();
        String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);

        OutboxEvent event = OutboxEvent.builder()
                .id(eventId)
                .aggregateType(aggregateType)
                .aggregateId(aggregateId)
                .eventType(eventType)
                .payload(payload)
                .correlationId(correlationId)
                .createdAt(Instant.now())
                .publishedAt(null)
                .build();

        outboxQueue.add(event);
        log.info("Staged Transactional Outbox Event: [id={}, type={}, aggId={}, correlationId={}]",
                eventId, eventType, aggregateId, correlationId);

        // Instantly process/publish for in-process dispatch
        publishNext();
        return event;
    }

    public synchronized void publishNext() {
        OutboxEvent event = outboxQueue.poll();
        if (event != null) {
            // Emulate publishing to Kafka topic matching topic catalog
            String topicName = "sanrakshan." + event.getAggregateType().toLowerCase() + "." + event.getEventType().toLowerCase();
            event.setPublishedAt(Instant.now());
            publishedArchive.add(event);
            log.info("Published CloudEvent to Kafka Topic '{}': [id={}]", topicName, event.getId());
        }
    }

    public List<OutboxEvent> getPublishedEvents() {
        return new ArrayList<>(publishedArchive);
    }
}
