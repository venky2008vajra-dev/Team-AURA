package com.scamcheck.demo.enums;

public enum RiskLevel {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL;

    public static RiskLevel fromScore(int score, int lowMax, int mediumMax, int highMax) {
        if (score <= lowMax) return LOW;
        if (score <= mediumMax) return MEDIUM;
        if (score <= highMax) return HIGH;
        return CRITICAL;
    }
}
