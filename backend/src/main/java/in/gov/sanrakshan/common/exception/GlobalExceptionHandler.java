package in.gov.sanrakshan.common.exception;

import in.gov.sanrakshan.common.dto.ProblemDetails;
import in.gov.sanrakshan.common.filter.CorrelationIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetails> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .collect(Collectors.joining(", "));

        ProblemDetails problem = ProblemDetails.builder()
                .type("https://sanrakshan.gov.in/errors/validation-failed")
                .title("Request Validation Error")
                .status(HttpStatus.BAD_REQUEST.value())
                .detail(detail)
                .instance(request.getRequestURI())
                .correlationId(MDC.get(CorrelationIdFilter.MDC_KEY))
                .timestamp(Instant.now())
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ProblemDetails> handleIllegalArgumentException(IllegalArgumentException ex, HttpServletRequest request) {
        ProblemDetails problem = ProblemDetails.builder()
                .type("https://sanrakshan.gov.in/errors/bad-request")
                .title("Bad Request")
                .status(HttpStatus.BAD_REQUEST.value())
                .detail(ex.getMessage())
                .instance(request.getRequestURI())
                .correlationId(MDC.get(CorrelationIdFilter.MDC_KEY))
                .timestamp(Instant.now())
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetails> handleGeneralException(Exception ex, HttpServletRequest request) {
        ProblemDetails problem = ProblemDetails.builder()
                .type("https://sanrakshan.gov.in/errors/internal-server-error")
                .title("Internal Server Error")
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .detail(ex.getMessage())
                .instance(request.getRequestURI())
                .correlationId(MDC.get(CorrelationIdFilter.MDC_KEY))
                .timestamp(Instant.now())
                .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }
}
