package in.gov.sanrakshan.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProblemDetails {
    private String type;
    private String title;
    private int status;
    private String detail;
    private String instance;
    private String correlationId;
    private Instant timestamp;
}
