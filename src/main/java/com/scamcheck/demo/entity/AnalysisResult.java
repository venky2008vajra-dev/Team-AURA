package com.scamcheck.demo.entity;

import com.scamcheck.demo.enums.RiskLevel;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "analysis_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalysisResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "opportunity_id", nullable = false, unique = true)
    private Opportunity opportunity;

    @Column(name = "risk_score", nullable = false)
    private Integer riskScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false, length = 20)
    private RiskLevel riskLevel;

    @Column(nullable = false, length = 500)
    private String verdict;

    @Column(name = "analyzed_at", nullable = false)
    @Builder.Default
    private LocalDateTime analyzedAt = LocalDateTime.now();

    @Column(name = "analysis_version", length = 20)
    @Builder.Default
    private String analysisVersion = "v1";

    @OneToMany(mappedBy = "analysisResult", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<AnalysisIndicatorMatch> matches = new ArrayList<>();
}
