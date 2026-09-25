package in.gov.sanrakshan.decision.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordDecisionRequest {
    @NotBlank(message = "Incident ID is required")
    private String incidentId;

    @NotBlank(message = "Action is required")
    @Pattern(regexp = "APPROVE|ADJUST|OVERRIDE|REJECT", message = "Action must be APPROVE, ADJUST, OVERRIDE, or REJECT")
    private String action;

    @NotBlank(message = "Justification reason is mandatory for human-in-the-loop auditability")
    private String justification;

    private Double adjustedConfidence;

    private Map<String, Object> dispatchPlan;
}
