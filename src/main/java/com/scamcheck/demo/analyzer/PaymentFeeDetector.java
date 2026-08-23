package com.scamcheck.demo.analyzer;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class PaymentFeeDetector implements RiskDetector {

    private static final String CODE = "PAYMENT_FEE_REQUEST";

    // currency symbol/word near fee-related keywords
    private static final Pattern PATTERN = Pattern.compile(
            "(?i)(registration|security|processing|refundable|onboarding|training)\\s+(fee|charge|deposit)|" +
            "(?i)(pay|deposit|transfer)\\s+(₹|rs\\.?|inr|\\$)\\s?\\d+|" +
            "(?i)(₹|rs\\.?|inr|\\$)\\s?\\d+.{0,30}(fee|deposit|charge|refundable)"
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
                    .explanation("Legitimate employers do not charge candidates to apply, register, or onboard.")
                    .scoreContribution(30)
                    .build());
        }
        return results;
    }
}
