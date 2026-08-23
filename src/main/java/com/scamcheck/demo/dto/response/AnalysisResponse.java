package com.scamcheck.demo.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AnalysisResponse {
    private int riskScore;
    private String riskLevel;
    private String verdict;
    private List<RiskIndicatorDto> indicators;
    private List<String> recommendations;
}
