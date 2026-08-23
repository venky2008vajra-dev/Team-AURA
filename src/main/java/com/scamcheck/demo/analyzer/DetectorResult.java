package com.scamcheck.demo.analyzer;

import lombok.Builder;
import lombok.Getter;

/**
 * The explainability unit: one indicator that fired, with the evidence that
 * triggered it and how many points it contributes to the final score.
 */
@Getter
@Builder
public class DetectorResult {
    private final String indicatorCode;
    private final String category;
    private final String severity;       // LOW, MEDIUM, HIGH, CRITICAL
    private final String evidence;       // exact snippet that triggered it
    private final String explanation;
    private final int scoreContribution;
}
