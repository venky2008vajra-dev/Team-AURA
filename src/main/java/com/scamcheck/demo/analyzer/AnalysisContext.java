package com.scamcheck.demo.analyzer;

import lombok.Builder;
import lombok.Getter;

/**
 * Normalized bundle of everything a RiskDetector might need, regardless of
 * whether the content originated as typed text, OCR output, or a speech-to-text
 * transcript. Detectors only ever read from this object.
 */
@Getter
@Builder
public class AnalysisContext {
    private final String rawText;          // combined text: title + rawText + (future) OCR/STT output
    private final String senderIdentifier;
    private final String companyName;
    private final String submittedUrl;
    private final String sourceChannel;
}
