package com.scamcheck.demo.analyzer;

import java.util.List;

/**
 * Strategy interface for a single risk indicator. To add a brand-new detector,
 * implement this interface and annotate the class @Component -- nothing else
 * in the system needs to change. DetectorRegistry auto-discovers all beans of
 * this type via Spring's List<RiskDetector> injection.
 */
public interface RiskDetector {

    String getIndicatorCode();

    String getCategory(); // TEXT, URL, EMAIL, COMPANY, MEDIA

    /**
     * Whether this detector is applicable to the given context
     * (e.g. a URL detector only runs when a URL is present).
     */
    boolean supports(AnalysisContext ctx);

    List<DetectorResult> analyze(AnalysisContext ctx);
}
