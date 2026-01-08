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
  status TINYINT DEFAULT 0,
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
  status TINYINT NOT NULL DEFAULT 1,
  visibility TINYINT NOT NULL DEFAULT 1,
  image varchar(255) NOT NULL,
  video_title VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Category table
CREATE TABLE tbl_category (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(90) NOT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  image varchar(255) NOT NULL,
  visibility TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tbl_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(90) NOT NULL,
  subcategory_id VARCHAR(50),
  image varchar(255) NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  is_top_service TINYINT DEFAULT 0,
  instant_service TINYINT DEFAULT 0,
  status TINYINT NOT NULL DEFAULT 1,
  visibility TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create deals table
CREATE TABLE tbl_deals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  discount VARCHAR(20) NOT NULL,
  original_price DECIMAL(10,2) NOT NULL,
  deal_price DECIMAL(10,2) NOT NULL,
  is_active TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES tbl_services(id) ON DELETE CASCADE
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
  contact_name VARCHAR(50) NOT NULL,
  work_location VARCHAR(255) NULL,
  work_location_lat DECIMAL(10,6) NULL,
  work_location_lng DECIMAL(10,6) NULL,
  booking_time DATETIME NOT NULL,
  status TINYINT NOT NULL DEFAULT 0,
  payment_status TINYINT NOT NULL DEFAULT 0,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
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

-- Create tbl_requestquote table
CREATE TABLE tbl_requestquote (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id int(11) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(30),
    work_description TEXT,
    location VARCHAR(255),
    documents TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tbl_admin table
CREATE TABLE tbl_admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create tbl_payments table
CREATE TABLE tbl_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bookingid INT NOT NULL,              
    payment_id VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create tbl_canceledbooking table
CREATE TABLE tbl_canceledbookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookingid VARCHAR(50) NOT NULL,
  cancel_reason TEXT NOT NULL,
  type TINYINT(1) NOT NULL COMMENT '1 or 2',
  status TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create tbl_rescheduledbookings table
CREATE TABLE tbl_rescheduledbookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookingid VARCHAR(50) NOT NULL,
  reschedule_reason TEXT NOT NULL,
  reschedule_date DATETIME NOT NULL,
  type TINYINT(1) NOT NULL COMMENT '1 or 2',
  status TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create tbl_animations table for animations for home screen in customer app
CREATE TABLE tbl_animations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    video_title VARCHAR(255) NOT NULL,
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- create tbl_customerratings table for customer ratings
CREATE TABLE tbl_customerratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bookingid INT NOT NULL,
    service_id INT NOT NULL,
    rating TINYINT NOT NULL,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create tbl_faqs table for FAQs & Process
-- Each row represents one item: a process, a note, or an FAQ
CREATE TABLE tbl_faqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    process_name VARCHAR(255) DEFAULT NULL,
    process_text TEXT DEFAULT NULL,
    note TEXT DEFAULT NULL,
    question TEXT DEFAULT NULL,
    answer TEXT DEFAULT NULL,
    status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES tbl_services(id) ON DELETE CASCADE,
    INDEX idx_service_id (service_id),
    INDEX idx_status (status)
);