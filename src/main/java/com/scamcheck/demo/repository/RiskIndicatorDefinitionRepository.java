package com.scamcheck.demo.repository;

import com.scamcheck.demo.entity.RiskIndicatorDefinition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RiskIndicatorDefinitionRepository extends JpaRepository<RiskIndicatorDefinition, Long> {
    Optional<RiskIndicatorDefinition> findByCode(String code);
}
