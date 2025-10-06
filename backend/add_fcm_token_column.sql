-- Add FCM token column to both user tables
-- Run this script to add Firebase Cloud Messaging token support

-- Add fcm_token column to tbl_workers table
ALTER TABLE tbl_workers 
ADD COLUMN fcm_token VARCHAR(255) NULL 
COMMENT 'Firebase Cloud Messaging token for push notifications';

-- Add fcm_token column to tbl_serviceseeker table  
ALTER TABLE tbl_serviceseeker 
ADD COLUMN fcm_token VARCHAR(255) NULL 
COMMENT 'Firebase Cloud Messaging token for push notifications';

-- Add index for better performance when querying by fcm_token
CREATE INDEX idx_workers_fcm_token ON tbl_workers(fcm_token);
CREATE INDEX idx_serviceseeker_fcm_token ON tbl_serviceseeker(fcm_token);

-- Show the updated table structures
DESCRIBE tbl_workers;
DESCRIBE tbl_serviceseeker;
