package in.gov.sanrakshan.evidence.controller;

import in.gov.sanrakshan.evidence.dto.PresignedUploadRequest;
import in.gov.sanrakshan.evidence.dto.PresignedUploadResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/evidence")
@Tag(name = "Evidence Management", description = "S3 evidence upload presigning, checksum validation and retrieval")
public class EvidenceController {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "video/mp4"
    );

    private static final long MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

    @Value("${sanrakshan.storage.endpoint:http://localhost:9000}")
    private String s3Endpoint;

    @Value("${sanrakshan.storage.bucket:sanrakshan-evidence}")
    private String s3Bucket;

    @PostMapping("/presign-upload")
    @Operation(summary = "Generate short-lived presigned upload URL for field evidence")
    public ResponseEntity<PresignedUploadResponse> generatePresignedUpload(
            @Valid @RequestBody PresignedUploadRequest request) {

        // Validate content type
        if (!ALLOWED_CONTENT_TYPES.contains(request.getContentType().toLowerCase())) {
            throw new IllegalArgumentException("Unsupported media type: " + request.getContentType() +
                    ". Allowed types: " + ALLOWED_CONTENT_TYPES);
        }

        // Validate file size limit
        if (request.getFileSizeBytes() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds 25 MB maximum limit.");
        }

        String fileHashHint = UUID.randomUUID().toString().replace("-", "");
        // Layout: evidence/{incidentId}/{taskId}/{sha256}
        String storageKey = String.format("evidence/%s/%s/%s_%s",
                request.getIncidentId(), request.getTaskId(), fileHashHint, request.getFileName());

        String presignedUrl = String.format("%s/%s/%s", s3Endpoint, s3Bucket, storageKey);
        Instant expiresAt = Instant.now().plus(15, ChronoUnit.MINUTES);

        return ResponseEntity.ok(PresignedUploadResponse.builder()
                .storageKey(storageKey)
                .presignedUrl(presignedUrl)
                .httpMethod("PUT")
                .requiredHeaders(Map.of(
                        "Content-Type", request.getContentType(),
                        "x-amz-server-side-encryption", "AES256"
                ))
                .expiresAt(expiresAt)
                .build());
    }
}
