package in.gov.sanrakshan.evidence.dto;

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
public class PresignedUploadResponse {
    private String storageKey;
    private String presignedUrl;
    private String httpMethod;
    private Map<String, String> requiredHeaders;
    private Instant expiresAt;
}
