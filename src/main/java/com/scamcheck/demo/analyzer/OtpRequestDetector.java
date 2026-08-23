package com.scamcheck.demo.analyzer;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class OtpRequestDetector implements RiskDetector {

    private static final String CODE = "OTP_REQUEST";

    private static final Pattern PATTERN = Pattern.compile(
            "(?i)(share|send|provide|enter)\\s+(your\\s+)?(otp|one[- ]time password|verification code|pin)"
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
                    .severity("CRITICAL")
                    .evidence(matcher.group().trim())
                    .explanation("No legitimate employer or platform will ever ask for your OTP or verification code.")
                    .scoreContribution(25)
                    .build());
        }
        return results;
    }
}
