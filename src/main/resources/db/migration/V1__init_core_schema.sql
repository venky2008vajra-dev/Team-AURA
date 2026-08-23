CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE opportunities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(500),
    raw_text TEXT,
    source_channel VARCHAR(30),
    sender_identifier VARCHAR(255),
    company_name VARCHAR(255),
    submitted_url VARCHAR(1000),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_opportunities_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE media_attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id BIGINT NOT NULL,
    media_type VARCHAR(20) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100),
    extracted_text TEXT,
    processing_status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_media_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
);

CREATE TABLE risk_indicator_definitions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    category VARCHAR(30) NOT NULL,
    default_severity VARCHAR(20) NOT NULL,
    default_weight INT NOT NULL,
    description VARCHAR(500) NOT NULL,
    recommendation_text VARCHAR(500)
);

CREATE TABLE analysis_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id BIGINT NOT NULL UNIQUE,
    risk_score INT NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    verdict VARCHAR(500) NOT NULL,
    analyzed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    analysis_version VARCHAR(20),
    CONSTRAINT fk_analysis_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
);

CREATE TABLE analysis_indicator_matches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    analysis_result_id BIGINT NOT NULL,
    indicator_definition_id BIGINT NOT NULL,
    matched_evidence TEXT,
    score_contribution INT NOT NULL,
    CONSTRAINT fk_match_analysis FOREIGN KEY (analysis_result_id) REFERENCES analysis_results(id),
    CONSTRAINT fk_match_indicator FOREIGN KEY (indicator_definition_id) REFERENCES risk_indicator_definitions(id)
);

CREATE TABLE company_profiles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL UNIQUE,
    official_domain VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_source VARCHAR(100),
    last_checked_at TIMESTAMP NULL,
    notes TEXT
);

CREATE INDEX idx_opportunities_user_id ON opportunities(user_id);
CREATE INDEX idx_analysis_matches_result_id ON analysis_indicator_matches(analysis_result_id);
