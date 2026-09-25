package in.gov.sanrakshan.health;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class HealthControllerTest {

    private final HealthController controller = new HealthController();

    @Test
    @DisplayName("Health endpoint should return UP status and report database, kafka, neo4j, and storage components")
    void testGetHealth() {
        ResponseEntity<Map<String, Object>> response = controller.getHealth();

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals("UP", body.get("status"));
        assertEquals("sanrakshan-backend", body.get("service"));

        @SuppressWarnings("unchecked")
        Map<String, Object> components = (Map<String, Object>) body.get("components");
        assertNotNull(components);
        assertTrue(components.containsKey("database"));
        assertTrue(components.containsKey("kafka"));
        assertTrue(components.containsKey("neo4j"));
        assertTrue(components.containsKey("storage"));
    }
}
