package in.gov.sanrakshan.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Sanrakshan API")
                        .version("1.0.0")
                        .description("Disaster Decision-Support & Confidence Fusion System of Record")
                        .contact(new Contact().name("Sanrakshan Engineering").email("dev@sanrakshan.gov.in"))
                        .license(new License().name("Proprietary - Government of India Simulation Boundary")));
    }
}
