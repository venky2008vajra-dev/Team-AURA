package com.scamcheck.demo.service;

import com.scamcheck.demo.analyzer.AnalysisContext;
import com.scamcheck.demo.analyzer.DetectorRegistry;
import com.scamcheck.demo.analyzer.DetectorResult;
import com.scamcheck.demo.dto.response.AnalysisResponse;
import com.scamcheck.demo.entity.AnalysisIndicatorMatch;
import com.scamcheck.demo.entity.AnalysisResult;
import com.scamcheck.demo.entity.Opportunity;
import com.scamcheck.demo.entity.RiskIndicatorDefinition;
import com.scamcheck.demo.enums.AnalysisStatus;
import com.scamcheck.demo.enums.RiskLevel;
import com.scamcheck.demo.exception.AnalysisFailedException;
import com.scamcheck.demo.repository.AnalysisResultRepository;
import com.scamcheck.demo.repository.RiskIndicatorDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * The pipeline conductor: builds the AnalysisContext, runs all applicable
 * detectors, scores the result, and persists everything needed for the
 * explainable response. Orchestrates -- doesn't contain detection logic itself.
 */
@Service
@RequiredArgsConstructor
public class AnalysisOrchestrationService {

    private final DetectorRegistry detectorRegistry;
    private final RiskScoringService riskScoringService;
    private final AnalysisResultRepository analysisResultRepository;
    private final RiskIndicatorDefinitionRepository indicatorDefinitionRepository;

    @Transactional
    public AnalysisResponse analyze(Opportunity opportunity) {
        try {
            AnalysisContext context = AnalysisContext.builder()
                    .rawText(buildCombinedText(opportunity))
                    .senderIdentifier(opportunity.getSenderIdentifier())
                    .companyName(opportunity.getCompanyName())
                    .submittedUrl(opportunity.getSubmittedUrl())
                    .sourceChannel(opportunity.getSourceChannel() != null ? opportunity.getSourceChannel().name() : null)
                    .build();

            List<DetectorResult> detectorResults = detectorRegistry.runAll(context);
            AnalysisResponse response = riskScoringService.score(detectorResults);

            persist(opportunity, response, detectorResults);

            opportunity.setStatus(AnalysisStatus.COMPLETED);
            return response;

        } catch (Exception ex) {
            opportunity.setStatus(AnalysisStatus.FAILED);
            throw new AnalysisFailedException("Analysis failed for opportunity " + opportunity.getId(), ex);
        }
    }

    private String buildCombinedText(Opportunity opportunity) {
        StringBuilder sb = new StringBuilder();
        if (opportunity.getTitle() != null) sb.append(opportunity.getTitle()).append(". ");
        if (opportunity.getRawText() != null) sb.append(opportunity.getRawText());
        // Future: append OCR / speech-to-text extracted text from MediaAttachment here too.
        return sb.toString();
    }

    private void persist(Opportunity opportunity, AnalysisResponse response, List<DetectorResult> detectorResults) {
        AnalysisResult analysisResult = AnalysisResult.builder()
                .opportunity(opportunity)
                .riskScore(response.getRiskScore())
                .riskLevel(RiskLevel.valueOf(response.getRiskLevel()))
                .verdict(response.getVerdict())
                .build();

        AnalysisResult saved = analysisResultRepository.save(analysisResult);

        for (DetectorResult result : detectorResults) {
            RiskIndicatorDefinition definition = indicatorDefinitionRepository.findByCode(result.getIndicatorCode())
                    .orElseGet(() -> indicatorDefinitionRepository.save(
                            RiskIndicatorDefinition.builder()
                                    .code(result.getIndicatorCode())
                                    .category(result.getCategory())
                                    .defaultSeverity(result.getSeverity())
                                    .defaultWeight(result.getScoreContribution())
                                    .description(result.getExplanation())
                                    .build()
                    ));

            AnalysisIndicatorMatch match = AnalysisIndicatorMatch.builder()
                    .analysisResult(saved)
                    .indicatorDefinition(definition)
                    .matchedEvidence(result.getEvidence())
                    .scoreContribution(result.getScoreContribution())
                    .build();

            saved.getMatches().add(match);
        }
    }
}
