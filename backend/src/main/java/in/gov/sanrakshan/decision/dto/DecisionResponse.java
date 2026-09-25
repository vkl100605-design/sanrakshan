package in.gov.sanrakshan.decision.dto;

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
public class DecisionResponse {
    private String id;
    private String incidentId;
    private String operatorId;
    private String action;
    private String justification;
    private Double adjustedConfidence;
    private Map<String, Object> dispatchPlan;
    private String correlationId;
    private Instant recordedAt;
}
