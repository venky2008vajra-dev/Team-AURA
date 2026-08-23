package com.scamcheck.demo.service;

import com.scamcheck.demo.analyzer.DetectorResult;
import com.scamcheck.demo.config.RiskScoringConfig;
import com.scamcheck.demo.dto.response.AnalysisResponse;
import com.scamcheck.demo.dto.response.RiskIndicatorDto;
import com.scamcheck.demo.enums.RiskLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Aggregates DetectorResults (produced by the analyzer package) into a final
 * explainable score, level, verdict, and recommendation list. Weights and
 * thresholds are externalized in RiskScoringConfig / application.yml, so
 * tuning the model never requires a code change.
 */
@Service
@RequiredArgsConstructor
public class RiskScoringService {

    private final RiskScoringConfig config;

    public AnalysisResponse score(List<DetectorResult> detectorResults) {
        int totalScore = detectorResults.stream()
                .mapToInt(DetectorResult::getScoreContribution)
                .sum();

        int clampedScore = Math.max(0, Math.min(100, totalScore));

        RiskScoringConfig.Thresholds t = config.getThresholds();
        RiskLevel level = RiskLevel.fromScore(clampedScore, t.getLowMax(), t.getMediumMax(), t.getHighMax());

        List<RiskIndicatorDto> indicatorDtos = detectorResults.stream()
                .map(r -> RiskIndicatorDto.builder()
                        .code(r.getIndicatorCode())
                        .category(r.getCategory())
                        .severity(r.getSeverity())
                        .evidence(r.getEvidence())
                        .explanation(r.getExplanation())
                        .scoreContribution(r.getScoreContribution())
                        .build())
                .collect(Collectors.toList());

        return AnalysisResponse.builder()
                .riskScore(clampedScore)
                .riskLevel(level.name())
                .verdict(buildVerdict(level, indicatorDtos.size()))
                .indicators(indicatorDtos)
                .recommendations(buildRecommendations(detectorResults))
                .build();
    }

    private String buildVerdict(RiskLevel level, int indicatorCount) {
        return switch (level) {
            case LOW -> indicatorCount == 0
                    ? "No significant scam indicators detected. Still verify the company independently before proceeding."
                    : "Minor concerns noted, but overall this opportunity appears low risk.";
            case MEDIUM -> "Some suspicious signals detected. Verify carefully before taking any action.";
            case HIGH -> "Multiple strong scam indicators detected. Proceed with extreme caution.";
            case CRITICAL -> "This opportunity shows critical scam indicators. Strongly recommended to avoid.";
        };
    }

    private List<String> buildRecommendations(List<DetectorResult> results) {
        Set<String> recommendations = new LinkedHashSet<>();
        Set<String> codes = results.stream().map(DetectorResult::getIndicatorCode).collect(Collectors.toSet());

        if (codes.contains("PAYMENT_FEE_REQUEST")) {
            recommendations.add("Do not make any payment to secure this offer.");
        }
        if (codes.contains("OTP_REQUEST")) {
            recommendations.add("Never share an OTP or verification code with anyone, regardless of who they claim to be.");
        }
        if (codes.contains("SENSITIVE_DOCUMENT_REQUEST")) {
            recommendations.add("Do not send ID or banking documents until you have independently verified the employer.");
        }
        if (codes.contains("UNREALISTIC_SALARY")) {
            recommendations.add("Compare the advertised pay against realistic market rates for similar roles.");
        }
        if (codes.contains("URGENT_LANGUAGE")) {
            recommendations.add("Take your time -- legitimate offers do not require snap decisions under pressure.");
        }
        if (codes.contains("SUSPICIOUS_KEYWORD")) {
            recommendations.add("Be cautious of vague, too-good-to-be-true job descriptions.");
        }

        recommendations.add("Verify the company's official careers page and domain directly.");
        recommendations.add("Cross-check the recruiter's contact details against the company's official channels.");

        return new ArrayList<>(recommendations);
    }
}
