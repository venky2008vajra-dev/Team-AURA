package com.scamcheck.demo.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
@ConfigurationProperties(prefix = "risk-scoring")
public class RiskScoringConfig {

    // indicatorCode -> weight (used as a fallback if a DetectorResult didn't set its own contribution)
    private Map<String, Integer> weights = new HashMap<>();

    private Thresholds thresholds = new Thresholds();

    @Getter
    @Setter
    public static class Thresholds {
        private int lowMax = 29;
        private int mediumMax = 59;
        private int highMax = 79;
    }
}
