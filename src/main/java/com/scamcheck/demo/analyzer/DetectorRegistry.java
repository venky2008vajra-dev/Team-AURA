package com.scamcheck.demo.analyzer;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DetectorRegistry {

    // Spring auto-injects every bean implementing RiskDetector here.
    private final List<RiskDetector> detectors;

    public List<DetectorResult> runAll(AnalysisContext ctx) {
        List<DetectorResult> results = new ArrayList<>();
        for (RiskDetector detector : detectors) {
            if (detector.supports(ctx)) {
                results.addAll(detector.analyze(ctx));
            }
        }
        return results;
    }
}
