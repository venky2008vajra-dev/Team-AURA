package com.scamcheck.demo.entity;

// STRETCH: table exists now so no migration is needed later when
// image/audio/video (OCR / speech-to-text) support is added.

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "media_attachments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "opportunity_id", nullable = false)
    private Opportunity opportunity;

    @Column(name = "media_type", nullable = false, length = 20)
    private String mediaType; // IMAGE, AUDIO, VIDEO

    @Column(name = "file_path", nullable = false, length = 1000)
    private String filePath;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    @Column(name = "processing_status", length = 20)
    @Builder.Default
    private String processingStatus = "PENDING";

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
