package in.gov.sanrakshan.verification.dto;

import in.gov.sanrakshan.incident.dto.GeoPointDto;
import jakarta.validation.Valid;
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
public class SubmitEvidenceRequest {
    @NotNull(message = "Location is required")
    @Valid
    private GeoPointDto location;

    @NotBlank(message = "Media SHA-256 checksum is required for tamper evidence")
    private String mediaSha256;

    @NotBlank(message = "Media storage key in S3 is required")
    private String mediaStorageKey;

    @NotBlank(message = "Observation text description is required")
    private String observationText;

    private Boolean hazardObserved;
}
