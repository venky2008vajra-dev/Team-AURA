package com.scamcheck.demo.analyzer;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class UnrealisticSalaryDetector implements RiskDetector {

    private static final String CODE = "UNREALISTIC_SALARY";

    // Captures figures like "₹50,000/day", "$500 per hour", "earn 1 lakh per week"
    private static final Pattern DAILY_OR_HOURLY = Pattern.compile(
            "(?i)(₹|rs\\.?|inr|\\$)\\s?([\\d,]+)\\s?(per day|/day|daily|per hour|/hour|hourly)"
    );
    private static final Pattern WEEKLY_LAKH = Pattern.compile(
            "(?i)(\\d+)\\s?(lakh|lac)s?\\s?(per week|/week|weekly)"
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
        String text = ctx.getRawText();

        Matcher m1 = DAILY_OR_HOURLY.matcher(text);
        if (m1.find()) {
            String amountStr = m1.group(2).replace(",", "");
            long amount = Long.parseLong(amountStr);
            // rough sanity threshold: >2000/day or >200/hour for an unskilled/entry role is a red flag
            boolean isHourly = m1.group(3).toLowerCase().contains("hour");
            long threshold = isHourly ? 200 : 2000;
            if (amount > threshold) {
                results.add(buildResult(m1.group().trim()));
            }
        }

        Matcher m2 = WEEKLY_LAKH.matcher(text);
        if (m2.find()) {
            results.add(buildResult(m2.group().trim()));
        }

        return results;
    }

    private DetectorResult buildResult(String evidence) {
        return DetectorResult.builder()
                .indicatorCode(CODE)
                .category("TEXT")
                .severity("MEDIUM")
                .evidence(evidence)
                .explanation("The advertised pay is well outside realistic market rates for the described role.")
                .scoreContribution(20)
                .build();
    }
}
