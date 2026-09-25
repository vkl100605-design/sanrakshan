package in.gov.sanrakshan.incident.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentResponse {
    private String id;
    private String hazardType;
    private String state;
    private GeoPointDto location;
    private Double confidence;
    private Double ciLower;
    private Double ciUpper;
    private String severity;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
}
