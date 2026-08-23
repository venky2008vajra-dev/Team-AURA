package com.scamcheck.demo.service;

import com.scamcheck.demo.dto.request.OpportunitySubmitRequest;
import com.scamcheck.demo.dto.response.AnalysisResponse;
import com.scamcheck.demo.dto.response.OpportunityResponse;
import com.scamcheck.demo.entity.AnalysisResult;
import com.scamcheck.demo.entity.Opportunity;
import com.scamcheck.demo.entity.User;
import com.scamcheck.demo.exception.ResourceNotFoundException;
import com.scamcheck.demo.repository.AnalysisResultRepository;
import com.scamcheck.demo.repository.OpportunityRepository;
import com.scamcheck.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OpportunityService {

    private final OpportunityRepository opportunityRepository;
    private final AnalysisResultRepository analysisResultRepository;
    private final UserRepository userRepository;
    private final AnalysisOrchestrationService analysisOrchestrationService;

    public OpportunityResponse submitAndAnalyze(String userEmail, OpportunitySubmitRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Opportunity opportunity = Opportunity.builder()
                .user(user)
                .title(request.getTitle())
                .rawText(request.getRawText())
                .sourceChannel(request.getSourceChannel())
                .senderIdentifier(request.getSenderIdentifier())
                .companyName(request.getCompanyName())
                .submittedUrl(request.getSubmittedUrl())
                .build();

        opportunity = opportunityRepository.save(opportunity);

        // Phase 1: synchronous analysis. Swap to async + status polling in a later phase
        // if media processing (OCR/STT) makes this too slow for a single request.
        AnalysisResponse analysis = analysisOrchestrationService.analyze(opportunity);
        opportunityRepository.save(opportunity);

        return toResponse(opportunity, analysis);
    }

    public OpportunityResponse getById(String userEmail, Long id) {
        Opportunity opportunity = opportunityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Opportunity not found: " + id));

        AnalysisResponse analysis = analysisResultRepository.findByOpportunityId(id)
                .map(this::toAnalysisResponse)
                .orElse(null);

        return toResponse(opportunity, analysis);
    }

    public Page<OpportunityResponse> listForUser(String userEmail, Pageable pageable) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return opportunityRepository.findByUserOrderByCreatedAtDesc(user, pageable)
                .map(o -> toResponse(o, null));
    }

    private OpportunityResponse toResponse(Opportunity opportunity, AnalysisResponse analysis) {
        return OpportunityResponse.builder()
                .opportunityId(opportunity.getId())
                .status(opportunity.getStatus().name())
                .title(opportunity.getTitle())
                .createdAt(opportunity.getCreatedAt())
                .analysis(analysis)
                .build();
    }

    private AnalysisResponse toAnalysisResponse(AnalysisResult result) {
        return AnalysisResponse.builder()
                .riskScore(result.getRiskScore())
                .riskLevel(result.getRiskLevel().name())
                .verdict(result.getVerdict())
                .indicators(result.getMatches().stream().map(m ->
                        com.scamcheck.demo.dto.response.RiskIndicatorDto.builder()
                                .code(m.getIndicatorDefinition().getCode())
                                .category(m.getIndicatorDefinition().getCategory())
                                .severity(m.getIndicatorDefinition().getDefaultSeverity())
                                .evidence(m.getMatchedEvidence())
                                .explanation(m.getIndicatorDefinition().getDescription())
                                .scoreContribution(m.getScoreContribution())
                                .build()
                ).toList())
                .recommendations(java.util.List.of()) // recommendations are generated fresh at analysis time only
                .build();
    }
}
