package in.gov.sanrakshan.verification.controller;

import in.gov.sanrakshan.verification.dto.EvidenceReceiptResponse;
import in.gov.sanrakshan.verification.dto.SubmitEvidenceRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/verification-tasks")
@Tag(name = "TMVN Verification", description = "Field verifier tasking and evidence submission")
public class VerificationTaskController {

    private final Map<String, EvidenceReceiptResponse> evidenceStore = new ConcurrentHashMap<>();

    @PostMapping("/{id}/evidence")
    @Operation(summary = "Submit field verifier evidence for an ambiguous incident")
    public ResponseEntity<EvidenceReceiptResponse> submitEvidence(
            @PathVariable String id,
            @Valid @RequestBody SubmitEvidenceRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {

        String evidenceId = "evi-" + UUID.randomUUID().toString().substring(0, 8);

        EvidenceReceiptResponse receipt = EvidenceReceiptResponse.builder()
                .evidenceId(evidenceId)
                .taskId(id)
                .status("SUBMITTED_AND_QUEUED_FOR_FUSION")
                .sha256(request.getMediaSha256())
                .receivedAt(Instant.now())
                .build();

        evidenceStore.put(evidenceId, receipt);
        return ResponseEntity.ok(receipt);
    }
}
