package com.scamcheck.demo.analyzer;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class SensitiveDocumentRequestDetector implements RiskDetector {

    private static final String CODE = "SENSITIVE_DOCUMENT_REQUEST";

    private static final Pattern PATTERN = Pattern.compile(
            "(?i)(aadhaar|aadhar|pan card|passport|bank (account|details)|debit card|credit card|" +
            "cvv|ifsc|account number)"
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
                    .severity("HIGH")
                    .evidence(matcher.group().trim())
                    .explanation("Requests for sensitive ID or banking documents before an offer is verified are a strong scam signal.")
                    .scoreContribution(20)
                    .build());
        }
        return results;
    }
}
