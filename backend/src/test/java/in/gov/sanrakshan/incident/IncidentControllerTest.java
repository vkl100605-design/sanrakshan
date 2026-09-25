package in.gov.sanrakshan.incident;

import in.gov.sanrakshan.incident.controller.IncidentController;
import in.gov.sanrakshan.incident.dto.CreateIncidentRequest;
import in.gov.sanrakshan.incident.dto.GeoPointDto;
import in.gov.sanrakshan.incident.dto.IncidentResponse;
import in.gov.sanrakshan.incident.service.IncidentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class IncidentControllerTest {

    private IncidentController controller;

    @BeforeEach
    void setUp() {
        IncidentService service = new IncidentService();
        controller = new IncidentController(service);
    }

    @Test
    @DisplayName("Should list pre-seeded incidents")
    void testListIncidents() {
        ResponseEntity<List<IncidentResponse>> response = controller.listIncidents(null, null, null);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isEmpty());
    }

    @Test
    @DisplayName("Should assign VERIFYING status to incident within ambiguity band (0.35 <= conf <= 0.75)")
    void testAmbiguityBandAssignment() {
        CreateIncidentRequest request = CreateIncidentRequest.builder()
                .hazardType("FLOOD")
                .location(new GeoPointDto(12.9716, 77.5946))
                .source("CITIZEN_REPORT")
                .initialConfidence(0.55)
                .description("Rising water level on cross-road")
                .build();

        ResponseEntity<IncidentResponse> response = controller.createIncident(request);
        assertEquals(201, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("VERIFYING", response.getBody().getState());
        assertEquals(0.55, response.getBody().getConfidence());
    }

    @Test
    @DisplayName("Should return explainable confidence snapshot for seeded incident")
    void testGetExplanation() {
        var explanation = controller.getExplanation("inc-2026-blr-01");
        assertEquals(200, explanation.getStatusCode().value());
        assertNotNull(explanation.getBody());
        assertNotNull(explanation.getBody().getTopSignals());
        assertFalse(explanation.getBody().getTopSignals().isEmpty());
    }
}
