package com.scamcheck.demo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "analysis_indicator_matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalysisIndicatorMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "analysis_result_id", nullable = false)
    private AnalysisResult analysisResult;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "indicator_definition_id", nullable = false)
    private RiskIndicatorDefinition indicatorDefinition;

    @Column(name = "matched_evidence", columnDefinition = "TEXT")
    private String matchedEvidence;

    @Column(name = "score_contribution", nullable = false)
    private Integer scoreContribution;
}
