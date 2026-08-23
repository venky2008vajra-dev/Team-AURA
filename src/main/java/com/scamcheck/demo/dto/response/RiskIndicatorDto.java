package com.scamcheck.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class RiskIndicatorDto {
    private String code;
    private String category;
    private String severity;
    private String evidence;
    private String explanation;
    private int scoreContribution;
}
