package com.example.demo;

import io.awspring.cloud.autoconfigure.core.AwsAutoConfiguration;
import io.awspring.cloud.autoconfigure.core.CredentialsProviderAutoConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@ImportAutoConfiguration(exclude = {CredentialsProviderAutoConfiguration.class, AwsAutoConfiguration.class})
class DemoApplicationTests {

    @Test
    void contextLoads() {
    }

}