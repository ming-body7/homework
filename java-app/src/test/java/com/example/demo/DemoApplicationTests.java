package com.example.demo;

import io.awspring.cloud.autoconfigure.core.AwsAutoConfiguration;
import io.awspring.cloud.autoconfigure.core.CredentialsProviderAutoConfiguration;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

@ImportAutoConfiguration(exclude = {CredentialsProviderAutoConfiguration.class, AwsAutoConfiguration.class})
class DemoApplicationTests {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public MeterRegistry testMeterRegistry() {
            return Mockito.mock(MeterRegistry.class);
        }
    }

    @Test
    void contextLoads() {
    }

}