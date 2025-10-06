# OTP Setup Guide for OriginX Backend

## Overview
This guide explains how to set up OTP (One-Time Password) functionality using TextLocal SMS service for the OriginX Field Service App.

## Prerequisites
1. TextLocal account (https://www.textlocal.in/)
2. API key from TextLocal
3. Node.js and npm installed

## Setup Steps

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure TextLocal API
Create a `.env` file in the backend directory with the following content:

```env
# TextLocal SMS API Configuration
TEXTLOCAL_API_KEY=Njc3MDYxNzA2MTQ3NzM0NjQ2NDk3NDU0NmI2ZTdhNTA=
TEXTLOCAL_SENDER=TXTLCL

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=originx_farm

# Server Configuration
PORT=3000
NODE_ENV=development
```

**✅ Your API Key is already configured in the server!**

### 3. Get TextLocal API Key
1. Sign up at https://www.textlocal.in/
2. Go to API section
3. Generate your API key
4. Replace the API key in the .env file (if you want to use environment variables)

### 4. Update Database Schema
Make sure your database tables have a `mobile` field:

```sql
-- For tbl_workers table
ALTER TABLE tbl_workers ADD COLUMN mobile VARCHAR(15) UNIQUE;

-- For tbl_serviceseeker table  
ALTER TABLE tbl_serviceseeker ADD COLUMN mobile VARCHAR(15) UNIQUE;
```

### 5. Start the Server
```bash
npm run dev
```

## API Endpoints

### Send OTP
- **POST** `/api/send-otp`
- **Body**: `{ "mobile": "9876543210", "userType": "professional" }`
- **Response**: `{ "success": true, "message": "OTP sent successfully" }`

### Verify OTP
- **POST** `/api/verify-otp`
- **Body**: `{ "mobile": "9876543210", "otp": "123456", "userType": "professional" }`
- **Response**: Login success or registration required

## Features
- ✅ 6-digit OTP generation
- ✅ 10-minute OTP expiry
- ✅ Mobile number validation
- ✅ User type selection (Professional/Seeker)
- ✅ Automatic user detection
- ✅ Registration flow integration
- ✅ Resend OTP with countdown

## Security Notes
- OTPs are stored in memory (use Redis in production)
- Mobile numbers are validated for Indian format
- API key is configured and ready to use
- Consider rate limiting for production

## Testing
Test the OTP flow:
1. Choose user type
2. Enter mobile number
3. Send OTP
4. Enter received OTP
5. Verify and proceed

## Troubleshooting
- Check TextLocal API key validity
- Verify mobile number format (10 digits)
- Ensure database connection
- Check server logs for errors

## Current Status
🎉 **OTP system is fully configured and ready to use!**
- API key is set
- Dependencies are installed
- Backend endpoints are ready
- Frontend is updated with new design
