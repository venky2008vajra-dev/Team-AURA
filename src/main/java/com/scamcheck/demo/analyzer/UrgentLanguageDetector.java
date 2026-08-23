package com.scamcheck.demo.analyzer;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class UrgentLanguageDetector implements RiskDetector {

    private static final String CODE = "URGENT_LANGUAGE";

    private static final Pattern PATTERN = Pattern.compile(
            "(?i)(act now|hurry|limited (time|slots|seats)|expires? (today|soon|in \\d+ (hour|min))|" +
            "only \\d+ (hour|minute)s? left|urgent(ly)?|immediately|last chance|offer valid (only )?for)"
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
                    .severity("MEDIUM")
                    .evidence(matcher.group().trim())
                    .explanation("Artificial urgency is a common pressure tactic used to prevent victims from verifying an offer.")
                    .scoreContribution(15)
                    .build());
        }
        return results;
    }
}
