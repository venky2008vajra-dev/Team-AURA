package com.scamcheck.demo.analyzer;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class SuspiciousKeywordDetector implements RiskDetector {

    private static final String CODE = "SUSPICIOUS_KEYWORD";

    // Curated, easily extendable keyword list.
    private static final Pattern PATTERN = Pattern.compile(
            "(?i)(no experience needed|work from home.{0,20}earn|guaranteed (job|income|placement)|" +
            "easy money|be your own boss|selected without interview|100% job guarantee)"
    );

    @Override
    public String getIndicatorCode() { return CODE; }

    @Override
    public String getCategory() { return "TEXT"; }

    @Override
    public boolean supports(AnalysisContext ctx) {
        return ctx.getRawText() != null && !ctx.getRawText().isBlank();
    }

    @Override
    public List<DetectorResult> analyze(AnalysisContext ctx) {
        List<DetectorResult> results = new ArrayList<>();
        Matcher matcher = PATTERN.matcher(ctx.getRawText());
        if (matcher.find()) {
            results.add(DetectorResult.builder()
                    .indicatorCode(CODE)
                    .category("TEXT")
                    .severity("LOW")
                    .evidence(matcher.group().trim())
                    .explanation("Phrasing commonly used in mass-distributed scam postings rather than genuine job listings.")
                    .scoreContribution(10)
                    .build());
        }
        return results;
    }
}
