# Subcategory Video Upload Feature Implementation

## Overview
This document describes the implementation of video upload functionality for subcategories in the Field Updated application.

## Features Implemented

### Frontend (React Native)

#### File: `app/admin/subcategories.tsx`

**Changes Made:**

1. **Added Import**
   - Added `expo-document-picker` for video file selection

2. **New State Variable**
   ```typescript
   const [subcategoryVideo, setSubcategoryVideo] = useState<{ uri: string; name: string; size: number } | null>(null);
   ```

3. **Video Upload Handler (`handleVideoUpload`)**
   - Opens document picker filtered for video files only
   - Validates file size (max 10 MB)
   - Validates file type (mp4, mov, avi, mkv, webm, flv, wmv, 3gp)
   - Shows success toast with file name and size
   - Stores video metadata in state

4. **Updated Functions**
   - `handleEdit`: Now loads existing video from subcategory data
   - `handleAddSubcategory`: Resets video state
   - `handleCloseModal`: Clears video state
   - `handleSubmitSubcategory`: Includes video in FormData submission

5. **UI Components Added**
   - Video upload button with videocam icon
   - Video preview showing filename and size
   - Remove video button
   - Responsive styling for all screen sizes

6. **Styling Added**
   - `videoUploadInput`: Styled upload button
   - `videoUploadInputText`: Text styling
   - `videoPreviewContainer`: Container for video preview
   - `videoInfoContainer`: Icon and text layout
   - `videoTextContainer`: Text content wrapper
   - `videoFileName`: File name display
   - `videoFileSize`: File size display
   - `removeVideoButton`: Remove button styling

### Backend (Node.js/Express)

#### File: `backend/server.js`

**Changes Made:**

1. **Directory Creation**
   - Added `uploads/subcategory_videos/` directory in `createUploadsDir()` function

2. **Multer Configuration Update**
   - Added video field handling in storage destination:
     ```javascript
     else if (file.fieldname === 'video') {
       cb(null, 'uploads/subcategory_videos/');
     }
     ```
   - Added video to filename generation logic

3. **Create Subcategory Endpoint** (`POST /api/admin/subcategories`)
   - Changed from `upload.single('image')` to `upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }])`
   - Added video file size validation (max 10MB)
   - Stores video filename in `video_title` column
   - Returns video_title in response

4. **Update Subcategory Endpoint** (`PUT /api/admin/subcategories/:id`)
   - Changed from `upload.single('image')` to `upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }])`
   - Added video file size validation (max 10MB)
   - Preserves existing video if not updated
   - Updates video_title column when new video is uploaded

### Database

#### File: `backend/database.sql`

**Changes Made:**

Updated `tbl_subcategory` table:
```sql
video_title VARCHAR(255) DEFAULT NULL
```
Changed from `NOT NULL` to `DEFAULT NULL` to make video uploads optional.

## File Structure

```
backend/
├── uploads/
│   └── subcategory_videos/     # New directory for video files
│       └── [uploaded videos]
└── server.js                    # Updated API endpoints

app/
└── admin/
    └── subcategories.tsx       # Updated with video upload UI

backend/
└── database.sql                # Updated schema
```

## API Endpoints

### Create Subcategory
**POST** `/api/admin/subcategories`

**Request (multipart/form-data):**
- `name`: string (required)
- `category_id`: number (required)
- `status`: 0 or 1 (optional, default: 1)
- `visibility`: 0 or 1 (optional, default: 1)
- `image`: file (required)
- `video`: file (optional, max 10MB)

**Response:**
```json
{
  "success": true,
  "message": "Subcategory created successfully",
  "subcategory": {
    "id": 1,
    "name": "Sample Subcategory",
    "category_id": "1",
    "image": "1234567890-123456789.jpg",
    "video_title": "1234567890-123456789.mp4",
    "status": 1,
    "visibility": 1
  }
}
```

### Update Subcategory
**PUT** `/api/admin/subcategories/:id`

**Request (multipart/form-data):**
- `name`: string (required)
- `category_id`: number (required)
- `status`: 0 or 1 (optional)
- `visibility`: 0 or 1 (optional)
- `image`: file (optional)
- `video`: file (optional, max 10MB)

**Response:**
```json
{
  "success": true,
  "message": "Subcategory updated successfully",
  "subcategory": {
    "id": 1,
    "name": "Updated Subcategory",
    "category_id": "1",
    "image": "1234567890-123456789.jpg",
    "video_title": "1234567890-123456789.mp4",
    "status": 1,
    "visibility": 1
  }
}
```

## Validation Rules

### Frontend
- Video file type: Only video formats (mp4, mov, avi, mkv, webm, flv, wmv, 3gp)
- File size: Maximum 10 MB
- User-friendly error messages for invalid files

### Backend
- Video file size: Maximum 10 MB (enforced server-side)
- Returns 400 error if video exceeds size limit
- Validates file type through multer fileFilter

## Installation & Setup

### Prerequisites
```bash
npm install expo-document-picker
```

### Database Migration
If your database already exists, run this SQL to update the schema:
```sql
ALTER TABLE tbl_subcategory 
MODIFY COLUMN video_title VARCHAR(255) DEFAULT NULL;
```

### Create Upload Directory
The directory is automatically created when the server starts, but you can manually create it:
```bash
mkdir -p backend/uploads/subcategory_videos
```

## Testing

### Test Video Upload
1. Open the Subcategories admin screen
2. Click "Add Subcategory"
3. Fill in required fields (name, category, image)
4. Click the video upload button
5. Select a video file (< 10MB)
6. Verify the video preview appears with filename and size
7. Submit the form
8. Check that the video is saved in `backend/uploads/subcategory_videos/`
9. Verify the filename is stored in the database `video_title` column

### Test Video Update
1. Edit an existing subcategory
2. Upload a new video
3. Verify the old video remains if not updated
4. Verify the new video replaces the old one when uploaded

## Error Handling

### Frontend
- Permission denied for media library
- File too large (> 10MB)
- Invalid file type (not a video)
- Network errors during upload

### Backend
- Missing required fields
- File size validation
- Database errors
- File system errors

## Security Considerations

1. **File Size Limit**: 10MB maximum to prevent server overload
2. **File Type Validation**: Only video files allowed
3. **Path Sanitization**: Multer handles secure file naming
4. **SQL Injection Protection**: Using parameterized queries

## Performance Considerations

1. Video files are stored on disk (not in database)
2. Only filename stored in database for efficiency
3. Static file serving via Express
4. Responsive UI with loading states

## Future Enhancements

- [ ] Video thumbnail generation
- [ ] Video preview/playback in admin panel
- [ ] Multiple video support
- [ ] Video compression before upload
- [ ] CDN integration for video delivery
- [ ] Video format conversion

## Support

For issues or questions, please refer to the main project documentation or contact the development team.

---

**Last Updated:** January 7, 2026
**Version:** 1.0.0

