CREATE DATABASE IF NOT EXISTS hemacds_mm;
USE hemacds_mm;

-- -----------------------------------------------------
-- Table `patients` (Demographics, Disease-related Characteristics, and Survival Outcomes)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL UNIQUE COMMENT 'Patient ID (e.g. 12345678)',
    patient_name VARCHAR(100) COMMENT 'Name of the patient',
    dob DATE COMMENT 'Date of Birth',
    age_at_diagnosis INT COMMENT 'Calculated Age at Diagnosis',
    sex VARCHAR(20) COMMENT 'Sex (Male, Female)',
    diagnosis_date DATE COMMENT 'Date of Diagnosis',
    plasma_cell_bm VARCHAR(50) COMMENT 'BM Plasma Cell (e.g., 0.0 %)',
    
    -- Survival Outcomes
    vital_status VARCHAR(50) COMMENT 'Vital Status (Alive, Deceased)',
    last_followup_date DATE COMMENT 'Last Follow-up / Death Date',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `treatments` (Anti-myeloma Treatment Records)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS treatments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL COMMENT 'Reference to patients.patient_id',
    line_of_therapy INT COMMENT 'Line of Therapy (1 to 12)',
    regimen VARCHAR(150) COMMENT 'Treatment Regimen',
    treatment_start_date DATE COMMENT 'Date of Treatment Start',
    best_response VARCHAR(50) COMMENT 'Best Response (NR, sCR, CR, VGPR, SD, DP, Others)',
    disease_progression VARCHAR(20) COMMENT 'Disease Progression (Yes, No)',
    disease_progression_date DATE COMMENT 'Date of Disease Progression',
    discontinuation_status VARCHAR(50) COMMENT 'Discontinuation (Ongoing, Discontinue)',
    discontinuation_reason VARCHAR(150) COMMENT 'Reason for Discontinuation (Disease progression, Toxicity, Others)',
    discontinuation_date DATE COMMENT 'Date of Discontinuation',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_treatments_patient
        FOREIGN KEY (patient_id) 
        REFERENCES patients(patient_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
