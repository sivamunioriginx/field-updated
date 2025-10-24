-- OriginX Database Schema
-- Create database
CREATE DATABASE IF NOT EXISTS originx_farm;
USE originx_farm;

-- Create workers table
CREATE TABLE tbl_workers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(90) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  email VARCHAR(30),
  price DECIMAL(10,2),
  skill_id VARCHAR(50),
  pincode VARCHAR(30),
  mandal VARCHAR(70),
  city VARCHAR(30),
  district VARCHAR(30),
  state VARCHAR(30),
  country VARCHAR(30),
  latitude VARCHAR(30),
  longitude VARCHAR(30),
  address VARCHAR(100),
  type VARCHAR(30),
  profile_image VARCHAR(255),
  document1 VARCHAR(255),
  document2 VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_email ON tbl_workers(email);
CREATE INDEX idx_mobile ON tbl_workers(mobile);
CREATE INDEX idx_district ON tbl_workers(district);
CREATE INDEX idx_pincode ON tbl_workers(pincode);
CREATE INDEX idx_created_at ON tbl_workers(created_at);

-- Sample data (optional)
-- INSERT INTO tbl_workers (name, mobile, email, password, skill_id, pincode, district, state, country) 
-- VALUES ('John Doe', '9876543210', 'john@example.com', '$2a$10$hash', 'Plumbing, Electrical Work', '500001', 'Hyderabad', 'Telangana', 'India');

-- Show table structure
DESCRIBE tbl_workers;

-- Create Service Seeker table
CREATE TABLE tbl_serviceseeker (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(90) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  email VARCHAR(30),
  password VARCHAR(100),
  pincode VARCHAR(30),
  mandal VARCHAR(70),
  city VARCHAR(30),
  district VARCHAR(30),
  state VARCHAR(30),
  country VARCHAR(30),
  latitude VARCHAR(30),
  longitude VARCHAR(30),
  address VARCHAR(100),
  type VARCHAR(30),
  profile_image VARCHAR(255),
  document1 VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Subcategory table
CREATE TABLE tbl_subcategory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(90) NOT NULL,
  category_id VARCHAR(50),
  image varchar(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Category table
CREATE TABLE tbl_category (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(90) NOT NULL,
  image varchar(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(90) NOT NULL,
  subcategory_id VARCHAR(50),
  image varchar(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create banners table
CREATE TABLE tbl_banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(90) NOT NULL,
  sub_title VARCHAR(90) NOT NULL,
  image varchar(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Bookings table
CREATE TABLE tbl_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id VARCHAR(20) NOT NULL,
  worker_id INT NOT NULL,
  user_id INT NOT NULL,
  contact_number VARCHAR(15) NOT NULL,
  work_location VARCHAR(255) NULL,
  booking_time DATETIME NOT NULL,
  status TINYINT NOT NULL DEFAULT 0,
  reject_reason TEXT NULL,
  description TEXT NULL,
  work_documents TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES tbl_workers(id) ON DELETE CASCADE
);

-- Create tbl_workerlocation table
CREATE TABLE IF NOT EXISTS `tbl_workerlocation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `worker_id` int(11) NOT NULL,
  `latitude` decimal(10,6) NOT NULL,
  `longitude` decimal(10,6) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_worker_location` (`worker_id`),
  KEY `idx_worker_id` (`worker_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;