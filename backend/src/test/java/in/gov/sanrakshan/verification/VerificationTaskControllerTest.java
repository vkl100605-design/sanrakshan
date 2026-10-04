package in.gov.sanrakshan.verification;

import in.gov.sanrakshan.incident.dto.GeoPointDto;
import in.gov.sanrakshan.verification.controller.VerificationTaskController;
import in.gov.sanrakshan.verification.dto.EvidenceReceiptResponse;
import in.gov.sanrakshan.verification.dto.SubmitEvidenceRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;

public class VerificationTaskControllerTest {


    private VerificationTaskController controller;

    @BeforeEach
    void setUp() {
        controller = new VerificationTaskController();
    }

    @Test
    @DisplayName("Should successfully submit field evidence and return receipt with SHA-256 fingerprint")
    void testSubmitEvidenceSuccess() {
        SubmitEvidenceRequest request = SubmitEvidenceRequest.builder()
                .location(new GeoPointDto(19.2043, 73.0301))
                .mediaSha256("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
                .mediaStorageKey("evidence/2026/10/04/photo-mumbra-01.jpg")
                .observationText("Water level measured at Mumbra underpass; vehicle movement stalled.")
                .hazardObserved(true)
                .build();

        ResponseEntity<EvidenceReceiptResponse> response = controller.submitEvidence("task-4821", request, "idemp-evi-001");

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().getEvidenceId().startsWith("evi-"));
        assertEquals("task-4821", response.getBody().getTaskId());
        assertEquals("SUBMITTED_AND_QUEUED_FOR_FUSION", response.getBody().getStatus());
        assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", response.getBody().getSha256());
        assertNotNull(response.getBody().getReceivedAt());
    }
}
