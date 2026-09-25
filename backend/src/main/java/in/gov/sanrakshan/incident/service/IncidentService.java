package in.gov.sanrakshan.incident.service;

import in.gov.sanrakshan.incident.dto.ConfidenceExplanationResponse;
import in.gov.sanrakshan.incident.dto.CreateIncidentRequest;
import in.gov.sanrakshan.incident.dto.GeoPointDto;
import in.gov.sanrakshan.incident.dto.IncidentResponse;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class IncidentService {

    private final Map<String, IncidentResponse> incidents = new ConcurrentHashMap<>();

    public IncidentService() {
        // Pre-populate realistic seed incidents for local dev & evaluation walkthrough
        seedIncident("inc-2026-blr-01", "FLOOD", "VERIFYING", 12.9716, 77.5946, 0.58, 0.42, 0.74, "HIGH", "Severe inundation reported near central underpass with rising water levels");
        seedIncident("inc-2026-blr-02", "WILDFIRE", "REVIEW_READY", 13.0827, 77.5877, 0.89, 0.81, 0.96, "CRITICAL", "Thermal anomaly detected by NASA FIRMS with active smoke plume confirmed by CCTV");
        seedIncident("inc-2026-blr-03", "URBAN_FIRE", "APPROVED", 12.9352, 77.6245, 0.94, 0.89, 0.98, "CRITICAL", "Commercial facility structural fire, operator approved simulated dispatch of 2 foam tenders");
    }

    private void seedIncident(String id, String hazard, String state, double lat, double lon, double conf, double ciLow, double ciHigh, String severity, String desc) {
        incidents.put(id, IncidentResponse.builder()
                .id(id)
                .hazardType(hazard)
                .state(state)
                .location(new GeoPointDto(lat, lon))
                .confidence(conf)
                .ciLower(ciLow)
                .ciUpper(ciHigh)
                .severity(severity)
                .description(desc)
                .createdAt(Instant.now().minusSeconds(1800))
                .updatedAt(Instant.now())
                .build());
    }

    public IncidentResponse createOrMergeIncident(CreateIncidentRequest request) {
        String id = "inc-" + UUID.randomUUID().toString().substring(0, 8);
        double conf = request.getInitialConfidence() != null ? request.getInitialConfidence() : 0.50;

        // Apply Bayesian ambiguity band policy:
        // P < 0.35 -> REPORTED (Monitor only)
        // 0.35 <= P <= 0.75 -> VERIFYING (Ambiguity Band: Trigger TMVN Task)
        // P > 0.75 -> REVIEW_READY (High Confidence: Route to Operator)
        String state;
        if (conf < 0.35) {
            state = "REPORTED";
        } else if (conf <= 0.75) {
            state = "VERIFYING";
        } else {
            state = "REVIEW_READY";
        }

        double ciMargin = Math.max(0.08, 0.20 * (1.0 - conf));
        double ciLow = Math.max(0.0, conf - ciMargin);
        double ciHigh = Math.min(1.0, conf + ciMargin);

        IncidentResponse response = IncidentResponse.builder()
                .id(id)
                .hazardType(request.getHazardType())
                .state(state)
                .location(request.getLocation())
                .confidence(conf)
                .ciLower(ciLow)
                .ciUpper(ciHigh)
                .severity(request.getSeverityHint() != null ? request.getSeverityHint() : "MEDIUM")
                .description(request.getDescription())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        incidents.put(id, response);
        return response;
    }

    public List<IncidentResponse> listIncidents(String hazardType, String state, Double minConfidence) {
        return incidents.values().stream()
                .filter(i -> hazardType == null || i.getHazardType().equalsIgnoreCase(hazardType))
                .filter(i -> state == null || i.getState().equalsIgnoreCase(state))
                .filter(i -> minConfidence == null || i.getConfidence() >= minConfidence)
                .sorted(Comparator.comparing(IncidentResponse::getUpdatedAt).reversed())
                .toList();
    }

    public Optional<IncidentResponse> getIncident(String id) {
        return Optional.ofNullable(incidents.get(id));
    }

    public Optional<ConfidenceExplanationResponse> getExplanation(String id) {
        IncidentResponse inc = incidents.get(id);
        if (inc == null) {
            return Optional.empty();
        }

        List<Map<String, Object>> topSignals = new ArrayList<>();
        if ("FLOOD".equalsIgnoreCase(inc.getHazardType())) {
            topSignals.add(Map.of("source", "IoT Water Sensor #41", "weight", 0.42, "contribution", "+0.31 (Depth 42cm)"));
            topSignals.add(Map.of("source", "Weather Radar", "weight", 0.28, "contribution", "+0.18 (Rainfall rate 65mm/hr)"));
            topSignals.add(Map.of("source", "Citizen Helpline", "weight", 0.18, "contribution", "+0.09 (3 corroborated calls)"));
        } else {
            topSignals.add(Map.of("source", "NASA FIRMS Satellite", "weight", 0.48, "contribution", "+0.38 (FRP 42.1 MW)"));
            topSignals.add(Map.of("source", "CCTV AI Smoke Classifier", "weight", 0.32, "contribution", "+0.24 (Dense plume detected)"));
            topSignals.add(Map.of("source", "Wind Vector Station", "weight", 0.20, "contribution", "+0.12 (NW direction towards residential)"));
        }

        String recommendation;
        if (inc.getConfidence() > 0.75) {
            recommendation = "High confidence detected. Operator approval recommended for immediate simulated resource dispatch.";
        } else if (inc.getConfidence() >= 0.35) {
            recommendation = "Ambiguity band detected. Mobile TMVN field verifier tasked to collect ground imagery.";
        } else {
            recommendation = "Low confidence. Signal under automated background observation.";
        }

        return Optional.of(ConfidenceExplanationResponse.builder()
                .incidentId(id)
                .posteriorProbability(inc.getConfidence())
                .credibleInterval(List.of(inc.getCiLower(), inc.getCiUpper()))
                .modelVersion("pymc-bayesian-fusion-v1.4")
                .recommendation(recommendation)
                .topSignals(topSignals)
                .build());
    }

    public void updateIncidentState(String id, String newState, Double newConfidence) {
        IncidentResponse inc = incidents.get(id);
        if (inc != null) {
            inc.setState(newState);
            if (newConfidence != null) {
                inc.setConfidence(newConfidence);
            }
            inc.setUpdatedAt(Instant.now());
        }
    }
}
