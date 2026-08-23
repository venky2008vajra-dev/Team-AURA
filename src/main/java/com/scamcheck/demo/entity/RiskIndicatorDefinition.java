package com.scamcheck.demo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "risk_indicator_definitions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskIndicatorDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String code;

    @Column(nullable = false, length = 30)
    private String category;

    @Column(name = "default_severity", nullable = false, length = 20)
    private String defaultSeverity;

    @Column(name = "default_weight", nullable = false)
    private Integer defaultWeight;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "recommendation_text", length = 500)
    private String recommendationText;
}
