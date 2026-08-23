package com.scamcheck.demo.dto.request;

import com.scamcheck.demo.enums.SourceChannel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OpportunitySubmitRequest {

    @Size(max = 500)
    private String title;

    @NotBlank(message = "rawText must not be blank")
    private String rawText;

    private SourceChannel sourceChannel;

    private String senderIdentifier;

    private String companyName;

    private String submittedUrl;
}
