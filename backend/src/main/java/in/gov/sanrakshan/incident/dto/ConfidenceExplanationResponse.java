package in.gov.sanrakshan.incident.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfidenceExplanationResponse {
    private String incidentId;
    private Double posteriorProbability;
    private List<Double> credibleInterval;
    private String modelVersion;
    private String recommendation;
    private List<Map<String, Object>> topSignals;
}
