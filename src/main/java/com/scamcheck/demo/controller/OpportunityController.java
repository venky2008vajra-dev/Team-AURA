package com.scamcheck.demo.controller;

import com.scamcheck.demo.dto.request.OpportunitySubmitRequest;
import com.scamcheck.demo.dto.response.AnalysisResponse;
import com.scamcheck.demo.dto.response.OpportunityResponse;
import com.scamcheck.demo.service.OpportunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/opportunities")
@RequiredArgsConstructor
public class OpportunityController {

    private final OpportunityService opportunityService;

    @PostMapping
    public ResponseEntity<OpportunityResponse> submit(@Valid @RequestBody OpportunitySubmitRequest request,
                                                        Authentication authentication) {
        OpportunityResponse response = opportunityService.submitAndAnalyze(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OpportunityResponse> getById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(opportunityService.getById(authentication.getName(), id));
    }

    @GetMapping("/{id}/analysis")
    public ResponseEntity<AnalysisResponse> getAnalysis(@PathVariable Long id, Authentication authentication) {
        OpportunityResponse response = opportunityService.getById(authentication.getName(), id);
        return ResponseEntity.ok(response.getAnalysis());
    }

    @GetMapping
    public ResponseEntity<Page<OpportunityResponse>> list(Authentication authentication, Pageable pageable) {
        return ResponseEntity.ok(opportunityService.listForUser(authentication.getName(), pageable));
    }
}
