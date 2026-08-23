package com.scamcheck.demo.entity;

import com.scamcheck.demo.enums.AnalysisStatus;
import com.scamcheck.demo.enums.SourceChannel;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "opportunities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Opportunity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 500)
    private String title;

    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_channel", length = 30)
    private SourceChannel sourceChannel;

    @Column(name = "sender_identifier")
    private String senderIdentifier;

    @Column(name = "company_name")
    private String companyName;

    @Column(name = "submitted_url", length = 1000)
    private String submittedUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AnalysisStatus status = AnalysisStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
