package in.gov.sanrakshan.incident.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
public class CreateIncidentRequest {
    @NotBlank(message = "Hazard type is required (FLOOD, WILDFIRE, URBAN_FIRE, SMOKE)")
    private String hazardType;

    @NotNull(message = "Geographic location is required")
    @Valid
    private GeoPointDto location;

    @NotBlank(message = "Source identifier is required (e.g. SATELLITE_FIRMS, HELPLINE)")
    private String source;

    private String severityHint;

    @DecimalMin(value = "0.0", message = "Confidence must be >= 0.0")
    @DecimalMax(value = "1.0", message = "Confidence must be <= 1.0")
    private Double initialConfidence;

    private String description;
}
