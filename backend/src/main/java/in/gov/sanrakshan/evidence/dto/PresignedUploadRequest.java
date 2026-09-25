package in.gov.sanrakshan.evidence.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PresignedUploadRequest {
    @NotBlank(message = "Incident ID is required")
    private String incidentId;

    @NotBlank(message = "Task ID is required")
    private String taskId;

    @NotBlank(message = "File name is required")
    private String fileName;

    @NotBlank(message = "MIME type is required")
    private String contentType; // e.g. image/jpeg, image/png, video/mp4

    @NotNull(message = "File size in bytes is required")
    private Long fileSizeBytes;
}
