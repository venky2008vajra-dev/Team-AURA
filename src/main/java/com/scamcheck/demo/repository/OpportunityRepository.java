package com.scamcheck.demo.repository;

import com.scamcheck.demo.entity.Opportunity;
import com.scamcheck.demo.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {
    Page<Opportunity> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
}
