-- Users table for authentication
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role ENUM('student', 'company') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student profiles
CREATE TABLE student_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  school VARCHAR(255),
  field VARCHAR(255),
  degree_level VARCHAR(255),
  graduation_year INT,
  location VARCHAR(255),
  bio TEXT,
  headline VARCHAR(255),
  notification_threshold INT DEFAULT 65,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- Student skills
CREATE TABLE student_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  skill_name VARCHAR(255) NOT NULL,
  proficiency_level INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_skills_profile
    FOREIGN KEY (student_id) REFERENCES student_profiles(id)
    ON DELETE CASCADE,
  UNIQUE KEY uk_student_skill (student_id, skill_name)
);

-- Student interests (stores personal characteristics, professional interests, subjects, locations)
CREATE TABLE student_interests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  interest_type ENUM('personal_characteristic', 'professional_interest', 'current_subject', 'completed_subject', 'preferred_location') NOT NULL,
  interest_value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_interests_profile
    FOREIGN KEY (student_id) REFERENCES student_profiles(id)
    ON DELETE CASCADE
);

-- Company profiles
CREATE TABLE company_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  website VARCHAR(255),
  logo VARCHAR(255),
  industry VARCHAR(255),
  size VARCHAR(255),
  location VARCHAR(255),
  description TEXT,
  registration_complete BOOLEAN DEFAULT FALSE,
  expectations_quality_score INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_company_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- Company qualifications (stores core qualifications, work areas, hiring focus)
CREATE TABLE company_qualifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  qualification_type ENUM('core_qualification', 'work_area', 'hiring_focus') NOT NULL,
  value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_company_qualifications_profile
    FOREIGN KEY (company_id) REFERENCES company_profiles(id)
    ON DELETE CASCADE
);

-- Cases (both drafts and published, status field distinguishes them)
CREATE TABLE cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  task_focus VARCHAR(255),
  status ENUM('draft', 'published') DEFAULT 'draft',
  role_track VARCHAR(255),
  assignment_context TEXT,
  website VARCHAR(255),
  logo VARCHAR(255),
  technical_terms TEXT,
  task_description TEXT,
  deliveries TEXT,
  expectations TEXT,
  candidate_profile VARCHAR(255),
  collaboration_style VARCHAR(255),
  scope_preset VARCHAR(255),
  work_mode VARCHAR(255),
  location VARCHAR(255),
  start_date VARCHAR(255),
  end_date VARCHAR(255),
  start_within VARCHAR(255),
  max_hours INT,
  salary_type VARCHAR(255) DEFAULT 'hourly',
  compensation_amount VARCHAR(255),
  generated_ad TEXT,
  classification VARCHAR(255),
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cases_company
    FOREIGN KEY (company_id) REFERENCES company_profiles(id)
    ON DELETE CASCADE
);

-- Case qualifications (stores company, professional, and personal qualifications on cases)
CREATE TABLE case_qualifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  qualification_type ENUM('company', 'professional', 'personal') NOT NULL,
  value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_case_qualifications_case
    FOREIGN KEY (case_id) REFERENCES cases(id)
    ON DELETE CASCADE
);
