package com.scamcheck.demo.repository;

import com.scamcheck.demo.entity.AnalysisResult;
import com.scamcheck.demo.entity.Opportunity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AnalysisResultRepository extends JpaRepository<AnalysisResult, Long> {
    Optional<AnalysisResult> findByOpportunity(Opportunity opportunity);
    Optional<AnalysisResult> findByOpportunityId(Long opportunityId);
}
