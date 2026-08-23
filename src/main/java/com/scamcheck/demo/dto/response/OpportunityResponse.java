package com.scamcheck.demo.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class OpportunityResponse {
    private Long opportunityId;
    private String status; // AnalysisStatus
    private AnalysisResponse analysis; // null until COMPLETED
    private String title;
    private LocalDateTime createdAt;
}
