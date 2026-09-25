package in.gov.sanrakshan.verification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvidenceReceiptResponse {
    private String evidenceId;
    private String taskId;
    private String status;
    private String sha256;
    private Instant receivedAt;
}
