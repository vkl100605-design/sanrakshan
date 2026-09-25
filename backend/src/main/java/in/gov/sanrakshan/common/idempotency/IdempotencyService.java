package in.gov.sanrakshan.common.idempotency;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class IdempotencyService {

    private final Map<String, Object> responseCache = new ConcurrentHashMap<>();

    public boolean hasExecuted(String idempotencyKey) {
        if (!StringUtils.hasText(idempotencyKey)) {
            return false;
        }
        return responseCache.containsKey(idempotencyKey);
    }

    @SuppressWarnings("unchecked")
    public <T> Optional<T> getCachedResponse(String idempotencyKey) {
        if (!StringUtils.hasText(idempotencyKey)) {
            return Optional.empty();
        }
        return Optional.ofNullable((T) responseCache.get(idempotencyKey));
    }

    public void recordExecution(String idempotencyKey, Object response) {
        if (StringUtils.hasText(idempotencyKey) && response != null) {
            responseCache.put(idempotencyKey, response);
        }
    }
}
