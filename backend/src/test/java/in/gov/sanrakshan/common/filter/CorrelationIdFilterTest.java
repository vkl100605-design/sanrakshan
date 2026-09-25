package in.gov.sanrakshan.common.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CorrelationIdFilterTest {

    private CorrelationIdFilter filter;

    @BeforeEach
    void setUp() {
        filter = new CorrelationIdFilter();
    }

    @Test
    @DisplayName("Should preserve existing X-Correlation-ID header if supplied in request")
    void testPreservesExistingCorrelationId() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(CorrelationIdFilter.CORRELATION_ID_HEADER, "custom-trace-id-12345");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, chain);

        verify(chain, times(1)).doFilter(request, response);
        assertEquals("custom-trace-id-12345", response.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER));
    }

    @Test
    @DisplayName("Should generate a new UUID X-Correlation-ID header if omitted in request")
    void testGeneratesCorrelationIdWhenMissing() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilterInternal(request, response, chain);

        verify(chain, times(1)).doFilter(request, response);
        String generated = response.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER);
        assertNotNull(generated);
        assertFalse(generated.isBlank());
    }
}
