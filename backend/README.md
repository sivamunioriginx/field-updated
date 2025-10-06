# OriginX Backend Server

Backend server for the OriginX Field Service App with MySQL database integration.

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- npm or yarn

## Database Setup

1. Create a MySQL database named `originx_farm`
2. Create the `tbl_workers` table using the provided SQL:

```sql
CREATE TABLE tbl_workers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(90) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  email VARCHAR(30),
  password VARCHAR(100),
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
  profile_image VARCHAR(255),
  document1 VARCHAR(255),
  document2 VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Update database configuration in `server.js`:
```javascript
const dbConfig = {
  host: 'localhost',
  user: 'your_mysql_username',
  password: 'your_mysql_password',
  database: 'originx_farm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
- **GET** `/api/health`
- Returns server status

### Register Professional
- **POST** `/api/register-professional`
- Content-Type: `multipart/form-data`
- Fields:
  - `name` (string, required)
  - `mobile` (string, required)
  - `email` (string, required)
  - `password` (string, required)
  - `skills` (JSON string)
  - `location` (string)
  - `address` (string)
  - `pincode` (string)
  - `district` (string)
  - `state` (string)
  - `country` (string)
  - `latitude` (string)
  - `longitude` (string)
  - `areaName` (string) - Area name for city column
  - `profilePhoto` (file)
  - `personalDocuments` (files, multiple)
  - `professionalDocuments` (files, multiple)

### Get All Workers
- **GET** `/api/workers`
- Returns list of all registered workers

### Get Worker by ID
- **GET** `/api/workers/:id`
- Returns specific worker details

## File Upload

Files are stored in:
- Profile photos: `uploads/profiles/`
- Documents: `uploads/documents/`

Maximum file size: 10MB
Allowed formats: JPEG, JPG, PNG, GIF, PDF, DOC, DOCX

## Database Mapping

The registration form maps data to database columns as follows:

- **name** → `name` column
- **mobile** → `mobile` column  
- **email** → `email` column
- **password** → `password` column (hashed)
- **skills** → `skill_id` column (comma-separated)
- **areaName** → `city` column (area name like "Banjara Hills", "Gachibowli")
- **district** → `district` column
- **state** → `state` column
- **country** → `country` column
- **pincode** → `pincode` column
- **address** → `address` column
- **latitude/longitude** → `latitude`/`longitude` columns
- **profilePhoto** → `profile_image` column
- **documents** → `document1`/`document2` columns

## Frontend Integration

Update the API endpoint in your React Native app:

### For Development:
- **Android Emulator**: `http://10.0.2.2:3000/api`
- **iOS Simulator**: `http://localhost:3000/api`
- **Physical Device**: `http://YOUR_COMPUTER_IP:3000/api`

### Production:
Update `constants/api.ts` with your production server URL.

## Error Handling

The API returns standardized responses:

### Success Response:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Security Features

- Password hashing using bcryptjs
- File type validation
- File size limits
- SQL injection prevention
- CORS enabled for cross-origin requests

## Troubleshooting

### Database Connection Issues
1. Ensure MySQL server is running
2. Check database credentials in `server.js`
3. Verify database `originx_farm` exists
4. Check firewall settings

### File Upload Issues
1. Ensure `uploads/` directory has write permissions
2. Check file size (max 10MB)
3. Verify file format is supported

### Network Issues
1. For physical device testing, ensure both device and computer are on same network
2. Use computer's IP address instead of localhost
3. Check if port 3000 is accessible

## Development

To add new API endpoints:
1. Add route in `server.js`
2. Add endpoint to `constants/api.ts`
3. Update this README

## License

MIT License