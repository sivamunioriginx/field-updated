require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const axios = require('axios');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images and documents)
app.use('/uploads', express.static('uploads'));

// Add logging for uploads requests
app.use('/uploads', (req, res, next) => {
  next();
});

// Initialize Firebase Admin SDK
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // You can add database URL if you're using Firestore
    // databaseURL: "https://your-project-id.firebaseio.com"
  });
  console.log('🔥 Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
}

// Test route to check if profile image exists
app.get('/api/test-profile-image/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', 'profiles', filename);
    
    try {
      await fs.access(filePath);
      res.json({
        success: true,
        message: 'File exists',
        filePath,
        filename
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'File not found',
        filePath,
        filename,
        error: error.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking file',
      error: error.message
    });
  }
});

// Create uploads directory if it doesn't exist
const createUploadsDir = async () => {
  try {
    await fs.mkdir('uploads/profiles', { recursive: true });
    await fs.mkdir('uploads/documents', { recursive: true });
    await fs.mkdir('uploads/subcategorys', { recursive: true });
    await fs.mkdir('uploads/subcategory_videos', { recursive: true }); // Add subcategory_videos directory
    await fs.mkdir('uploads/workdocuments', { recursive: true }); // Add workdocuments directory
    await fs.mkdir('uploads/quotedocs', { recursive: true }); // Add quotedocs directory
    await fs.mkdir('uploads/services', { recursive: true }); // Add services directory
    await fs.mkdir('uploads/deals', { recursive: true }); // Add deals directory
    await fs.mkdir('uploads/animations', { recursive: true }); // Add animations directory
    // List existing profile images
    try {
      const profileFiles = await fs.readdir('uploads/profiles');
    } catch (error) {
    }
  } catch (error) {
  }
};

// MySQL Database Configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'originx_farm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
  } catch (error) {
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'profilePhoto') {
      cb(null, 'uploads/profiles/');
    } else if (file.fieldname === 'personalDocuments' || file.fieldname === 'professionalDocuments') {
      cb(null, 'uploads/documents/');
    } else if (file.fieldname === 'workDocuments') {
      cb(null, 'uploads/workdocuments/'); // Add workdocuments destination
    } else if (file.fieldname === 'quoteDocuments') {
      cb(null, 'uploads/quotedocs/'); // Add quotedocs destination
    } else if (file.fieldname === 'categoryImage') {
      cb(null, 'uploads/categorys/');
    } else if (file.fieldname === 'animationVideo') {
      cb(null, 'uploads/animations/');
    } else if (file.fieldname === 'video') {
      cb(null, 'uploads/subcategory_videos/'); // Subcategory videos destination
    } else if (file.fieldname === 'image') {
      // Check if request is for services
      if (req.path && req.path.includes('/services')) {
        cb(null, 'uploads/services/');
      } else {
        cb(null, 'uploads/subcategorys/');
      }
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    if (file.fieldname === 'categoryImage' || file.fieldname === 'image' || file.fieldname === 'animationVideo' || file.fieldname === 'video') {
      cb(null, uniqueSuffix + path.extname(file.originalname));
    } else {
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and documents
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|mp4|mov|avi|mkv|m4v|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname || '').toLowerCase());
    // Protect against missing mimetype and accept image/video by prefix as well
    const fileMimetype = file.mimetype || '';
    const mimetype = allowedTypes.test(fileMimetype) || fileMimetype.startsWith('video/') || fileMimetype.startsWith('image/');

    // Accept if either the filename extension or mimetype indicates an allowed type
    if (extname || mimetype) {
      return cb(null, true);
    } else {
      // Log rejected files to help debugging
      console.log('[Upload Rejected] originalname:', file.originalname, 'mimetype:', file.mimetype);
      cb(new Error('Only images, videos, and documents are allowed'));
    }
  }
});

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'OriginX Backend Server is running' });
});

// Upload work documents endpoint
app.post('/api/upload-work-documents', upload.array('workDocuments', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Process uploaded files
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `/uploads/workdocuments/${file.filename}`
    }));

    res.status(200).json({
      success: true,
      message: 'Work documents uploaded successfully',
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading work documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading work documents',
      error: error.message
    });
  }
});

// Upload quote documents endpoint
app.post('/api/upload-quote-documents', upload.array('quoteDocuments', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `/uploads/quotedocs/${file.filename}`
    }));

    res.status(200).json({
      success: true,
      message: 'Quote documents uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading quote documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading quote documents',
      error: error.message
    });
  }
});

// Request Quote endpoint
app.post('/api/request-quote', async (req, res) => {
  const {
    customer_id,
    work_description,
    location,
    documents,
  } = req.body || {};

  if (!customer_id || !work_description || !location) {
    return res.status(400).json({
      success: false,
      message: 'customer_id, work_description, and location are required',
    });
  }

  let connection;
  try {
    connection = await pool.getConnection();

      const [customers] = await connection.execute(
        'SELECT mobile, email FROM tbl_serviceseeker WHERE id = ? LIMIT 1',
        [parseInt(customer_id, 10)]
      );

      if (!customers || customers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
        });
      }

      const { mobile, email } = customers[0];

    const [result] = await connection.execute(
      `INSERT INTO tbl_requestquote 
        (customer_id, mobile, email, work_description, location, documents)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        parseInt(customer_id, 10),
        mobile,
        email || null,
        work_description,
        location,
        documents || null,
      ],
    );

    res.status(201).json({
      success: true,
      message: 'Quote request saved successfully',
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error('Error saving quote request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save quote request',
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Register Professional endpoint
app.post('/api/register-professional', upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'document1', maxCount: 10 }, // Allow up to 10 personal documents
  { name: 'document2', maxCount: 10 }  // Allow up to 10 professional documents
]), async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      price,
      skills,
      location,
      address,
      pincode,
      district,
      state,
      country,
      latitude,
      longitude,
      areaName
    } = req.body;

    // Validation
    if (!name || !mobile || !email || !price) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing: name, mobile, email, price'
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM tbl_workers WHERE email = ? OR mobile = ?',
      [email, mobile]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or mobile number already exists'
      });
    }

    // Process uploaded files
    let profileImagePath = null;
    let personalDocumentsString = '';
    let professionalDocumentsString = '';

    if (req.files) {
      // Profile photo
      if (req.files.profilePhoto && req.files.profilePhoto[0]) {
        profileImagePath = req.files.profilePhoto[0].filename;
      }

      // Personal documents (document1 column)
      if (req.files.document1 && req.files.document1.length > 0) {
        const personalDocNames = req.files.document1.map(doc => doc.filename);
        personalDocumentsString = personalDocNames.join(',');
      }

      // Professional documents (document2 column)
      if (req.files.document2 && req.files.document2.length > 0) {
        const professionalDocNames = req.files.document2.map(doc => doc.filename);
        professionalDocumentsString = professionalDocNames.join(',');
      }
    }

    // Convert skills array to comma-separated string
    let skillsString = '';
    if (skills) {
      try {
        const skillsArray = typeof skills === 'string' ? JSON.parse(skills) : skills;
        skillsString = Array.isArray(skillsArray) ? skillsArray.join(', ') : skills;
      } catch (error) {
        skillsString = skills;
      }
    }

    // Insert into database
    const insertQuery = `
      INSERT INTO tbl_workers (
        name, mobile, email, price, skill_id, pincode, mandal, city,
        district, state, country, latitude, longitude, address, type,
        profile_image, document1, document2
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `;

    // Extract area name from location for city column
    let cityName = null;
    if (areaName) {
      // Use the provided area name
      cityName = areaName.trim();
    } else if (location) {
      // Fallback: Try to extract area name from location string
      const locationParts = location.split(', ');
      if (locationParts.length > 0) {
        // Use the first part as city/area name
        cityName = locationParts[0].trim();
      }
    }

    const values = [
      name,
      mobile,
      email,
      price,
      skillsString,
      pincode || null,
      district || null, // Using district as mandal
      cityName || district || null, // Store area name in city column
      district || null,
      state || null,
      country || null,
      latitude || null,
      longitude || null,
      address || null,
      profileImagePath,
      personalDocumentsString,    // Store in document1 column
      professionalDocumentsString // Store in document2 column
    ];

    const [result] = await pool.execute(insertQuery, values);

    res.status(201).json({
      success: true,
      message: 'Professional registration completed successfully',
      data: {
        id: result.insertId,
        name,
        email,
        mobile,
        price,
        skills: skillsString,
        location,
        profileImage: profileImagePath ? `/uploads/profiles/${profileImagePath}` : null,
        personalDocuments: personalDocumentsString ? personalDocumentsString.split(',') : [],
        professionalDocuments: professionalDocumentsString ? professionalDocumentsString.split(',') : []
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: error.message
    });
  }
});

// Get all workers endpoint
app.get('/api/workers', async (req, res) => {
  try {
    const [workers] = await pool.execute(
      'SELECT id, name, mobile, email, price, skill_id, pincode, district, state, country, profile_image, status, created_at FROM tbl_workers ORDER BY created_at DESC'
    );

    // Add full image URLs
    const workersWithImages = workers.map(worker => ({
      ...worker,
      profile_image: worker.profile_image ? `/uploads/profiles/${worker.profile_image}` : null
    }));

    res.json({
      success: true,
      data: workersWithImages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching workers',
      error: error.message
    });
  }
});

// Get worker by ID endpoint
app.get('/api/workers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [workers] = await pool.execute(
      'SELECT * FROM tbl_workers WHERE id = ?',
      [id]
    );

    if (workers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    const worker = workers[0];
    // Add full image URLs
    const originalProfileImage = worker.profile_image;
    worker.profile_image = worker.profile_image ? `/uploads/profiles/${worker.profile_image}` : null;
    worker.document1 = worker.document1 ? `/uploads/documents/${worker.document1}` : null;
    worker.document2 = worker.document2 ? `/uploads/documents/${worker.document2}` : null;

    const responseData = {
      success: true,
      data: worker
    };
    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching worker',
      error: error.message
    });
  }
});

// Update worker endpoint
app.put('/api/workers/:id', upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'document1', maxCount: 10 }, // Allow up to 10 personal documents
  { name: 'document2', maxCount: 10 }  // Allow up to 10 professional documents
]), async (req, res) => {
  try {
    const { id } = req.params;
    // Check if worker exists
    const [existingWorkers] = await pool.execute(
      'SELECT * FROM tbl_workers WHERE id = ?',
      [id]
    );

    if (existingWorkers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    const existingWorker = existingWorkers[0];
    const {
      name,
      mobile,
      email,
      price,
      skills,
      location,
      address,
      pincode,
      mandal,
      district,
      state,
      country,
      latitude,
      longitude,
      areaName,
      status,
      existingPersonalDocuments,
      existingProfessionalDocuments
    } = req.body;

    // Validation
    if (!name || !mobile || !email || !price) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing: name, mobile, email, price'
      });
    }

    // Check if email/mobile conflicts with other workers (excluding current worker)
    const [conflictingUsers] = await pool.execute(
      'SELECT id FROM tbl_workers WHERE (email = ? OR mobile = ?) AND id != ?',
      [email, mobile, id]
    );

    if (conflictingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email or mobile number already exists with another worker'
      });
    }

    // Process uploaded files
    let profileImagePath = existingWorker.profile_image;
    let personalDocumentsString = '';
    let professionalDocumentsString = '';

    if (req.files) {
      // Profile photo - FIXED: Properly handle existing profile image
      if (req.files.profilePhoto && req.files.profilePhoto[0]) {
        profileImagePath = req.files.profilePhoto[0].filename;
      } else {
        // Keep existing profile image if no new one uploaded
        profileImagePath = existingWorker.profile_image;
      }

      // Personal documents (document1 column)
      if (req.files.document1 && req.files.document1.length > 0) {
        const newDocuments = req.files.document1.map(file => file.filename);
        const existingDocs = existingPersonalDocuments ? JSON.parse(existingPersonalDocuments) : [];
        const allDocs = [...existingDocs, ...newDocuments];
        personalDocumentsString = allDocs.join(',');
      } else if (existingPersonalDocuments) {
        // Check if existingPersonalDocuments is an empty array or contains documents
        const existingDocs = JSON.parse(existingPersonalDocuments);
        if (Array.isArray(existingDocs) && existingDocs.length > 0) {
          personalDocumentsString = existingDocs.join(',');
        } else {
          // No existing documents to keep
          personalDocumentsString = '';
        }
      } else {
        // No existingPersonalDocuments parameter provided, clear the documents
        personalDocumentsString = '';
      }

      // Professional documents (document2 column)
      if (req.files.document2 && req.files.document2.length > 0) {
        const newDocuments = req.files.document2.map(file => file.filename);
        const existingDocs = existingProfessionalDocuments ? JSON.parse(existingProfessionalDocuments) : [];
        const allDocs = [...existingDocs, ...newDocuments];
        professionalDocumentsString = allDocs.join(',');
      } else if (existingProfessionalDocuments) {
        // Check if existingProfessionalDocuments is an empty array or contains documents
        const existingDocs = JSON.parse(existingProfessionalDocuments);
        if (Array.isArray(existingDocs) && existingDocs.length > 0) {
          professionalDocumentsString = existingDocs.join(',');
        } else {
          // No existing documents to keep
          professionalDocumentsString = '';
        }
      } else {
        // No existingProfessionalDocuments parameter provided, clear the documents
        professionalDocumentsString = '';
      }
    } else {
      // No files uploaded, keep existing profile image and documents
      profileImagePath = existingWorker.profile_image;
      
      if (existingPersonalDocuments) {
        const existingDocs = JSON.parse(existingPersonalDocuments);
        if (Array.isArray(existingDocs) && existingDocs.length > 0) {
          personalDocumentsString = existingDocs.join(',');
        } else {
          personalDocumentsString = '';
        }
      } else {
        personalDocumentsString = '';
      }

      if (existingProfessionalDocuments) {
        const existingDocs = JSON.parse(existingProfessionalDocuments);
        if (Array.isArray(existingDocs) && existingDocs.length > 0) {
          professionalDocumentsString = existingDocs.join(',');
        } else {
          professionalDocumentsString = '';
        }
      } else {
        professionalDocumentsString = '';
      }
    }

    // Convert skills array to comma-separated string
    let skillsString = '';
    if (skills) {
      try {
        const skillsArray = typeof skills === 'string' ? JSON.parse(skills) : skills;
        skillsString = Array.isArray(skillsArray) ? skillsArray.join(', ') : skills;
      } catch (error) {
        skillsString = skills;
      }
    }

    // Extract area name from location for city column
    let cityName = null;
    if (areaName) {
      cityName = areaName.trim();
    } else if (location) {
      const locationParts = location.split(',');
      cityName = locationParts[0]?.trim() || null;
    }

    // Update database
    const updateQuery = `
      UPDATE tbl_workers SET
        name = ?, mobile = ?, email = ?, price = ?, skill_id = ?, pincode = ?, mandal = ?, city = ?,
        district = ?, state = ?, country = ?, latitude = ?, longitude = ?, address = ?,
        profile_image = ?, document1 = ?, document2 = ?, status = ?
      WHERE id = ?
    `;

    const updateValues = [
      name,
      mobile,
      email,
      price,
      skillsString,
      pincode || null,
      mandal || null,
      cityName,
      district || null,
      state || null,
      country || null,
      latitude || null,
      longitude || null,
      address || null,
      profileImagePath, // This should now properly contain the existing image if no new one uploaded
      personalDocumentsString,
      professionalDocumentsString,
      status !== undefined ? status : existingWorker.status,
      id
    ];

    await pool.execute(updateQuery, updateValues);

    res.json({
      success: true,
      message: 'Worker updated successfully',
      data: {
        id,
        name,
        mobile,
        email,
        price,
        skill_id: skillsString,
        pincode,
        city: cityName,
        district,
        state,
        country,
        latitude,
        longitude,
        address,
        profile_image: profileImagePath,
        document1: personalDocumentsString,
        document2: professionalDocumentsString
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during update',
      error: error.message
    });
  }
});

// Admin: Update worker endpoint (force type=1 and status=1)
app.put('/api/admin/workers/:id', upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'document1', maxCount: 10 }, // Allow up to 10 personal documents
  { name: 'document2', maxCount: 10 }  // Allow up to 10 professional documents
]), async (req, res) => {
  try {
    const { id } = req.params;
    // Check if worker exists
    const [existingWorkers] = await pool.execute(
      'SELECT * FROM tbl_workers WHERE id = ?',
      [id]
    );

    if (existingWorkers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    const existingWorker = existingWorkers[0];
    const {
      name,
      mobile,
      email,
      price,
      skills,
      location,
      address,
      pincode,
      mandal,
      district,
      state,
      country,
      latitude,
      longitude,
      areaName,
      // ignore status from client - we will force it to 1
      existingPersonalDocuments,
      existingProfessionalDocuments
    } = req.body;

    // Validation
    if (!name || !mobile || !email || !price) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing: name, mobile, email, price'
      });
    }

    // Check if email/mobile conflicts with other workers (excluding current worker)
    const [conflictingUsers] = await pool.execute(
      'SELECT id FROM tbl_workers WHERE (email = ? OR mobile = ?) AND id != ?',
      [email, mobile, id]
    );

    if (conflictingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email or mobile number already exists with another worker'
      });
    }

    // Process uploaded files
    let profileImagePath = existingWorker.profile_image;
    let personalDocumentsString = '';
    let professionalDocumentsString = '';

    if (req.files) {
      // Profile photo - accept multiple possible field names for robustness
      if (req.files.profilePhoto && req.files.profilePhoto[0]) {
        profileImagePath = req.files.profilePhoto[0].filename;
      } else if (req.files.profile_image && req.files.profile_image[0]) {
        profileImagePath = req.files.profile_image[0].filename;
      } else if (req.body && req.body.profilePhoto) {
        // Client may send an existing filename as part of the body
        profileImagePath = req.body.profilePhoto;
      } else {
        profileImagePath = existingWorker.profile_image;
      }

      // Personal documents
      if (req.files.document1 && req.files.document1.length > 0) {
        const newDocuments = req.files.document1.map(file => file.filename);
        const existingDocs = existingPersonalDocuments ? JSON.parse(existingPersonalDocuments) : [];
        const allDocs = [...existingDocs, ...newDocuments];
        personalDocumentsString = allDocs.join(',');
      } else if (existingPersonalDocuments) {
        const existingDocs = JSON.parse(existingPersonalDocuments);
        if (Array.isArray(existingDocs) && existingDocs.length > 0) {
          personalDocumentsString = existingDocs.join(',');
        } else {
          personalDocumentsString = '';
        }
      } else {
        personalDocumentsString = '';
      }

      // Professional documents
      if (req.files.document2 && req.files.document2.length > 0) {
        const newDocuments = req.files.document2.map(file => file.filename);
        const existingDocs = existingProfessionalDocuments ? JSON.parse(existingProfessionalDocuments) : [];
        const allDocs = [...existingDocs, ...newDocuments];
        professionalDocumentsString = allDocs.join(',');
      } else if (existingProfessionalDocuments) {
        const existingDocs = JSON.parse(existingProfessionalDocuments);
        if (Array.isArray(existingDocs) && existingDocs.length > 0) {
          professionalDocumentsString = existingDocs.join(',');
        } else {
          professionalDocumentsString = '';
        }
      } else {
        professionalDocumentsString = '';
      }
    } else {
      // No files uploaded, keep existing values
      profileImagePath = existingWorker.profile_image;

      if (existingPersonalDocuments) {
        const existingDocs = JSON.parse(existingPersonalDocuments);
        if (Array.isArray(existingDocs) && existingDocs.length > 0) {
          personalDocumentsString = existingDocs.join(',');
        } else {
          personalDocumentsString = '';
        }
      } else {
        personalDocumentsString = '';
      }

      if (existingProfessionalDocuments) {
        const existingDocs = JSON.parse(existingProfessionalDocuments);
        if (Array.isArray(existingDocs) && existingDocs.length > 0) {
          professionalDocumentsString = existingDocs.join(',');
        } else {
          professionalDocumentsString = '';
        }
      } else {
        professionalDocumentsString = '';
      }
    }

    // Convert skills array to comma-separated string
    let skillsString = '';
    if (skills) {
      try {
        const skillsArray = typeof skills === 'string' ? JSON.parse(skills) : skills;
        skillsString = Array.isArray(skillsArray) ? skillsArray.join(', ') : skills;
      } catch (error) {
        skillsString = skills;
      }
    }

    // Extract area name from location for city column
    let cityName = null;
    if (areaName) {
      cityName = areaName.trim();
    } else if (location) {
      const locationParts = location.split(',');
      cityName = locationParts[0]?.trim() || null;
    }

    // Update database - force type = 1 and status = 1
    const updateQuery = `
      UPDATE tbl_workers SET
        name = ?, mobile = ?, email = ?, price = ?, skill_id = ?, pincode = ?, mandal = ?, city = ?,
        district = ?, state = ?, country = ?, latitude = ?, longitude = ?, address = ?,
        type = ?, profile_image = ?, document1 = ?, document2 = ?, status = ?
      WHERE id = ?
    `;

    const updateValues = [
      name,
      mobile,
      email,
      price,
      skillsString,
      pincode || null,
      mandal || null,
      cityName,
      district || null,
      state || null,
      country || null,
      latitude || null,
      longitude || null,
      address || null,
      1, // force type = 1
      profileImagePath,
      personalDocumentsString,
      professionalDocumentsString,
      1, // force status = 1
      id
    ];

    await pool.execute(updateQuery, updateValues);

    res.json({
      success: true,
      message: 'Worker updated successfully (type=1 & status=1)',
      data: {
        id,
        name,
        mobile,
        email,
        price,
        skill_id: skillsString,
        pincode,
        city: cityName,
        district,
        state,
        country,
        latitude,
        longitude,
        address,
        type: 1,
        status: 1,
        profile_image: profileImagePath,
        document1: personalDocumentsString,
        document2: professionalDocumentsString
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during fixed update',
      error: error.message
    });
  }
});

// Get worker by mobile number endpoint
app.get('/api/workers/mobile/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;
    
    const [workers] = await pool.execute(
      'SELECT * FROM tbl_workers WHERE mobile = ?',
      [mobile]
    );

    if (workers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    const worker = workers[0];
    // Add full image URLs
    worker.profile_image = worker.profile_image ? `/uploads/profiles/${worker.profile_image}` : null;
    worker.document1 = worker.document1 ? `/uploads/documents/${worker.document1}` : null;
    worker.document2 = worker.document2 ? `/uploads/documents/${worker.document2}` : null;

    const responseData = {
      success: true,
      data: worker
    };
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching worker',
      error: error.message
    });
  }
});

// Get service seeker by mobile number endpoint (MUST come before /:id route)
app.get('/api/serviceseeker/mobile/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;
    const [seekers] = await pool.execute(
      'SELECT * FROM tbl_serviceseeker WHERE mobile = ?',
      [mobile]
    );

    if (seekers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service seeker not found'
      });
    }

    const seeker = seekers[0];
    // Add full image URLs
    seeker.profile_image = seeker.profile_image ? `/uploads/profiles/${seeker.profile_image}` : null;
    
    const responseData = {
      success: true,
      data: seeker
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error fetching service seeker by mobile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service seeker',
      error: error.message
    });
  }
});

// Create booking endpoint
app.post('/api/bookings', async (req, res) => {
  try {
    const { 
      booking_id, 
      worker_id, 
      user_id, 
      contact_number,
      contact_name,
      work_location,
      work_location_lat,
      work_location_lng,
      booking_time, 
      status, 
      description, 
      work_documents 
    } = req.body;
    
    // Basic validation - only check required fields
    if (!booking_id || !worker_id || !user_id || !booking_time) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing: booking_id, worker_id, user_id, booking_time'
      });
    }
    
    const normalizedContactName =
      typeof contact_name === 'string' && contact_name.trim()
        ? contact_name.trim()
        : 'Customer';

    // No checking - directly insert the booking with input data
    const insertQuery = `
      INSERT INTO tbl_bookings (
        booking_id, worker_id, user_id, contact_number, contact_name, work_location, work_location_lat, work_location_lng, booking_time, status, description, work_documents, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const [result] = await pool.execute(insertQuery, [
      booking_id, 
      worker_id, 
      user_id, 
      contact_number || null, // Use input contact number directly
      normalizedContactName,
      work_location || null,
      work_location_lat || null,
      work_location_lng || null,
      booking_time, 
      status || 0,
      description || null,
      work_documents || null
    ]);
    
    // Fetch stored location coordinates to ensure we always have the latest values
    const [storedBookingRows] = await pool.execute(
      'SELECT work_location_lat, work_location_lng FROM tbl_bookings WHERE id = ? LIMIT 1',
      [result.insertId]
    );
    const storedBooking = storedBookingRows.length > 0 ? storedBookingRows[0] : {};
    const normalizedWorkLat = storedBooking.work_location_lat ?? work_location_lat ?? null;
    const normalizedWorkLng = storedBooking.work_location_lng ?? work_location_lng ?? null;
        
    // If booking status is 0 (pending), automatically send notification to worker
    if ((status || 0) === 0) {
      try {
        console.log(`🚨 New pending booking created (ID: ${booking_id}) - sending notification to worker ${worker_id}`);
        
        // Get worker details from tbl_workers
        const [workers] = await pool.execute(
          'SELECT mobile, name FROM tbl_workers WHERE id = ? LIMIT 1',
          [worker_id]
        );
        
        if (workers.length > 0) {
          const worker = workers[0];
          console.log(`👤 Found worker: ${worker.name} (Mobile: ${worker.mobile})`);
          
          // Get customer name from tbl_serviceseeker table
          const [customers] = await pool.execute(
            'SELECT name, mobile FROM tbl_serviceseeker WHERE id = ?',
            [user_id]
          );
          
          const customer = customers.length > 0 ? customers[0] : { name: 'Customer', mobile: contact_number || 'N/A' };
          
          // Prepare booking data for notification
          const bookingData = {
            booking_id: booking_id,
            customer_name: normalizedContactName || customer.name || 'Customer',
            customer_mobile: contact_number || 'N/A',  // Always use contact_number from booking
            work_location: work_location || 'Location not specified',
            work_location_lat: normalizedWorkLat,
            work_location_lng: normalizedWorkLng,
            description: description || 'Service request',
            booking_time: booking_time ? new Date(booking_time).toISOString() : new Date().toISOString(),
            work_type: 'Service Request'
          };
          
          // Send notification to worker
          const notificationResult = await sendBookingAlertNotification(worker_id, bookingData);
          
          if (notificationResult.success) {
            console.log(`✅ Notification sent successfully to worker ${worker_id} (${worker.mobile})`);
          } else {
            console.log(`❌ Failed to send notification to worker ${worker_id}: ${notificationResult.error}`);
          }
        } else {
          console.log(`❌ Worker not found for ID: ${worker_id}`);
        }
      } catch (notificationError) {
        console.error('❌ Error sending automatic notification:', notificationError);
        // Don't fail the booking creation if notification fails
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        id: result.insertId,
        booking_id,
        worker_id,
        user_id,
        contact_number: contact_number || null,
        contact_name: normalizedContactName,
        work_location: work_location || null,
        booking_time,
        status: status || 0,
        description: description || null,
        work_documents: work_documents || null
      }
    });
    
  } catch (error) {
    console.error('Booking creation error:', error);
    
    // Check if it's a foreign key constraint error
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      res.status(400).json({
        success: false,
        message: 'Worker ID does not exist in the workers table',
        error: 'Foreign key constraint failed'
      });
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      res.status(500).json({
        success: false,
        message: 'Bookings table does not exist. Please run the database setup script.',
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error during booking creation',
        error: error.message
      });
    }
  }
});

// Get bookings by worker ID endpoint
app.get('/api/bookings/worker/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    const { status } = req.query;
    
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }

    console.log(`🔍 Fetching bookings for worker ID: ${workerId}, status filter: ${status}`);

    // Build query based on status filter
    let query = `
      SELECT 
        b.id,
        b.booking_id,
        b.worker_id,
        b.user_id,
        b.contact_number,
        b.work_location,
        b.booking_time,
        b.status,
        b.payment_status,
        b.created_at,
        b.description,
        b.work_documents,
        s.name as user_name,
        s.mobile as user_mobile,
        r.reschedule_date,
        r.status as rescheduled_status,
        r.type as rescheduled_type,
        c.created_at as canceled_at,
        c.status as canceled_status,
        c.type as canceled_type
      FROM tbl_bookings b
      LEFT JOIN tbl_serviceseeker s ON b.user_id = s.id
      LEFT JOIN tbl_rescheduledbookings r ON b.id = CAST(TRIM(r.bookingid) AS UNSIGNED)
      LEFT JOIN tbl_canceledbookings c ON b.id = CAST(TRIM(c.bookingid) AS UNSIGNED)
      WHERE b.worker_id = ?
    `;
    
    let params = [workerId];
    
    // Handle multiple status values (comma-separated)
    if (status !== undefined && status !== '') {
      if (status.includes(',')) {
        // Multiple statuses (e.g., "1,2,3")
        const statusArray = status.split(',').map(s => parseInt(s.trim()));
        const placeholders = statusArray.map(() => '?').join(',');
        query += ` AND b.status IN (${placeholders})`;
        params.push(...statusArray);
        console.log(`📊 Applied multiple status filter: ${statusArray}`);
      } else {
        // Single status
        query += ' AND b.status = ?';
        params.push(parseInt(status));
        console.log(`📊 Applied single status filter: ${status}`);
      }
    } else {
      console.log(`📊 No status filter applied - fetching all bookings for worker`);
    }
    
    query += ' AND (b.payment_status = 1 OR b.status = 4)';
    
    query += ' ORDER BY b.created_at DESC';

    console.log(`🔍 Executing query: ${query}`);
    console.log(`🔍 With params:`, params);

    const [bookings] = await pool.execute(query, params);

    console.log(`✅ Found ${bookings.length} bookings for worker ${workerId}`);

    res.json({
      success: true,
      data: bookings,
      debug: {
        workerId,
        statusFilter: status,
        totalBookings: bookings.length,
        query: query,
        params: params
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching worker bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching worker bookings',
      error: error.message
    });
  }
});

// Update booking status endpoint
app.put('/api/bookings/:bookingId/status', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    
    console.log(`🔧 Updating booking ${bookingId} status to ${status}`);
    
    if (!bookingId || status === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and status are required'
      });
    }

    // Validate status values
    const validStatuses = [0, 1, 2, 3, 4, 5, 6]; // 0=Pending, 1=Accepted, 2=In Progress, 3=Completed, 4=Rejected, 5=Cancel Request/Canceled, 6=Reschedule Request/Rescheduled
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value. Must be 0, 1, 2, 3, 4, 5, or 6'
      });
    }

    // First, get the current booking to find the booking_id
    const getBookingQuery = 'SELECT booking_id FROM tbl_bookings WHERE id = ?';
    const [bookingResult] = await pool.execute(getBookingQuery, [bookingId]);
    
    if (bookingResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    const currentBooking = bookingResult[0];
    const currentBookingId = currentBooking.booking_id;
    
    // If status is being set to 1 (Accepted), update other workers with same booking_id to status 4 (Missed)
    if (status === 1) {
      // Update the current booking to accepted
      const updateCurrentQuery = 'UPDATE tbl_bookings SET status = ? WHERE id = ?';
      const [updateResult] = await pool.execute(updateCurrentQuery, [status, bookingId]);
      
      if (updateResult.affectedRows > 0) {
        // Update all other workers with the same booking_id to status 4 (Missed)
        const updateOthersQuery = 'UPDATE tbl_bookings SET status = 4 WHERE booking_id = ? AND id != ? AND status = 0';
        const [updateOthersResult] = await pool.execute(updateOthersQuery, [currentBookingId, bookingId]);
        
        console.log(`📝 Updated ${updateOthersResult.affectedRows} other workers to missed status`);
        
        res.json({
          success: true,
          message: 'Booking accepted successfully. Other workers notified as missed.',
          data: { 
            bookingId, 
            status,
            otherWorkersUpdated: updateOthersResult.affectedRows
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Failed to update booking status'
        });
      }
         } else {
       // For other status updates, just update the current booking
       let query = 'UPDATE tbl_bookings SET status = ?';
       let params = [status];
       
      const { reschedule_date, reschedule_reason, cancel_reason, reschedule_type, cancel_type } = req.body;
      
      query += ' WHERE id = ?';
       params.push(bookingId);
       
       const [result] = await pool.execute(query, params);

      if (result.affectedRows > 0) {
        // If status is 5 (cancel request), insert into tbl_canceledbookings with status = 0
        if (status === 5 && cancel_reason) {
          const cancelType = cancel_type !== undefined ? cancel_type : 1;
          const insertCancelQuery = 'INSERT INTO tbl_canceledbookings (bookingid, cancel_reason, type, status) VALUES (?, ?, ?, 0)';
          await pool.execute(insertCancelQuery, [bookingId, cancel_reason, cancelType]);
          console.log(`✅ Inserted cancel request into tbl_canceledbookings with status = 0 for bookingid: ${bookingId}`);
        }
        
        // If status is 6 (reschedule request), insert into tbl_rescheduledbookings with status = 0
        if (status === 6 && reschedule_date && reschedule_reason) {
          const rescheduleType = reschedule_type !== undefined ? reschedule_type : 1;
          const insertRescheduleQuery = 'INSERT INTO tbl_rescheduledbookings (bookingid, reschedule_date, reschedule_reason, type, status) VALUES (?, ?, ?, ?, 0)';
          await pool.execute(insertRescheduleQuery, [bookingId, reschedule_date, reschedule_reason, rescheduleType]);
          console.log(`✅ Inserted reschedule request into tbl_rescheduledbookings with status = 0 for bookingid: ${bookingId}`);
        }
        
        res.json({
          success: true,
          message: 'Booking status updated successfully',
          data: { bookingId, status }
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }
    }
  } catch (error) {
    console.error('❌ Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Submit customer rating endpoint
app.post('/api/customer-ratings', async (req, res) => {
  try {
    const { bookingid, rating, description } = req.body;
    
    // Validation
    if (!bookingid || !rating || !description) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing: bookingid, rating, description'
      });
    }
    
    // Validate rating is between 1 and 5
    const ratingValue = parseInt(rating);
    if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    // Validate description is not empty
    if (!description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Description cannot be empty'
      });
    }
    
    // Check if booking exists
    const checkBookingQuery = 'SELECT id FROM tbl_bookings WHERE id = ?';
    const [bookingResult] = await pool.execute(checkBookingQuery, [bookingid]);
    
    if (bookingResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Insert rating into tbl_customerratings
    const insertQuery = `
      INSERT INTO tbl_customerratings (bookingid, rating, description, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    await pool.execute(insertQuery, [bookingid, ratingValue, description.trim()]);
    
    return res.status(200).json({
      success: true,
      message: 'Rating submitted successfully'
    });
    
  } catch (error) {
    console.error('Error submitting rating:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get ratings for bookings endpoint
app.get('/api/customer-ratings', async (req, res) => {
  try {
    const { bookingids } = req.query;
    
    if (!bookingids) {
      return res.status(400).json({
        success: false,
        message: 'bookingids parameter is required'
      });
    }
    
    // Parse booking IDs (comma-separated)
    const bookingIdArray = bookingids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    if (bookingIdArray.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    
    // Get ratings for the specified booking IDs
    const placeholders = bookingIdArray.map(() => '?').join(',');
    const query = `SELECT bookingid FROM tbl_customerratings WHERE bookingid IN (${placeholders})`;
    
    const [results] = await pool.execute(query, bookingIdArray);
    
    return res.status(200).json({
      success: true,
      data: results.map(row => row.bookingid)
    });
    
  } catch (error) {
    console.error('Error fetching ratings:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Assign to other worker endpoint (for cancel and reschedule requests)
app.put('/api/bookings/:bookingId/assign-other-worker', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { requestType, reschedule_date } = req.body; // requestType: 'cancel' or 'reschedule'
    
    console.log(`🔄 Assigning booking ${bookingId} to other worker (type: ${requestType})`);
    
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // First, get the current booking to find the booking_id
    const getBookingQuery = 'SELECT booking_id FROM tbl_bookings WHERE id = ?';
    const [bookingResult] = await pool.execute(getBookingQuery, [bookingId]);
    
    if (bookingResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    const currentBooking = bookingResult[0];
    const currentBookingId = currentBooking.booking_id;
    
    // Determine status and update query based on request type
    let updateCurrentQuery;
    let statusValue;
    
    let rescheduleType = null;
    let rescheduleDate = null;
    
    if (requestType === 'reschedule') {
      // For reschedule requests: Check if rescheduled by customer (type=2) or worker (type=1)
      // First, get the reschedule type from tbl_rescheduledbookings
      const getRescheduleQuery = 'SELECT type, reschedule_date FROM tbl_rescheduledbookings WHERE bookingid = ?';
      const [rescheduleResult] = await pool.execute(getRescheduleQuery, [bookingId]);
      
      if (rescheduleResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Reschedule request not found'
        });
      }
      
      const rescheduleData = rescheduleResult[0];
      rescheduleType = rescheduleData.type; // 1 = Worker, 2 = Customer
      rescheduleDate = rescheduleData.reschedule_date;
      
      statusValue = 6;
      
      if (rescheduleType === 2) {
        // Rescheduled by Customer: Update booking_time to reschedule_date
        updateCurrentQuery = 'UPDATE tbl_bookings SET status = 6, payment_status = 1, booking_time = ? WHERE id = ?';
        var [updateCurrentResult] = await pool.execute(updateCurrentQuery, [rescheduleDate, bookingId]);
      } else {
        // Rescheduled by Worker: Don't update booking_time
        updateCurrentQuery = 'UPDATE tbl_bookings SET status = 6, payment_status = 1 WHERE id = ?';
        var [updateCurrentResult] = await pool.execute(updateCurrentQuery, [bookingId]);
      }
    } else {
      // For cancel requests: status = 5
      statusValue = 5;
      updateCurrentQuery = 'UPDATE tbl_bookings SET status = 5, payment_status = 0 WHERE id = ?';
      var [updateCurrentResult] = await pool.execute(updateCurrentQuery, [bookingId]);
    }
    
    if (updateCurrentResult.affectedRows > 0) {
      // Update all other workers with the same booking_id to status = 0 and payment_status = 1
      // For reschedule requests by customer (type=2), also update booking_time to reschedule_date
      let updateOthersQuery;
      let updateOthersParams;
      
      if (requestType === 'reschedule' && rescheduleType === 2 && rescheduleDate) {
        // Rescheduled by Customer: Update other workers' booking_time too
        updateOthersQuery = 'UPDATE tbl_bookings SET status = 0, payment_status = 1, booking_time = ? WHERE booking_id = ? AND id != ?';
        updateOthersParams = [rescheduleDate, currentBookingId, bookingId];
      } else {
        // Rescheduled by Worker or Cancel request: Don't update booking_time for other workers
        updateOthersQuery = 'UPDATE tbl_bookings SET status = 0, payment_status = 1 WHERE booking_id = ? AND id != ?';
        updateOthersParams = [currentBookingId, bookingId];
      }
      
      const [updateOthersResult] = await pool.execute(updateOthersQuery, updateOthersParams);
      
      console.log(`📝 Updated ${updateOthersResult.affectedRows} other workers for reassignment`);
      
      // For cancel requests, update status in tbl_canceledbookings to 1
      // Note: tbl_canceledbookings.bookingid refers to tbl_bookings.id (record ID), not booking_id
      if (requestType === 'cancel') {
        const updateCancelStatusQuery = 'UPDATE tbl_canceledbookings SET status = 1 WHERE bookingid = ?';
        const [updateCancelStatusResult] = await pool.execute(updateCancelStatusQuery, [bookingId]);
        console.log(`✅ Updated tbl_canceledbookings status to 1 for bookingid (tbl_bookings.id): ${bookingId}`);
      }
      
      // For reschedule requests, update status in tbl_rescheduledbookings to 1
      // Note: tbl_rescheduledbookings.bookingid refers to tbl_bookings.id (record ID), not booking_id
      if (requestType === 'reschedule') {
        const updateRescheduleStatusQuery = 'UPDATE tbl_rescheduledbookings SET status = 1 WHERE bookingid = ?';
        const [updateRescheduleStatusResult] = await pool.execute(updateRescheduleStatusQuery, [bookingId]);
        console.log(`✅ Updated tbl_rescheduledbookings status to 1 for bookingid (tbl_bookings.id): ${bookingId}`);
      }
      
      const message = requestType === 'reschedule' 
        ? 'Booking reassigned successfully. Worker marked as reschedule request, others reset for reassignment.'
        : 'Booking reassigned successfully. Worker marked as canceled, others reset for reassignment.';
      
      res.json({
        success: true,
        message: message,
        data: { 
          bookingId, 
          otherWorkersUpdated: updateOthersResult.affectedRows
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Failed to update booking'
      });
    }
  } catch (error) {
    console.error('❌ Error assigning to other worker:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Check booking status by booking_id (for polling)
app.get('/api/bookings/check-status/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // Get all bookings with this booking_id
    const query = `
      SELECT 
        b.id,
        b.booking_id,
        b.status,
        b.payment_status,
        w.name as worker_name
      FROM tbl_bookings b
      LEFT JOIN tbl_workers w ON b.worker_id = w.id
      WHERE b.booking_id = ?
    `;
    
    const [bookings] = await pool.execute(query, [bookingId]);
    
    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No bookings found with this booking_id'
      });
    }

    // Check if any booking has status = 0 (still pending)
    const hasPending = bookings.some(b => b.status === 0);
    
    // Check if any booking has status = 1 (accepted)
    const acceptedBooking = bookings.find(b => b.status === 1 && b.payment_status === 1);
    
    // Check if all bookings have status != 0 and status != 1 (all busy/rejected)
    const allBusy = bookings.every(b => b.status !== 0 && b.status !== 1);

    res.json({
      success: true,
      data: {
        bookings,
        hasPending,
        acceptedBooking: acceptedBooking || null,
        allBusy
      }
    });
  } catch (error) {
    console.error('❌ Error checking booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update booking to cancel/reschedule request when all workers are busy
app.put('/api/bookings/:bookingId/revert-to-cancel-request', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { requestType, reschedule_date } = req.body; // requestType: 'cancel' or 'reschedule'
    
    console.log(`🔄 Reverting booking ${bookingId} to ${requestType} request (all workers busy)`);
    
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // Determine status based on request type
    let updateQuery;
    let statusValue;
    
    if (requestType === 'reschedule') {
      // For reschedule requests: status = 6, update booking_time to reschedule_date
      statusValue = 6;
      if (reschedule_date) {
        updateQuery = 'UPDATE tbl_bookings SET status = 6, payment_status = 1, booking_time = ? WHERE id = ?';
        var [result] = await pool.execute(updateQuery, [reschedule_date, bookingId]);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Reschedule date is required for reschedule requests'
        });
      }
    } else {
      // For cancel requests when no workers available: status = 1, payment_status = 1
      // and tbl_canceledbookings.status = 0
      statusValue = 1;
      updateQuery = 'UPDATE tbl_bookings SET status = 1, payment_status = 1 WHERE id = ?';
      var [result] = await pool.execute(updateQuery, [bookingId]);
    }
    
    if (result.affectedRows > 0) {
      // For cancel requests, also update tbl_canceledbookings.status = 0
      // Note: tbl_canceledbookings.bookingid refers to tbl_bookings.id (record ID)
      if (requestType === 'cancel') {
        const updateCancelStatusQuery = 'UPDATE tbl_canceledbookings SET status = 0 WHERE bookingid = ?';
        const [updateCancelStatusResult] = await pool.execute(updateCancelStatusQuery, [bookingId]);
        console.log(`✅ Updated tbl_canceledbookings status to 0 for bookingid (tbl_bookings.id): ${bookingId}`);
      }
      
      const requestTypeLabel = requestType === 'reschedule' ? 'reschedule request' : 'cancel request';
      console.log(`✅ Booking ${bookingId} reverted to ${requestTypeLabel} status`);
      
      res.json({
        success: true,
        message: `Booking reverted to ${requestTypeLabel} status`,
        data: { bookingId }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
  } catch (error) {
    console.error('❌ Error reverting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Accept cancel request (update status to 5 - Canceled)
app.put('/api/bookings/:bookingId/accept-cancel-request', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    console.log(`✅ Accepting cancel request for booking ${bookingId}`);
    
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // Update the booking to canceled (status = 5)
    const updateQuery = 'UPDATE tbl_bookings SET status = 5 WHERE id = ?';
    const [result] = await pool.execute(updateQuery, [bookingId]);
    
    if (result.affectedRows > 0) {
      // Update tbl_canceledbookings.status = 1
      // Note: tbl_canceledbookings.bookingid refers to tbl_bookings.id (record ID)
      const updateCancelStatusQuery = 'UPDATE tbl_canceledbookings SET status = 1 WHERE bookingid = ?';
      await pool.execute(updateCancelStatusQuery, [bookingId]);
      console.log(`✅ Updated tbl_canceledbookings status to 1 for bookingid (tbl_bookings.id): ${bookingId}`);
      
      console.log(`✅ Cancel request accepted for booking ${bookingId}`);
      
      res.json({
        success: true,
        message: 'Cancel request accepted successfully',
        data: { bookingId }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
  } catch (error) {
    console.error('❌ Error accepting cancel request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reject cancel request endpoint
app.put('/api/bookings/:bookingId/reject-cancel-request', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    console.log(`❌ Rejecting cancel request for booking ${bookingId}`);
    
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // Update the booking to accepted (status = 1) and payment_status = 1
    const updateQuery = 'UPDATE tbl_bookings SET status = 1, payment_status = 1 WHERE id = ?';
    const [result] = await pool.execute(updateQuery, [bookingId]);
    
    if (result.affectedRows > 0) {
      // Update tbl_canceledbookings.status = 2
      // Note: tbl_canceledbookings.bookingid refers to tbl_bookings.id (record ID)
      const updateCancelStatusQuery = 'UPDATE tbl_canceledbookings SET status = 2 WHERE bookingid = ?';
      await pool.execute(updateCancelStatusQuery, [bookingId]);
      console.log(`✅ Updated tbl_canceledbookings status to 2 for bookingid (tbl_bookings.id): ${bookingId}`);
      
      console.log(`✅ Cancel request rejected for booking ${bookingId}`);
      
      res.json({
        success: true,
        message: 'Cancel request rejected successfully',
        data: { bookingId }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
  } catch (error) {
    console.error('❌ Error rejecting cancel request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reject reschedule request endpoint
app.put('/api/bookings/:bookingId/reject-reschedule-request', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    console.log(`❌ Rejecting reschedule request for booking ${bookingId}`);
    
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // Update tbl_bookings.status = 1 (Accepted) and payment_status = 1
    const updateBookingQuery = 'UPDATE tbl_bookings SET status = 1, payment_status = 1 WHERE id = ?';
    const [bookingResult] = await pool.execute(updateBookingQuery, [bookingId]);
    
    if (bookingResult.affectedRows > 0) {
      // Update tbl_rescheduledbookings.status = 2
      // Note: tbl_rescheduledbookings.bookingid refers to tbl_bookings.id (record ID)
      const updateRescheduleStatusQuery = 'UPDATE tbl_rescheduledbookings SET status = 2 WHERE bookingid = ?';
      await pool.execute(updateRescheduleStatusQuery, [bookingId]);
      console.log(`✅ Updated tbl_bookings status to 1 and tbl_rescheduledbookings status to 2 for bookingid (tbl_bookings.id): ${bookingId}`);
      
      res.json({
        success: true,
        message: 'Reschedule request rejected successfully',
        data: { bookingId }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
  } catch (error) {
    console.error('❌ Error rejecting reschedule request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update booking payment status and amount endpoint
app.put('/api/bookings/:bookingId/payment', async (req, res) => {
  try {
    const { bookingId } = req.params; // This is the booking_id (not the id)
    const { payment_status, amount, payment_id } = req.body;
    
    
    if (!bookingId || payment_status === undefined || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID, payment_status, and amount are required'
      });
    }

    // Validate payment_status
    if (payment_status !== 0 && payment_status !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment_status value. Must be 0 or 1'
      });
    }

    // Update all bookings with the same booking_id where status = 1
    const updateQuery = 'UPDATE tbl_bookings SET payment_status = ?, amount = ? WHERE booking_id = ? AND status = 1';
    const [result] = await pool.execute(updateQuery, [payment_status, amount, bookingId]);

    if (result.affectedRows > 0) {
      // If payment is successful (payment_status = 1) and payment details are provided, insert into tbl_payments
      if (payment_status === 1 && payment_id) {
        try {
          // Get all booking ids (primary keys) from tbl_bookings using booking_id
          // Since multiple bookings can have the same booking_id (one per worker), we insert payment for each
          const [bookingRows] = await pool.execute(
            'SELECT id FROM tbl_bookings WHERE booking_id = ? AND status = 1',
            [bookingId]
          );

          if (bookingRows.length > 0) {
            // Insert payment record for each booking
            const insertPaymentQuery = `
              INSERT INTO tbl_payments (bookingid, payment_id, amount, created_at)
              VALUES (?, ?, ?, NOW())
            `;
            
            for (const bookingRow of bookingRows) {
              await pool.execute(insertPaymentQuery, [
                bookingRow.id,
                payment_id,
                amount
              ]);
            }
            console.log(`✅ Payment records inserted into tbl_payments for booking_id: ${bookingId} (${bookingRows.length} record(s))`);
          }
        } catch (paymentInsertError) {
          // Log error but don't fail the payment update
          console.error('❌ Error inserting payment record into tbl_payments:', paymentInsertError);
        }
      }
      // Send SMS to worker after successful payment update
      try {
        // Get booking details with worker information
        const [bookings] = await pool.execute(
          `SELECT b.worker_id, b.booking_time, w.name as worker_name, w.mobile as worker_mobile 
           FROM tbl_bookings b 
           JOIN tbl_workers w ON b.worker_id = w.id 
           WHERE b.booking_id = ? AND b.status = 1 
           LIMIT 1`,
          [bookingId]
        );

        if (bookings.length > 0) {
          const booking = bookings[0];
          const workerName = booking.worker_name || 'Worker';
          const workerMobile = booking.worker_mobile;
          const bookingTime = new Date(booking.booking_time);
          
          // Format booking date (e.g., "Jan 15, 2024 at 10:30 AM")
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const day = bookingTime.getDate();
          const month = months[bookingTime.getMonth()];
          const year = bookingTime.getFullYear();
          let hours = bookingTime.getHours();
          const minutes = bookingTime.getMinutes().toString().padStart(2, '0');
          const period = hours >= 12 ? 'PM' : 'AM';
          hours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
          const formattedDate = `${month} ${day}, ${year} at ${hours}:${minutes} ${period}`;

          // Send SMS via MSG91
          if (workerMobile) {
            const msg91Url = 'https://control.msg91.com/api/v5/flow/';
            const requestData = {
              authkey: MSG91_AUTHKEY,
              template_id: '693661ac52bee02e5a2c1965',
              recipients: [
                {
                  mobiles: '91' + workerMobile,
                  workername: workerName,
                  bookingid: bookingId,
                  bookingdate: formattedDate
                }
              ]
            };

            await axios.post(msg91Url, requestData, {
              headers: {
                'Content-Type': 'application/json'
              }
            });
          }
        }
      } catch (smsError) {
        // Log SMS error but don't fail the payment update
        console.error('❌ Error sending SMS to worker:', smsError);
      }

      res.json({
        success: true,
        message: 'Payment status and amount updated successfully',
        data: { 
          bookingId, 
          payment_status, 
          amount,
          updatedCount: result.affectedRows
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No bookings found with the given booking_id and status = 1'
      });
    }
  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get service seeker by ID endpoint
app.get('/api/serviceseeker/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [seekers] = await pool.execute(
      'SELECT * FROM tbl_serviceseeker WHERE id = ?',
      [id]
    );

    if (seekers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service seeker not found'
      });
    }

    const seeker = seekers[0];

    // Add full image URLs
    seeker.profile_image = seeker.profile_image ? `/uploads/profiles/${seeker.profile_image}` : null;
    
    const responseData = {
      success: true,
      data: seeker
    };
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching service seeker',
      error: error.message
    });
  }
});

// Update service seeker endpoint
app.put('/api/serviceseeker/:id', upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'document1', maxCount: 10 } // Allow up to 10 documents
]), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      mobile,
      email,
      pincode,
      district,
      state,
      country,
      latitude,
      longitude,
      address,
      city,
      existingDocuments // Add this to handle existing documents
    } = req.body;

    // Validation
    if (!name || !mobile || !email) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing: name, mobile, email'
      });
    }

    // Check if user exists
    const [existingSeekers] = await pool.execute(
      'SELECT * FROM tbl_serviceseeker WHERE id = ?',
      [id]
    );

    if (existingSeekers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service seeker not found'
      });
    }

    // Check if mobile/email already exists for other users
    const [duplicateUsers] = await pool.execute(
      'SELECT id FROM tbl_serviceseeker WHERE (mobile = ? OR email = ?) AND id != ?',
      [mobile, email, id]
    );

    if (duplicateUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Mobile number or email already registered by another user'
      });
    }

    // Process uploaded files
    let profileImagePath = null;
    let newDocuments = [];
    
    if (req.files) {
      // Profile photo
      if (req.files.profilePhoto && req.files.profilePhoto[0]) {
        profileImagePath = req.files.profilePhoto[0].filename;
      }

      // New documents
      if (req.files.document1 && req.files.document1.length > 0) {
        newDocuments = req.files.document1.map(file => file.filename);
      }
    }

    // Parse existing documents from request body
    let existingDocumentsArray = [];
    if (existingDocuments) {
      try {
        existingDocumentsArray = JSON.parse(existingDocuments);
      } catch (error) {
        existingDocumentsArray = [];
      }
    }

    // Combine existing and new documents
    const allDocuments = [...existingDocumentsArray, ...newDocuments];
    
    // Store all documents as a comma-separated string in document1 column
    const documentsString = allDocuments.join(',');

    // Build update query dynamically
    let updateQuery = `
      UPDATE tbl_serviceseeker SET 
        name = ?, mobile = ?, email = ?, pincode = ?, mandal = ?, city = ?,
        district = ?, state = ?, country = ?, latitude = ?, longitude = ?, address = ?
    `;
    
    let values = [
      name, mobile, email, pincode || null, district || null, city || null,
      district || null, state || null, country || null, latitude || null, longitude || null, address || null
    ];

    // Add profile image to update if new one is uploaded
    if (profileImagePath) {
      updateQuery += ', profile_image = ?';
      values.push(profileImagePath);
    }

    // Always update documents (combining existing + new)
    updateQuery += ', document1 = ?';
    values.push(documentsString);

    updateQuery += ' WHERE id = ?';
    values.push(id);

    const [result] = await pool.execute(updateQuery, values);

    if (result.affectedRows > 0) {
      // Fetch updated user data
      const [updatedSeekers] = await pool.execute(
        'SELECT * FROM tbl_serviceseeker WHERE id = ?',
        [id]
      );

      const updatedSeeker = updatedSeekers[0];
      
      // Add full image URLs
      updatedSeeker.profile_image = updatedSeeker.profile_image ? `/uploads/profiles/${updatedSeeker.profile_image}` : null;
      
      // Parse documents string and create full URLs
      if (updatedSeeker.document1) {
        const documentNames = updatedSeeker.document1.split(',').filter(name => name.trim());
        updatedSeeker.documents = documentNames.map(name => `/uploads/documents/${name.trim()}`);
        updatedSeeker.document1 = updatedSeeker.document1; // Keep original string for reference
      }

      res.json({
        success: true,
        message: 'Service seeker profile updated successfully',
        data: updatedSeeker
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No changes were made to the profile'
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during update',
      error: error.message
    });
  }
});

app.post('/api/register-serviceseeker', upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'personalDocuments', maxCount: 10 } // Allow up to 10 personal documents
]), async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      pincode,
      district,
      state,
      country,
      latitude,
      longitude,
      address,
      city
    } = req.body;

    // Validation
    if (!name || !mobile || !email) {
      return res.status(400).json({
        success: false,
        message: 'Required fields are missing: name, mobile, email'
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM tbl_serviceseeker WHERE email = ? OR mobile = ?',
      [email, mobile]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or mobile number already exists'
      });
    }

    // Process uploaded files
    let profileImagePath = null;
    let documentsString = '';

    if (req.files) {
      // Profile photo
      if (req.files.profilePhoto && req.files.profilePhoto[0]) {
        profileImagePath = req.files.profilePhoto[0].filename;
      }

      // Personal documents - store all documents as comma-separated string
      if (req.files.personalDocuments && req.files.personalDocuments.length > 0) {
        const documentNames = req.files.personalDocuments.map(doc => doc.filename);
        documentsString = documentNames.join(',');
      }
    }

    // Insert into database
    const insertQuery = `
      INSERT INTO tbl_serviceseeker (
        name, mobile, email, pincode, mandal, city,
        district, state, country, latitude, longitude, address, type, profile_image, document1
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?, ?)
    `;

    const values = [
      name,
      mobile,
      email,
      pincode || null,
      district || null,
      city || null,
      district || null,
      state || null,
      country || null,
      latitude || null,
      longitude || null,
      address || null,
      profileImagePath,
      documentsString // Store all documents as comma-separated string
    ];

    const [result] = await pool.execute(insertQuery, values);

    res.status(201).json({
      success: true,
      message: 'Service seeker registration completed successfully',
      data: {
        id: result.insertId,
        name,
        email,
        mobile,
        city,
        profileImage: profileImagePath ? `/uploads/profiles/${profileImagePath}` : null,
        documents: documentsString ? documentsString.split(',').map(doc => `/uploads/documents/${doc}`) : []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: error.message
    });
  }
});

// Check if user exists endpoint
app.get('/api/check-user-exists', async (req, res) => {
  try {
    const { mobile, email, userType } = req.query;
    
    if (!mobile && !email) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number or email is required'
      });
    }

    // Determine which table to check based on userType
    let tableName, query, params;
    
    if (userType === 'professional') {
      tableName = 'tbl_workers';
    } else if (userType === 'seeker') {
      tableName = 'tbl_serviceseeker';
    } else {
      // If no userType specified, check both tables (backward compatibility)
      tableName = 'both';
    }

    if (tableName === 'both') {
      // Check both tbl_workers and tbl_serviceseeker tables (for backward compatibility)
      let workersQuery = 'SELECT id, mobile, email FROM tbl_workers WHERE ';
      let seekersQuery = 'SELECT id, mobile, email FROM tbl_serviceseeker WHERE ';
      let workersParams = [];
      let seekersParams = [];
      
      if (mobile && email) {
        workersQuery += 'mobile = ? OR email = ?';
        seekersQuery += 'mobile = ? OR email = ?';
        workersParams = [mobile, email];
        seekersParams = [mobile, email];
      } else if (mobile) {
        workersQuery += 'mobile = ?';
        seekersQuery += 'mobile = ?';
        workersParams = [mobile];
        seekersParams = [mobile];
      } else {
        workersQuery += 'email = ?';
        seekersQuery += 'email = ?';
        workersParams = [email];
        seekersParams = [email];
      }

      // Execute both queries
      const [existingWorkers] = await pool.execute(workersQuery, workersParams);
      const [existingSeekers] = await pool.execute(seekersQuery, seekersParams);
      
      // Combine results
      const allExistingUsers = [...existingWorkers, ...existingSeekers];
      
      // Check for existing mobile and email across both tables
      const existingMobile = allExistingUsers.find(user => user.mobile === mobile);
      const existingEmail = allExistingUsers.find(user => user.email === email);

      res.json({
        success: true,
        data: {
          exists: allExistingUsers.length > 0,
          existingMobile: existingMobile ? true : false,
          existingEmail: existingEmail ? true : false,
          message: allExistingUsers.length > 0 ? 'User already exists' : 'User does not exist'
        }
      });
    } else {
      // Check only the specified table
      if (mobile && email) {
        query = `SELECT id, mobile, email FROM ${tableName} WHERE mobile = ? OR email = ?`;
        params = [mobile, email];
      } else if (mobile) {
        query = `SELECT id, mobile, email FROM ${tableName} WHERE mobile = ?`;
        params = [mobile];
      } else {
        query = `SELECT id, mobile, email FROM ${tableName} WHERE email = ?`;
        params = [email];
      }

      const [existingUsers] = await pool.execute(query, params);
      
      // Check for existing mobile and email in the specified table
      const existingMobile = existingUsers.find(user => user.mobile === mobile);
      const existingEmail = existingUsers.find(user => user.email === email);

      res.json({
        success: true,
        data: {
          exists: existingUsers.length > 0,
          existingMobile: existingMobile ? true : false,
          existingEmail: existingEmail ? true : false,
          message: existingUsers.length > 0 ? 'User already exists' : 'User does not exist'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking user existence',
      error: error.message
    });
  }
});

// Get all categories endpoint
app.get('/api/categories', async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT id, title, image FROM tbl_category ORDER BY id DESC'
    );
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

// Get all subcategories endpoint
app.get('/api/subcategories', async (req, res) => {
  try {
    const [subcategories] = await pool.execute(
      'SELECT id, name, image, video_title FROM tbl_subcategory ORDER BY id DESC'
    );
    res.json({
      success: true,
      data: subcategories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subcategories',
      error: error.message
    });
  }
});

// Get single subcategory by ID endpoint
app.get('/api/subcategory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [subcategory] = await pool.execute(
      'SELECT id, name, image, video_title, category_id FROM tbl_subcategory WHERE id = ? LIMIT 1',
      [id]
    );
    
    if (subcategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }
    
    res.json({
      success: true,
      data: subcategory[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subcategory',
      error: error.message
    });
  }
});

// Get categories with their subcategories endpoint
app.get('/api/categories-with-subcategories', async (req, res) => {
  try {
    const [results] = await pool.execute(
      `SELECT 
        c.id AS category_id,
        c.title AS category_title,
        c.image AS category_image,
        s.id AS subcategory_id,
        s.name AS subcategory_name,
        s.image AS subcategory_image
      FROM tbl_category c
      LEFT JOIN tbl_subcategory s ON c.id = s.category_id
      WHERE c.status = 1 AND c.visibility = 1 AND s.status = 1 AND s.visibility = 1
      ORDER BY c.id, s.id`
    );

    // Group the results by category
    const categoriesMap = new Map();
    
    results.forEach(row => {
      const categoryId = row.category_id;
      
      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          id: categoryId,
          title: row.category_title,
          image: row.category_image,
          subcategories: []
        });
      }
      
      // Add subcategory if it exists
      if (row.subcategory_id) {
        categoriesMap.get(categoryId).subcategories.push({
          id: row.subcategory_id,
          name: row.subcategory_name,
          image: row.subcategory_image,
          category_id: categoryId
        });
      }
    });

    const categoriesWithSubcategories = Array.from(categoriesMap.values());
    
    res.json({
      success: true,
      data: categoriesWithSubcategories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories with subcategories',
      error: error.message
    });
  }
});

// Get all banners endpoint
app.get('/api/banners', async (req, res) => {
  try {
    const [banners] = await pool.execute(
      'SELECT id, title, sub_title,image FROM tbl_banners ORDER BY id DESC'
    );
    res.json({
      success: true,
      data: banners
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching banners',
      error: error.message
    });
  }
});

// Get top services near by you endpoint
app.get('/api/top-services', async (req, res) => {
  try {
    const { format } = req.query;
    
    const [results] = await pool.execute(
      `SELECT 
        s.id,
        s.name,
        s.subcategory_id,
        s.image,
        COALESCE(d.deal_price, s.price) AS price,
        s.rating,
        s.created_at,
        s.instant_service,
        sc.name AS subcategory_name,
        c.title AS category_title
      FROM tbl_services s
      LEFT JOIN tbl_deals d ON d.service_id = s.id AND d.is_active = 1
      LEFT JOIN tbl_subcategory sc ON s.subcategory_id = sc.id
      LEFT JOIN tbl_category c ON sc.category_id = c.id
      WHERE s.is_top_service = 1 AND s.status = 1 AND s.visibility = 1
      ORDER BY s.rating DESC, s.id DESC`
    );
    
    // Format based on query parameter
    let topServices;
    if (format === 'services') {
      // Format for services-screen.tsx (show all services)
      topServices = results.map(service => ({
        id: service.id,
        name: service.name,
        subcategory_id: service.subcategory_id,
        image: service.image ? `/uploads/services/${service.image}` : null,
        price: service.price,
        rating: service.rating,
        created_at: service.created_at,
        instant_service: service.instant_service,
      }));
    } else {
      // Format for home screen (default) - limit to 10
      topServices = results.slice(0, 10).map(service => ({
        id: service.id,
        name: service.name,
        image: service.image,
        price: service.price.toString(),
        rating: parseFloat(service.rating),
        subcategory: service.subcategory_name,
        category: service.category_title,
        instant_service: service.instant_service,
      }));
    }
    
    res.json({
      success: true,
      data: topServices
    });
  } catch (error) {
    console.error('Error fetching top services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top services',
      error: error.message
    });
  }
});

// Get top deals endpoint
app.get('/api/top-deals', async (req, res) => {
  try {
    const { format } = req.query;
    
    const [results] = await pool.execute(
      `SELECT 
        d.id,
        d.service_id,
        s.name AS name,
        s.subcategory_id,
        s.image AS image,
        d.discount,
        d.original_price,
        d.deal_price,
        s.rating,
        d.created_at,
        s.name AS service_name,
        sc.name AS subcategory_name,
        c.title AS category_title,
        s.instant_service
      FROM tbl_deals d
      LEFT JOIN tbl_services s ON d.service_id = s.id
      LEFT JOIN tbl_subcategory sc ON s.subcategory_id = sc.id
      LEFT JOIN tbl_category c ON sc.category_id = c.id
      WHERE d.is_active = 1 AND s.status = 1 AND s.visibility = 1
      ORDER BY d.id DESC`
    );
    
    // Format based on query parameter
    let topDeals;
    if (format === 'services') {
      // Format for services-screen.tsx (show all deals)
      topDeals = results.map(deal => ({
        id: deal.service_id || deal.id,
        name: deal.name,
        subcategory_id: deal.subcategory_id,
        image: deal.image ? `/uploads/services/${deal.image}` : null,
        price: deal.deal_price,
        rating: deal.rating,
        created_at: deal.created_at,
        instant_service: deal.instant_service,
      }));
    } else {
      // Format for home screen (default)
      topDeals = results.slice(0, 10).map(deal => ({
        id: deal.id,
        serviceId: deal.service_id,
        name: deal.name,
        image: deal.image,
        discount: deal.discount,
        originalPrice: deal.original_price.toString(),
        dealPrice: deal.deal_price.toString(),
        service: deal.service_name,
        subcategory: deal.subcategory_name,
        category: deal.category_title,
        instant_service: deal.instant_service,
      }));
    }
    
    res.json({
      success: true,
      data: topDeals
    });
  } catch (error) {
    console.error('Error fetching top deals:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top deals',
      error: error.message
    });
  }
});

// Search services and subcategories endpoint (must come before /api/services/:subcategoryId)
app.get('/api/services/search', async (req, res) => {
  try {
    const { q } = req.query;
    console.log('Search query:', q);
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Search in tbl_services
    const [services] = await pool.execute(
      `SELECT 
        s.id, 
        s.name, 
        s.subcategory_id, 
        s.image, 
        COALESCE(d.deal_price, s.price) AS price, 
        s.rating, 
        s.created_at,
        s.instant_service
      FROM tbl_services s
      LEFT JOIN tbl_deals d ON d.service_id = s.id AND d.is_active = 1
      LEFT JOIN tbl_subcategory sc ON s.subcategory_id = sc.id
      LEFT JOIN tbl_category c ON sc.category_id = c.id
      WHERE s.name LIKE ? 
        AND s.status = 1 
        AND s.visibility = 1 
        AND sc.status = 1 
        AND sc.visibility = 1 
        AND c.status = 1 
        AND c.visibility = 1
      ORDER BY s.id DESC 
      LIMIT 20`,
      [`%${q}%`]
    );

    // Search in tbl_subcategory
    const [subcategories] = await pool.execute(
      'SELECT id, name, category_id, image, created_at FROM tbl_subcategory WHERE name LIKE ? ORDER BY id DESC LIMIT 20',
      [`%${q}%`]
    );

    console.log('Found services:', services.length);
    console.log('Found subcategories:', subcategories.length);

    // Combine and format results
    const servicesWithImages = services.map(service => ({
      id: service.id,
      name: service.name,
      subcategory_id: service.subcategory_id,
      image: service.image ? `/uploads/services/${service.image}` : null,
      price: service.price,
      rating: service.rating,
      created_at: service.created_at,
      instant_service: service.instant_service,
      type: 'service'
    }));

    const subcategoriesWithImages = subcategories.map(subcategory => ({
      id: subcategory.id,
      name: subcategory.name,
      subcategory_id: subcategory.id, // For subcategories, use their own ID
      image: subcategory.image ? `/uploads/subcategorys/${subcategory.image}` : null,
      created_at: subcategory.created_at,
      type: 'subcategory'
    }));

    // Combine results (subcategories first, then services)
    const allResults = [...subcategoriesWithImages, ...servicesWithImages];

    res.json({
      success: true,
      data: allResults
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching services',
      error: error.message
    });
  }
});

// Get services by category ID endpoint (all subcategories in a category)
app.get('/api/services-by-category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }

    // First get all subcategories for this category
    const [subcategories] = await pool.execute(
      'SELECT id FROM tbl_subcategory WHERE category_id = ? AND status = 1 AND visibility = 1',
      [categoryId]
    );

    if (subcategories.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Get subcategory IDs
    const subcategoryIds = subcategories.map(sub => sub.id);

    // Get all services for these subcategories
    const placeholders = subcategoryIds.map(() => '?').join(',');
    const [services] = await pool.execute(
      `SELECT 
        s.id, 
        s.name, 
        s.subcategory_id, 
        s.image, 
        COALESCE(d.deal_price, s.price) AS price, 
        s.rating, 
        s.created_at,
        s.instant_service
      FROM tbl_services s
      LEFT JOIN tbl_deals d ON d.service_id = s.id AND d.is_active = 1
      LEFT JOIN tbl_subcategory sc ON s.subcategory_id = sc.id
      LEFT JOIN tbl_category c ON sc.category_id = c.id
      WHERE s.subcategory_id IN (${placeholders}) 
        AND s.status = 1 
        AND s.visibility = 1 
        AND sc.status = 1 
        AND sc.visibility = 1 
        AND c.status = 1 
        AND c.visibility = 1
      ORDER BY s.created_at DESC`,
      subcategoryIds
    );

    // Add full image URLs
    const servicesWithImages = services.map(service => ({
      ...service,
      image: service.image ? `/uploads/services/${service.image}` : null
    }));

    res.json({
      success: true,
      data: servicesWithImages
    });
  } catch (error) {
    console.error('Error fetching services by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: error.message
    });
  }
});

// Get services by subcategory ID endpoint
app.get('/api/services/:subcategoryId', async (req, res) => {
  try {
    const { subcategoryId } = req.params;
    
    if (!subcategoryId) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory ID is required'
      });
    }

    const [services] = await pool.execute(
      `SELECT 
        s.id, 
        s.name, 
        s.subcategory_id, 
        s.image, 
        COALESCE(d.deal_price, s.price) AS price, 
        s.rating, 
        s.created_at,
        s.instant_service
      FROM tbl_services s
      LEFT JOIN tbl_deals d ON d.service_id = s.id AND d.is_active = 1
      LEFT JOIN tbl_subcategory sc ON s.subcategory_id = sc.id
      LEFT JOIN tbl_category c ON sc.category_id = c.id
      WHERE s.subcategory_id = ? 
        AND s.status = 1 
        AND s.visibility = 1 
        AND sc.status = 1 
        AND sc.visibility = 1 
        AND c.status = 1 
        AND c.visibility = 1
      ORDER BY s.created_at DESC`,
      [subcategoryId]
    );

    // Add full image URLs
    const servicesWithImages = services.map(service => ({
      ...service,
      image: service.image ? `/uploads/services/${service.image}` : null
    }));

    res.json({
      success: true,
      data: servicesWithImages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: error.message
    });
  }
});

// Get all services endpoint
app.get('/api/services', async (req, res) => {
  try {
    const [services] = await pool.execute(
      'SELECT id, name, subcategory_id, image, created_at, instant_service FROM tbl_services ORDER BY created_at DESC'
    );

    // Add full image URLs
    const servicesWithImages = services.map(service => ({
      ...service,
      image: service.image ? `/uploads/services/${service.image}` : null
    }));

    res.json({
      success: true,
      data: servicesWithImages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: error.message
    });
  }
});

app.get('/api/categorie-suggestions', async (req, res) => {
  const { query } = req.query;
  if (!query || query.length < 1) {
    return res.json({ success: true, data: [] });
  }
  try {
    // Search only by name column since keywords column doesn't exist
    const [categories] = await pool.execute(
      `SELECT id, name FROM tbl_subcategory WHERE name LIKE ? ORDER BY name ASC LIMIT 10`,
      [`%${query}%`]
    );
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching category suggestions',
      error: error.message,
    });
  }
});

app.get('/api/workers-nearby', async (req, res) => {
  try {
    const { lat, lng, skill_id } = req.query;

    if (!lat || !lng || !skill_id) {
      return res.status(400).json({
        success: false,
        message: 'Latitude, longitude, and skill_id are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const skillId = skill_id;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude values'
      });
    }

    const query = `
SELECT 
    w.id,
    w.name,
    w.mobile,
    w.email,
    w.price,
    w.skill_id,
    w.pincode,
    w.mandal,
    w.city,
    w.district,
    w.state,
    w.country,
    w.address,
    w.type,
    w.profile_image,
    w.document1,
    w.document2,
    w.created_at,
    wl.latitude,
    wl.longitude,
    wl.updated_at as location_updated_at,
    GROUP_CONCAT(c.name ORDER BY c.name SEPARATOR ', ') AS skill_name,
    CASE 
        WHEN wl.latitude IS NOT NULL AND wl.longitude IS NOT NULL THEN
            (6371 * acos(
                cos(radians(?)) * cos(radians(CAST(wl.latitude AS DECIMAL(10,6)))) * 
                cos(radians(CAST(wl.longitude AS DECIMAL(10,6))) - radians(?)) + 
                sin(radians(?)) * sin(radians(CAST(wl.latitude AS DECIMAL(10,6))))
            ))
        ELSE NULL
    END AS distance
FROM tbl_workers w
INNER JOIN tbl_workerlocation wl ON w.id = wl.worker_id
LEFT JOIN tbl_subcategory c 
    ON FIND_IN_SET(c.id, REPLACE(w.skill_id, ' ', '')) > 0
WHERE FIND_IN_SET(?, REPLACE(w.skill_id, ' ', '')) > 0
GROUP BY w.id, wl.latitude, wl.longitude
ORDER BY distance ASC
`;

    const [workers] = await pool.execute(query, [latitude, longitude, latitude, skillId]);

    res.json({
      success: true,
      data: workers.map(worker => ({
        ...worker,
        profile_image: worker.profile_image
          ? `/uploads/profiles/${worker.profile_image}`
          : null,
        distance: worker.distance ? parseFloat(worker.distance.toFixed(2)) : null 
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching nearest workers',
      error: error.message
    });
  }
});

app.get('/api/category-subcategory', async (req, res) => {
  try {
    if (!pool) {
      throw new Error('Database connection pool is not initialized');
    }

    const [results] = await pool.execute(
      `SELECT 
        c.id AS category_id,
        c.title AS category_title,
        c.sub_title AS category_subtitle,
        s.id AS subcategory_id,
        s.name AS subcategory_title,
        s.image AS subcategory_image
      FROM tbl_category c
      LEFT JOIN tbl_subcategory s ON c.id = s.category_id
      ORDER BY c.id, s.id`
    );

    if (!Array.isArray(results) || results.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const groupedData = results.reduce((acc, row) => {
      if (!row || typeof row !== 'object') {
        return acc;
      }

      const categoryId = row.category_id?.toString();
      if (!categoryId) {
        return acc;
      }

      if (!acc[categoryId]) {
        acc[categoryId] = {
          id: categoryId,
          title: row.category_title || 'Unnamed Category',
          sub_title: row.category_subtitle || '',
          items: []
        };
      }

      if (row.subcategory_id) {
        acc[categoryId].items.push({
          id: row.subcategory_id,
          title: row.subcategory_title || 'Unnamed Subcategory',
          image: row.subcategory_image || null
        });
      }

      return acc;
    }, {});

    const responseData = Object.values(groupedData);

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Error fetching category-subcategory data',
      error: errorMessage
    });
  }
});

// OTP Configuration
const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY || '476418A4ojfZq9690af21aP1';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '693274123c3a6e1e873efbf3';

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map();

// Firebase notification functions
const sendNotification = async (token, title, body, data = {}) => {
  try {
    const message = {
      notification: {
        title: title,
        body: body
      },
      data: data,
      token: token
    };

    const response = await admin.messaging().send(message);
    console.log('📱 Notification sent successfully:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    return { success: false, error: error.message };
  }
};

// Send booking alert notification with high priority
// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

const sendBookingAlertNotification = async (workerId, bookingData) => {
  try {
    console.log(`🚨 Sending booking alert notification to worker: ${workerId}`);

    const [tokens] = await pool.execute(
      'SELECT fcm_token FROM tbl_push_tokens WHERE user_id = ? AND user_type = "worker" ORDER BY id DESC LIMIT 1',
      [workerId]
    );

    if (tokens.length === 0) {
      console.log(`❌ No FCM token found for worker: ${workerId}`);
      return { success: false, error: 'No FCM token found' };
    }

    const fcmToken = tokens[0].fcm_token;
    console.log(`🔍 Found ${tokens.length} FCM tokens for worker: ${workerId}`);
    console.log(`🔍 Using token: ${fcmToken.substring(0, 50)}... (length: ${fcmToken.length})`);
    
    if (!fcmToken) {
      console.log(`❌ Empty FCM token for worker: ${workerId}`);
      return { success: false, error: 'Empty FCM token' };
    }

    // Calculate distance if work location coordinates are available
    let distance = null;
    let distanceText = '';
    if (bookingData.work_location_lat && bookingData.work_location_lng) {
      try {
        // Get worker's current location from tbl_workerlocation
        const [workerLocations] = await pool.execute(
          'SELECT latitude, longitude FROM tbl_workerlocation WHERE worker_id = ? ORDER BY updated_at DESC LIMIT 1',
          [workerId]
        );

        if (workerLocations.length > 0 && workerLocations[0].latitude && workerLocations[0].longitude) {
          const workerLat = parseFloat(workerLocations[0].latitude);
          const workerLng = parseFloat(workerLocations[0].longitude);
          const workLat = parseFloat(bookingData.work_location_lat);
          const workLng = parseFloat(bookingData.work_location_lng);

          // Calculate distance in kilometers
          distance = calculateDistance(workerLat, workerLng, workLat, workLng);
          
          // Format distance text
          if (distance < 1) {
            distanceText = `${Math.round(distance * 1000)} meters away`;
          } else {
            distanceText = `${distance.toFixed(1)} km away`;
          }
          
          console.log(`📍 Distance calculated: ${distanceText}`);
        } else {
          console.log(`⚠️ Worker location not found for worker: ${workerId}`);
        }
      } catch (distanceError) {
        console.error('❌ Error calculating distance:', distanceError);
        // Continue with notification even if distance calculation fails
      }
    }

    // Calculate distance from original (profile) location if available
    let originalDistanceText = '';
    try {
      const [originalLocations] = await pool.execute(
        'SELECT latitude, longitude FROM tbl_workers WHERE id = ? LIMIT 1',
        [workerId]
      );

      if (
        originalLocations.length > 0 &&
        originalLocations[0].latitude &&
        originalLocations[0].longitude &&
        bookingData.work_location_lat &&
        bookingData.work_location_lng
      ) {
        const originLat = parseFloat(originalLocations[0].latitude);
        const originLng = parseFloat(originalLocations[0].longitude);
        const workLat = parseFloat(bookingData.work_location_lat);
        const workLng = parseFloat(bookingData.work_location_lng);

        const originDistance = calculateDistance(originLat, originLng, workLat, workLng);
        originalDistanceText =
          originDistance < 1
            ? `${Math.round(originDistance * 1000)} meters away`
            : `${originDistance.toFixed(1)} km away`;
        console.log(`📍 Original distance calculated: ${originalDistanceText}`);
      }
    } catch (originError) {
      console.error('❌ Error calculating original distance:', originError);
    }

    // HYBRID APPROACH: Send both notification and data for better compatibility
    // Notification ensures system shows something when app is closed
    // Data ensures our service can handle fullscreen overlay
    
    // Ensure booking_time is a string
    const bookingTimeStr = bookingData.booking_time ? 
      (typeof bookingData.booking_time === 'string' ? bookingData.booking_time : new Date(bookingData.booking_time).toISOString()) : 
      new Date().toISOString();
    
    const message = {
      // Add notification payload for system-level display when app is closed
      notification: {
        title: '🚨 URGENT: New Booking Request!',
        body: `${bookingData.customer_name} needs ${bookingData.work_type || 'service'} at ${bookingData.work_location}`
      },
      data: {
        type: 'booking_alert',
        booking_id: String(bookingData.booking_id || ''),
        customer_name: String(bookingData.customer_name || ''),
        customer_mobile: String(bookingData.customer_mobile || ''),
        work_location: String(bookingData.work_location || ''),
        work_location_distance: String(distanceText || ''),
        work_location_distance_original: String(originalDistanceText || ''),
        description: String(bookingData.description || ''),
        booking_time: bookingTimeStr,
        worker_id: String(workerId),
        timestamp: String(Date.now()),
        work_type: String(bookingData.work_type || 'Service Request'),
        // Add notification content to data payload so our service can create the notification
        notification_title: '🚨 URGENT: New Booking Request!',
        notification_body: `${bookingData.customer_name} needs ${bookingData.work_type || 'service'} at ${bookingData.work_location}`,
        fullscreen: 'true', // Flag for fullscreen worker notifications (matches working implementation)
        continuous_vibration: 'true', // Flag for continuous vibration
        // Additional fields for better background handling
        priority: 'high',
        ttl: '3600', // 1 hour TTL
        collapse_key: `booking_${bookingData.booking_id}`,
      },
      android: {
        priority: 'high', // Critical for background delivery
        notification: {
          // Android-specific notification settings
          title: '🚨 URGENT: New Booking Request!',
          body: `${bookingData.customer_name} needs ${bookingData.work_type || 'service'} at ${bookingData.work_location}`,
          sound: 'default',
          channelId: 'booking-alerts',
          priority: 'max',
          visibility: 'public',
          tag: `booking_${bookingData.booking_id}`,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      // iOS configuration for background delivery
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'background', // Changed to background for data-only
        },
        payload: {
          aps: {
            'content-available': 1, // Required for background delivery
            'mutable-content': 1,
            // NO alert field - keeps it data-only for iOS too
          },
          data: {
            type: 'booking_alert',
            booking_id: String(bookingData.booking_id || ''),
            customer_name: String(bookingData.customer_name || ''),
            customer_mobile: String(bookingData.customer_mobile || ''),
            work_location: String(bookingData.work_location || ''),
            work_location_distance: String(distanceText || ''),
          work_location_distance_original: String(originalDistanceText || ''),
            work_location_distance_original: String(originalDistanceText || ''),
            description: String(bookingData.description || ''),
            booking_time: bookingTimeStr,
            worker_id: String(workerId),
            timestamp: String(Date.now()),
            notification_title: '🚨 URGENT: New Booking Request!',
            notification_body: `${bookingData.customer_name} needs ${bookingData.work_type || 'service'} at ${bookingData.work_location}`,
          }
        }
      },
      token: fcmToken
    };

    const response = await admin.messaging().send(message);
    console.log('📱 Booking alert notification sent successfully:', response);
    return { success: true, messageId: response };

  } catch (error) {
    console.error('❌ Error sending booking alert notification:', error);
    return { success: false, error: error.message };
  }
};

const sendNotificationToMultipleTokens = async (tokens, title, body, data = {}) => {
  try {
    const message = {
      notification: {
        title: title,
        body: body
      },
      data: data,
      tokens: tokens
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log('📱 Multicast notification sent:', response);
    return { 
      success: true, 
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses
    };
  } catch (error) {
    console.error('❌ Error sending multicast notification:', error);
    return { success: false, error: error.message };
  }
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via MSG91
app.post('/api/send-otp', async (req, res) => {
  const { mobile, userType } = req.body;
  
  if (!mobile || !userType) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number and user type are required'
    });
  }

  if(userType === 'professional') {
    const [ActiveWorker] = await pool.execute(
      'SELECT id FROM tbl_workers WHERE mobile = ? AND status = ? LIMIT 1',
      [mobile, 1]
    );
    if (ActiveWorker.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Worker is inactive wait for admin approval'
      });
    }
  }
  
  try {
    // Generate OTP
    const otp = generateOTP();
    const message = `OTP: ${otp}`;
    console.log('Siva Muni' + otp);
    
    // Store OTP with timestamp (10 minutes expiry)
    otpStore.set(mobile, {
      otp,
      timestamp: Date.now(),
      userType
    });

    // Send OTP via MSG91
    const msg91Url = 'https://control.msg91.com/api/v5/flow/';
    const requestData = {
      authkey: MSG91_AUTHKEY,
      template_id: MSG91_TEMPLATE_ID,
      recipients: [
        {
          mobiles: '91' + mobile,
          otp: otp
        }
      ]
    };

    const response = await axios.post(msg91Url, requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.type === 'success' || response.data.message === 'SMS sent successfully') {
      res.json({
        success: true,
        message: 'OTP sent successfully',
        data: { mobile, userType }
      });
    } else {
      // Better error handling for MSG91 API
      const errorMessage = response.data.message || 'Failed to send OTP';
      throw new Error(errorMessage);
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  const { mobile, otp, userType } = req.body;
  
  if (!mobile || !otp || !userType) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number, OTP and user type are required'
    });
  }

  try {
    const storedData = otpStore.get(mobile);
    
    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found'
      });
    }

    // Check if OTP is expired (5 minutes)
    if (Date.now() - storedData.timestamp > 5 * 60 * 1000) {
      otpStore.delete(mobile);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    // Check if OTP matches
    if (storedData.otp !== otp || storedData.userType !== userType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP or user type'
      });
    }

    // OTP verified successfully
    otpStore.delete(mobile); // Clean up

    // Check if user exists in database
    let user = null;
    let type = null;
    let foundInPreferredTable = false;

    // First, try to find user in the preferred table based on userType
    if (userType === 'professional') {
      const [workers] = await pool.execute(
        'SELECT * FROM tbl_workers WHERE mobile = ? LIMIT 1',
        [mobile]
      );
      if (workers.length > 0) {
        user = workers[0];
        type = 1;
        foundInPreferredTable = true;
      }
    } else if (userType === 'seeker') {
      const [seekers] = await pool.execute(
        'SELECT * FROM tbl_serviceseeker WHERE mobile = ? LIMIT 1',
        [mobile]
      );
      if (seekers.length > 0) {
        user = seekers[0];
        type = 2;
        foundInPreferredTable = true;
      }
    }

    // If user not found in preferred table, search in the other table
    if (!user) {
      if (userType === 'professional') {
        // Search in service seeker table as fallback
        const [seekers] = await pool.execute(
          'SELECT * FROM tbl_serviceseeker WHERE mobile = ? LIMIT 1',
          [mobile]
        );
        if (seekers.length > 0) {
          user = seekers[0];
          type = 2;
          console.log(`🔄 User found in tbl_serviceseeker instead of tbl_workers for mobile: ${mobile}`);
        }
      } else if (userType === 'seeker') {
        // Search in workers table as fallback
        const [workers] = await pool.execute(
          'SELECT * FROM tbl_workers WHERE mobile = ? LIMIT 1',
          [mobile]
        );
        if (workers.length > 0) {
          user = workers[0];
          type = 1;
          console.log(`🔄 User found in tbl_workers instead of tbl_serviceseeker for mobile: ${mobile}`);
        }
      }
    }

    if (user) {
      // Fix profile image path by checking for missing extensions
      let profileImagePath = user.profile_image;
      if (user.profile_image) {
        const baseName = user.profile_image;
        const extensions = ['.jpg', '.jpeg', '.png', '.gif'];
        
        // Check if file exists with current name
        const currentPath = path.join(__dirname, 'uploads', 'profiles', baseName);
        let fileExists = false;
        
        try {
          await fs.access(currentPath);
          fileExists = true;
        } catch (error) {
          // File doesn't exist, try with different extensions
          for (const ext of extensions) {
            const testPath = path.join(__dirname, 'uploads', 'profiles', baseName + ext);
            try {
              await fs.access(testPath);
              profileImagePath = baseName + ext;
              break;
            } catch (err) {
              // Continue to next extension
            }
          }
        }
      }
      
      // User exists - login successful
      res.json({
        success: true,
        message: foundInPreferredTable ? 'Login successful' : 'Login successful (user found in alternate table)',
        data: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          type,
          profile_image: profileImagePath ? `/uploads/profiles/${profileImagePath}` : null,
          found_in_preferred_table: foundInPreferredTable
        }
      });
    } else {
      // User doesn't exist - registration required
      res.json({
        success: true,
        message: 'OTP verified. User not found. Registration required.',
        data: {
          mobile,
          userType,
          requiresRegistration: true
        }
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.'
    });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const bcrypt = require('bcryptjs');

  try {
    let user = null;
    let type = null;

    // 1️⃣ Check tbl_workers
    const [workers] = await pool.execute(
      'SELECT * FROM tbl_workers WHERE email = ? LIMIT 1',
      [email]
    );

    if (workers.length > 0) {
      const isMatch = await bcrypt.compare(password, workers[0].password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      user = workers[0];
      type = 1;
    } else {
      // 2️⃣ Check tbl_serviceseeker
      const [seekers] = await pool.execute(
        'SELECT * FROM tbl_serviceseeker WHERE email = ? LIMIT 1',
        [email]
      );
      if (seekers.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      const isMatch = await bcrypt.compare(password, seekers[0].password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      user = seekers[0];
      type = 2;
    }

    // ✅ Success
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        type, // 1 for worker, 2 for service seeker
        profile_image: user.profile_image ? `/uploads/profiles/${user.profile_image}` : null
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin Login endpoint
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const bcrypt = require('bcryptjs');

  try {
    // Check tbl_admin table
    const [admins] = await pool.execute(
      'SELECT * FROM tbl_admin WHERE user_name = ? LIMIT 1',
      [username]
    );

    if (admins.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const admin = admins[0];
    
    // Check if password is hashed (starts with $2a$, $2b$, or $2y$)
    const isHashed = admin.password.startsWith('$2a$') || 
                     admin.password.startsWith('$2b$') || 
                     admin.password.startsWith('$2y$');
    
    let isMatch = false;
    
    if (isHashed) {
      // Compare hashed password
      isMatch = await bcrypt.compare(password, admin.password);
    } else {
      // Compare plain text password (for initial setup)
      isMatch = password === admin.password;
    }
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // ✅ Success - Return admin data
    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.user_name,
        created_at: admin.created_at,
        updated_at: admin.updated_at
      },
      token: `admin_token_${admin.id}_${Date.now()}` // Simple token generation
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

// Get bookings by user ID endpoint (for service seekers) - ADD THIS BEFORE THE 404 HANDLER
app.get('/api/bookings/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, skip_payment_check } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    console.log(`🔍 Fetching bookings for user ID: ${userId}, status filter: ${status}`);

    // Build query based on status filter
    let query = `
      SELECT 
        b.id,
        b.booking_id,
        b.worker_id,
        b.user_id,
        b.contact_number,
        b.work_location,
        b.booking_time,
        b.status,
        b.payment_status,
        b.created_at,
        b.description,
        b.work_documents,
        w.name as worker_name,
        w.mobile as worker_mobile,
        c.status as cancel_status,
        c.type as cancel_type,
        c.cancel_reason,
        c.created_at as canceled_date,
        r.status as reschedule_status,
        r.type as reschedule_type,
        r.reschedule_reason,
        r.reschedule_date
      FROM tbl_bookings b
      LEFT JOIN tbl_workers w ON b.worker_id = w.id
      LEFT JOIN tbl_canceledbookings c ON b.id = CAST(TRIM(c.bookingid) AS UNSIGNED)
      LEFT JOIN tbl_rescheduledbookings r ON b.id = CAST(TRIM(r.bookingid) AS UNSIGNED)
      WHERE b.user_id = ?
    `;
    
    let params = [userId];
    
    // Handle multiple status values (comma-separated)
    if (status !== undefined && status !== '') {
      if (status.includes(',')) {
        // Multiple statuses (e.g., "0,1,3" or "0,1,2,3")
        const statusArray = status.split(',').map(s => parseInt(s.trim()));
        const placeholders = statusArray.map(() => '?').join(',');
        query += ` AND b.status IN (${placeholders})`;
        params.push(...statusArray);
      } else {
        // Single status
        const singleStatus = parseInt(status);
        query += ' AND b.status = ?';
        params.push(singleStatus);
        console.log(`📊 Applied single status filter: ${status}`);
      }
    } else {
      console.log(`📊 No status filter applied - fetching all bookings for user`);
    }
    // Apply payment_status = 1 condition unless skip_payment_check is true (for polling)
    if (skip_payment_check !== 'true') {
      query += ' AND b.payment_status = 1';
    }
    // Only exclude status 2 if status filter doesn't include 2 (for BOOKINGS_BY_USER - Notifications tab)
    if (status === undefined || status === '' || !status.includes('2')) {
      query += ' AND b.status != 2';
    }
    
    query += ' ORDER BY b.created_at DESC';

    const [bookings] = await pool.execute(query, params);

    res.json({
      success: true,
      data: bookings,
      debug: {
        userId,
        statusFilter: status,
        totalBookings: bookings.length,
        query: query,
        params: params
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user bookings',
      error: error.message
    });
  }
});

// Get payment history by user ID endpoint
app.get('/api/payments/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    // Join tbl_payments with tbl_bookings to get payment details with booking info
    const query = `
      SELECT 
        p.id,
        p.payment_id,
        p.amount,
        p.created_at as payment_date,
        b.booking_id,
        b.description
      FROM tbl_payments p
      INNER JOIN tbl_bookings b ON p.bookingid = b.id
      WHERE b.user_id = ?
      ORDER BY p.created_at DESC
    `;
    
    const [payments] = await pool.execute(query, [userId]);

    res.json({
      success: true,
      data: payments
    });
    
  } catch (error) {
    console.error('❌ Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history',
      error: error.message
    });
  }
});

// Get all service seekers endpoint - ADD THIS TOO
app.get('/api/serviceseekers', async (req, res) => {
  try {
    const [seekers] = await pool.execute(
      'SELECT id, name, mobile, email, pincode, district, state, country, profile_image, created_at FROM tbl_serviceseeker ORDER BY created_at DESC'
    );

    // Add full image URLs
    const seekersWithImages = seekers.map(seeker => ({
      ...seeker,
      profile_image: seeker.profile_image ? `/uploads/profiles/${seeker.profile_image}` : null
    }));

    res.json({
      success: true,
      data: seekersWithImages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching service seekers',
      error: error.message
    });
  }
});

// Store worker location endpoint
app.post('/api/worker-location', async (req, res) => {
  try {
    const { worker_id, latitude, longitude } = req.body;
    
    // Validation
    if (!worker_id || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'worker_id, latitude, and longitude are required'
      });
    }

    // Validate latitude and longitude are numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'latitude and longitude must be valid numbers'
      });
    }

    // Check if worker exists
    const [workers] = await pool.execute(
      'SELECT id FROM tbl_workers WHERE id = ?',
      [worker_id]
    );

    if (workers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Check if location already exists for this worker
    const [existingLocations] = await pool.execute(
      'SELECT id FROM tbl_workerlocation WHERE worker_id = ?',
      [worker_id]
    );

    if (existingLocations.length > 0) {
      // Update existing location
      const [result] = await pool.execute(
        'UPDATE tbl_workerlocation SET latitude = ?, longitude = ?, updated_at = NOW() WHERE worker_id = ?',
        [lat, lng, worker_id]
      );

      res.json({
        success: true,
        message: 'Worker location updated successfully',
        data: {
          worker_id,
          latitude: lat,
          longitude: lng,
          updated: true
        }
      });
    } else {
      // Insert new location
      const [result] = await pool.execute(
        'INSERT INTO tbl_workerlocation (worker_id, latitude, longitude, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        [worker_id, lat, lng]
      );

      res.json({
        success: true,
        message: 'Worker location stored successfully',
        data: {
          id: result.insertId,
          worker_id,
          latitude: lat,
          longitude: lng,
          created: true
        }
      });
    }

  } catch (error) {
    console.error('Error storing worker location:', error);
    res.status(500).json({
      success: false,
      message: 'Error storing worker location',
      error: error.message
    });
  }
});

// Get worker location endpoint
app.get('/api/worker-location/:worker_id', async (req, res) => {
  try {
    const { worker_id } = req.params;
    
    if (!worker_id) {
      return res.status(400).json({
        success: false,
        message: 'worker_id is required'
      });
    }

    const [locations] = await pool.execute(
      'SELECT * FROM tbl_workerlocation WHERE worker_id = ? ORDER BY updated_at DESC LIMIT 1',
      [worker_id]
    );

    if (locations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Location not found for this worker'
      });
    }

    res.json({
      success: true,
      data: locations[0]
    });

  } catch (error) {
    console.error('Error fetching worker location:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching worker location',
      error: error.message
    });
  }
});

// Firebase notification endpoints

// Store FCM token for user
app.post('/api/fcm-token', async (req, res) => {
  try {
    const { user_id, user_type, fcm_token } = req.body;
    
    if (!user_id || !user_type || !fcm_token) {
      return res.status(400).json({
        success: false,
        message: 'user_id, user_type, and fcm_token are required'
      });
    }

    // Check if user exists in both tables (same logic as login)
    let userExists = false;
    let actualUserType = user_type;
    
    // First, check in the preferred table based on user_type
    if (user_type === 'professional' || user_type === 'worker') {
      const [workers] = await pool.execute(
        'SELECT id FROM tbl_workers WHERE id = ?',
        [user_id]
      );
      if (workers.length > 0) {
        userExists = true;
        actualUserType = 'worker'; // Normalize to 'worker' for FCM token storage
      }
    } else if (user_type === 'seeker' || user_type === 'customer') {
      const [seekers] = await pool.execute(
        'SELECT id FROM tbl_serviceseeker WHERE id = ?',
        [user_id]
      );
      if (seekers.length > 0) {
        userExists = true;
        actualUserType = 'seeker'; // Normalize to 'seeker' for FCM token storage
      }
    }
    
    // If user not found in preferred table, search in the other table
    if (!userExists) {
      if (user_type === 'professional' || user_type === 'worker') {
        // Search in service seeker table as fallback
        const [seekers] = await pool.execute(
          'SELECT id FROM tbl_serviceseeker WHERE id = ?',
          [user_id]
        );
        if (seekers.length > 0) {
          userExists = true;
          actualUserType = 'seeker';
          console.log(`🔄 FCM: User ${user_id} found in tbl_serviceseeker instead of tbl_workers`);
        }
      } else if (user_type === 'seeker' || user_type === 'customer') {
        // Search in workers table as fallback
        const [workers] = await pool.execute(
          'SELECT id FROM tbl_workers WHERE id = ?',
          [user_id]
        );
        if (workers.length > 0) {
          userExists = true;
          actualUserType = 'worker';
          console.log(`🔄 FCM: User ${user_id} found in tbl_workers instead of tbl_serviceseeker`);
        }
      }
    }

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Use INSERT ... ON DUPLICATE KEY UPDATE to handle existing tokens
    console.log('Storing FCM token:', { user_id, user_type: actualUserType, token_length: fcm_token.length });
    
    const [result] = await pool.execute(
      `INSERT INTO tbl_push_tokens (user_id, user_type, fcm_token, created_at, updated_at) 
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       fcm_token = VALUES(fcm_token), 
       updated_at = NOW()`,
      [user_id, actualUserType, fcm_token]
    );

    console.log('FCM token storage result:', result);

    res.json({
      success: true,
      message: 'FCM token stored successfully',
      data: { user_id, user_type: actualUserType, fcm_token, original_user_type: user_type }
    });

  } catch (error) {
    console.error('Error storing FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Error storing FCM token',
      error: error.message
    });
  }
});

// Send notification to specific user
app.post('/api/send-notification', async (req, res) => {
  try {
    const { user_id, user_type, title, body, data = {} } = req.body;
    
    if (!user_id || !user_type || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'user_id, user_type, title, and body are required'
      });
    }

    // Get user's FCM token from push_tokens table
    const [tokens] = await pool.execute(
      'SELECT fcm_token FROM tbl_push_tokens WHERE user_id = ? AND user_type = ?',
      [user_id, user_type]
    );

    if (tokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User does not have FCM token registered'
      });
    }

    const fcmToken = tokens[0].fcm_token;
    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'User does not have FCM token registered'
      });
    }

    // Send notification
    const result = await sendNotification(fcmToken, title, body, data);

    res.json({
      success: result.success,
      message: result.success ? 'Notification sent successfully' : 'Failed to send notification',
      data: result
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notification',
      error: error.message
    });
  }
});

// Send notification to multiple users by type
app.post('/api/send-notification-broadcast', async (req, res) => {
  try {
    const { user_type, title, body, data = {} } = req.body;
    
    if (!user_type || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'user_type, title, and body are required'
      });
    }

    // Get all FCM tokens for the user type from push_tokens table
    const [tokens] = await pool.execute(
      'SELECT fcm_token FROM tbl_push_tokens WHERE user_type = ? AND fcm_token IS NOT NULL AND fcm_token != ""',
      [user_type]
    );

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users with FCM tokens found'
      });
    }

    const fcmTokens = tokens.map(token => token.fcm_token).filter(token => token);

    // Send notification to all tokens
    const result = await sendNotificationToMultipleTokens(fcmTokens, title, body, data);

    res.json({
      success: result.success,
      message: result.success ? 'Broadcast notification sent successfully' : 'Failed to send broadcast notification',
      data: {
        ...result,
        totalTokens: fcmTokens.length
      }
    });

  } catch (error) {
    console.error('Error sending broadcast notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending broadcast notification',
      error: error.message
    });
  }
});

// Send notification when booking status changes
app.post('/api/send-booking-notification', async (req, res) => {
  try {
    const { booking_id, status, worker_id, user_id } = req.body;
    
    if (!booking_id || !status || !worker_id || !user_id) {
      return res.status(400).json({
        success: false,
        message: 'booking_id, status, worker_id, and user_id are required'
      });
    }

    // Get worker and user details
    const [workers] = await pool.execute(
      'SELECT name FROM tbl_workers WHERE id = ?',
      [worker_id]
    );
    
    const [users] = await pool.execute(
      'SELECT name FROM tbl_serviceseeker WHERE id = ?',
      [user_id]
    );

    if (workers.length === 0 || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker or user not found'
      });
    }

    const worker = workers[0];
    const user = users[0];

    // Get FCM token for the user (service seeker)
    const [userTokens] = await pool.execute(
      'SELECT fcm_token FROM tbl_push_tokens WHERE user_id = ? AND user_type = ?',
      [user_id, 'seeker']
    );

    const userFcmToken = userTokens.length > 0 ? userTokens[0].fcm_token : null;

    // Determine notification content based on status
    let title, body;

    switch (status) {
      case 1: // Accepted
        title = 'Booking Accepted!';
        body = `Your booking has been accepted by ${worker.name}`;
        break;
      case 2: // Completed
        title = 'Work Completed!';
        body = `Your work has been completed by ${worker.name}`;
        break;
      case 3: // Rejected
        title = 'Booking Rejected';
        body = `Your booking has been rejected by ${worker.name}`;
        break;
      default:
        title = 'Booking Update';
        body = `Your booking status has been updated`;
    }

    if (userFcmToken) {
      const result = await sendNotification(userFcmToken, title, body, {
        booking_id: booking_id.toString(),
        status: status.toString(),
        worker_id: worker_id.toString(),
        user_id: user_id.toString()
      });

      res.json({
        success: result.success,
        message: result.success ? 'Booking notification sent successfully' : 'Failed to send booking notification',
        data: result
      });
    } else {
      res.json({
        success: false,
        message: 'Target user does not have FCM token registered'
      });
    }

  } catch (error) {
    console.error('Error sending booking notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending booking notification',
      error: error.message
    });
  }
});

// Booking Alert Endpoints for Real-time Worker Notifications

// Get pending alerts for a specific worker
app.get('/api/worker-alerts/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }

    console.log(`🔍 Checking alerts for worker: ${workerId}`);

    // Get pending bookings for this worker (status = 0 means pending)
    const [alerts] = await pool.execute(`
      SELECT 
        b.id,
        b.booking_id,
        b.worker_id,
        b.user_id,
        b.contact_number,
        b.work_location,
        b.booking_time,
        b.description,
        b.status,
        b.created_at,
        s.name as customer_name,
        s.mobile as customer_mobile
      FROM tbl_bookings b
      LEFT JOIN tbl_serviceseeker s ON b.user_id = s.id
      WHERE b.worker_id = ? AND b.status = 0
      ORDER BY b.created_at DESC
    `, [workerId]);

    console.log(`📊 Found ${alerts.length} pending alerts for worker ${workerId}`);

    res.json({
      success: true,
      data: {
        alerts: alerts,
        workerId: workerId,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching worker alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching worker alerts',
      error: error.message
    });
  }
});

// Accept booking alert
app.post('/api/accept-booking-alert', async (req, res) => {
  try {
    const { booking_id, worker_id, action } = req.body;
    
    if (!booking_id || !worker_id) {
      return res.status(400).json({
        success: false,
        message: 'booking_id and worker_id are required'
      });
    }

    console.log(`✅ Worker ${worker_id} accepting booking ${booking_id}`);

    // Find the booking record by booking_id and worker_id
    const [bookings] = await pool.execute(
      'SELECT id, booking_id, status FROM tbl_bookings WHERE booking_id = ? AND worker_id = ? AND status = 0',
      [booking_id, worker_id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or already processed'
      });
    }

    const booking = bookings[0];

    // Update this specific booking to accepted (status = 1)
    const [updateResult] = await pool.execute(
      'UPDATE tbl_bookings SET status = 1 WHERE id = ?',
      [booking.id]
    );

    if (updateResult.affectedRows > 0) {
      // Update all other bookings with the same booking_id to rejected (status = 3)
      const [updateOthersResult] = await pool.execute(
        'UPDATE tbl_bookings SET status = 4 WHERE booking_id = ? AND id != ? AND status = 0',
        [booking.booking_id, booking.id]
      );

      console.log(`📝 Updated ${updateOthersResult.affectedRows} other workers to rejected status`);

      res.json({
        success: true,
        message: 'Booking accepted successfully',
        data: {
          booking_id,
          worker_id,
          otherWorkersUpdated: updateOthersResult.affectedRows
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to accept booking'
      });
    }

  } catch (error) {
    console.error('❌ Error accepting booking alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting booking alert',
      error: error.message
    });
  }
});

// Reject booking alert
app.post('/api/reject-booking-alert', async (req, res) => {
  try {
    const { booking_id, worker_id, reason } = req.body;
    
    if (!booking_id || !worker_id) {
      return res.status(400).json({
        success: false,
        message: 'booking_id and worker_id are required'
      });
    }

    console.log(`❌ Worker ${worker_id} rejecting booking ${booking_id}`);

    // Find the booking record by booking_id and worker_id
    const [bookings] = await pool.execute(
      'SELECT id FROM tbl_bookings WHERE booking_id = ? AND worker_id = ? AND status = 0',
      [booking_id, worker_id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or already processed'
      });
    }

    const booking = bookings[0];

    // Update this booking to rejected (status = 4)
    const [updateResult] = await pool.execute(
      'UPDATE tbl_bookings SET status = 4 WHERE id = ?',
      [booking.id]
    );

    if (updateResult.affectedRows > 0) {
      res.json({
        success: true,
        message: 'Booking rejected successfully',
        data: {
          booking_id,
          worker_id,
          reason: reason || 'Worker rejected'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to reject booking'
      });
    }

  } catch (error) {
    console.error('❌ Error rejecting booking alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting booking alert',
      error: error.message
    });
  }
});

// Send manual alert to specific worker (for testing)
app.post('/api/send-manual-alert', async (req, res) => {
  try {
    const { worker_mobile, customer_name, customer_mobile, work_location, description, booking_time } = req.body;
    
    if (!worker_mobile || !customer_name || !work_location) {
      return res.status(400).json({
        success: false,
        message: 'worker_mobile, customer_name, and work_location are required'
      });
    }

    console.log(`📱 Sending manual alert to worker: ${worker_mobile}`);

    // Find worker by mobile number
    const [workers] = await pool.execute(
      'SELECT id, name FROM tbl_workers WHERE mobile = ?',
      [worker_mobile]
    );

    if (workers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found with this mobile number'
      });
    }

    const worker = workers[0];

    // Create a test booking entry
    const bookingId = `TEST-${Date.now()}`;
    const [insertResult] = await pool.execute(`
      INSERT INTO tbl_bookings (
        booking_id, worker_id, user_id, contact_number, work_location, 
        booking_time, status, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, NOW())
    `, [
      bookingId,
      worker.id,
      999, // Test user ID
      customer_mobile || '0000000000',
      work_location,
      booking_time || new Date().toISOString(),
      description || 'Test booking alert'
    ]);

    const [manualBookingRows] = await pool.execute(
      'SELECT work_location_lat, work_location_lng FROM tbl_bookings WHERE id = ? LIMIT 1',
      [insertResult.insertId]
    );
    const manualBookingLocation = manualBookingRows.length > 0 ? manualBookingRows[0] : {};

    // Also create a test user entry in serviceseeker table if not exists
    try {
      await pool.execute(`
        INSERT IGNORE INTO tbl_serviceseeker (id, name, mobile, email, type, created_at) 
        VALUES (999, ?, ?, 'test@test.com', 2, NOW())
      `, [customer_name, customer_mobile || '0000000000']);
    } catch (userError) {
      console.log('Test user already exists or creation failed:', userError.message);
    }

    // Send Firebase push notification to worker
    await sendBookingAlertNotification(worker.id, {
      booking_id: bookingId,
      customer_name,
      customer_mobile: customer_mobile || '0000000000',
      work_location,
      work_location_lat: manualBookingLocation.work_location_lat || null,
      work_location_lng: manualBookingLocation.work_location_lng || null,
      description: description || 'Test booking alert',
      booking_time: booking_time || new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Manual alert sent successfully with push notification',
      data: {
        booking_id: bookingId,
        worker_id: worker.id,
        worker_mobile,
        worker_name: worker.name
      }
    });

  } catch (error) {
    console.error('❌ Error sending manual alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending manual alert',
      error: error.message
    });
  }
});

app.get('/api/admin/bookings', async (req, res) => {
  try {
    const { canceled, rescheduled, cancelreq, reschedulereq } = req.query;

    let query;
    
    if (cancelreq === 'true') {
      // Cancel Requests: b.status = 5 AND c.status = 0 AND b.payment_status = 1 AND b.id = c.bookingid
      query = `
        SELECT 
          b.id,
          b.booking_id,
          b.worker_id,
          b.user_id,
          b.contact_number,
          b.work_location,
          b.booking_time,
          b.status,
          b.payment_status,
          b.created_at,
          b.description,
          w.name as worker_name,
          w.mobile as worker_mobile,
          s.name as customer_name,
          s.mobile as customer_mobile,
          c.type as canceled_by,
          c.cancel_reason,
          c.created_at as canceled_date,
          c.status as cancel_status
        FROM tbl_bookings b
        LEFT JOIN tbl_workers w ON b.worker_id = w.id
        LEFT JOIN tbl_serviceseeker s ON b.user_id = s.id
        INNER JOIN tbl_canceledbookings c ON (
          b.id = CAST(TRIM(c.bookingid) AS UNSIGNED) 
          OR b.booking_id = c.bookingid
        )
        WHERE b.status = 5 AND c.status = 0 AND b.payment_status = 1
        ORDER BY b.id DESC
      `;
      
      console.log('🔍 Fetching cancel requests (b.status=5 AND c.status=0 AND b.payment_status=1)');
    } else if (reschedulereq === 'true') {
      // Reschedule Requests: b.status = 6 AND r.status = 0 AND b.payment_status = 1 AND b.id = r.bookingid
      query = `
        SELECT 
          b.id,
          b.booking_id,
          b.worker_id,
          b.user_id,
          b.contact_number,
          b.work_location,
          b.booking_time,
          b.status,
          b.payment_status,
          b.created_at,
          b.description,
          w.name as worker_name,
          w.mobile as worker_mobile,
          s.name as customer_name,
          s.mobile as customer_mobile,
          r.type as rescheduled_by,
          r.reschedule_reason,
          r.created_at as reschedule_date,
          r.status as reschedule_status
        FROM tbl_bookings b
        LEFT JOIN tbl_workers w ON b.worker_id = w.id
        LEFT JOIN tbl_serviceseeker s ON b.user_id = s.id
        INNER JOIN tbl_rescheduledbookings r ON b.id = CAST(TRIM(r.bookingid) AS UNSIGNED)
        WHERE b.status = 6 AND r.status = 0 AND b.payment_status = 1
        ORDER BY b.id DESC
      `;
      
      console.log('🔍 Fetching reschedule requests (b.status=6 AND r.status=0 AND b.payment_status=1 AND b.id=r.bookingid)');
    } else if (canceled === 'true') {
      // Fetch canceled bookings: b.status = 5 AND b.payment_status = 1 AND c.status = 1 AND b.id = c.bookingid
      query = `
        SELECT 
          b.id,
          b.booking_id,
          b.worker_id,
          b.user_id,
          b.contact_number,
          b.work_location,
          b.booking_time,
          b.status,
          b.payment_status,
          b.created_at,
          b.description,
          w.name as worker_name,
          w.mobile as worker_mobile,
          s.name as customer_name,
          s.mobile as customer_mobile,
          c.type as canceled_by,
          c.cancel_reason,
          c.created_at as canceled_date
        FROM tbl_bookings b
        LEFT JOIN tbl_workers w ON b.worker_id = w.id
        LEFT JOIN tbl_serviceseeker s ON b.user_id = s.id
        INNER JOIN tbl_canceledbookings c ON (
          b.id = CAST(TRIM(c.bookingid) AS UNSIGNED) 
          OR b.booking_id = c.bookingid
        )
        WHERE b.status = 5 AND b.payment_status = 1 AND c.status = 1
        ORDER BY b.id DESC
      `;
      
      console.log('🔍 Fetching canceled bookings (b.status=5 AND b.payment_status=1 AND c.status=1 AND b.id=c.bookingid)');
    } else if (rescheduled === 'true') {
      // Fetch rescheduled bookings: b.status = 6 AND b.payment_status = 1 AND r.status = 1 AND b.id = r.bookingid
      query = `
        SELECT 
          b.id,
          b.booking_id,
          b.worker_id,
          b.user_id,
          b.contact_number,
          b.work_location,
          b.booking_time,
          b.status,
          b.payment_status,
          b.created_at,
          b.description,
          w.name as worker_name,
          w.mobile as worker_mobile,
          s.name as customer_name,
          s.mobile as customer_mobile,
          r.type as rescheduled_by,
          r.reschedule_reason,
          r.created_at as reschedule_date
        FROM tbl_bookings b
        LEFT JOIN tbl_workers w ON b.worker_id = w.id
        LEFT JOIN tbl_serviceseeker s ON b.user_id = s.id
        INNER JOIN tbl_rescheduledbookings r ON (
          b.id = CAST(TRIM(r.bookingid) AS UNSIGNED) 
          OR b.booking_id = r.bookingid
        )
        WHERE b.status = 6 AND b.payment_status = 1 AND r.status = 1
        ORDER BY b.id DESC
      `;
      
      console.log('🔍 Fetching rescheduled bookings (b.status=6 AND b.payment_status=1 AND r.status=1 AND b.id=r.bookingid)');
    } else {
      // Regular bookings query
      query = `
        SELECT 
          b.id,
          b.booking_id,
          b.worker_id,
          b.user_id,
          b.contact_number,
          b.work_location,
          b.booking_time,
          b.status,
          b.payment_status,
          b.created_at,
          b.description,
          w.name as worker_name,
          w.mobile as worker_mobile,
          s.name as customer_name,
          s.mobile as customer_mobile
        FROM tbl_bookings b
        LEFT JOIN tbl_workers w ON b.worker_id = w.id
        LEFT JOIN tbl_serviceseeker s ON b.user_id = s.id
        ORDER BY b.id DESC
      `;
    }

    const [bookings] = await pool.query(query);
    
    if (cancelreq === 'true') {
      console.log(`✅ Found ${bookings.length} cancel requests`);
    } else if (reschedulereq === 'true') {
      console.log(`✅ Found ${bookings.length} reschedule requests`);
    } else if (canceled === 'true') {
      console.log(`✅ Found ${bookings.length} canceled bookings`);
    } else if (rescheduled === 'true') {
      console.log(`✅ Found ${bookings.length} rescheduled bookings`);
    }

    res.json({
      success: true,
      bookings: bookings
    });

  } catch (error) {
    console.error('❌ Error fetching admin bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      error: error.message
    });
  }
});

// Admin Payments endpoint
app.get('/api/admin/payments', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.payment_id,
        p.amount,
        p.created_at as payment_date,
        b.booking_id
      FROM tbl_payments p
      INNER JOIN tbl_bookings b ON p.bookingid = b.id
      ORDER BY p.id DESC
    `;

    const [payments] = await pool.query(query);

    res.json({
      success: true,
      payments: payments
    });

  } catch (error) {
    console.error('❌ Error fetching admin payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
});

// Admin Customers endpoint
app.get('/api/admin/customers', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        mobile,
        email,
        pincode,
        address,
        mandal,
        city,
        district,
        state,
        country,
        created_at
      FROM tbl_serviceseeker
      ORDER BY id DESC
    `;

    const [customers] = await pool.query(query);

    res.json({
      success: true,
      customers: customers
    });

  } catch (error) {
    console.error('❌ Error fetching admin customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
});

app.get('/api/admin/workers', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        mobile,
        email,
        pincode,
        address,
        district,
        state,
        country,
        profile_image,
        status,
        created_at
      FROM tbl_workers
      ORDER BY id DESC
    `;

    const [workers] = await pool.query(query);

    // Add full image URLs
    const workersWithImages = workers.map(worker => ({
      ...worker,
      profile_image: worker.profile_image ? `/uploads/profiles/${worker.profile_image}` : null
    }));

    res.json({
      success: true,
      workers: workersWithImages
    });

  } catch (error) {
    console.error('❌ Error fetching admin workers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workers',
      error: error.message
    });
  }
});

// Update worker status for admin
app.patch('/api/admin/workers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === undefined || (status !== 0 && status !== 1)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be 0 or 1'
      });
    }

    const [result] = await pool.execute(
      'UPDATE tbl_workers SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    res.json({
      success: true,
      message: 'Worker status updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating worker status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update worker status',
      error: error.message
    });
  }
});

// Get single worker by ID for admin
app.get('/api/admin/workers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        w.id,
        w.name,
        w.mobile,
        w.email,
        w.price,
        w.skill_id,
        w.pincode,
        w.mandal,
        w.city,
        w.district,
        w.state,
        w.country,
        w.latitude,
        w.longitude,
        w.address,
        w.type,
        w.status,
        w.profile_image,
        w.document1,
        w.document2,
        w.created_at
      FROM tbl_workers w
      WHERE w.id = ?
    `;

    const [workers] = await pool.query(query, [id]);

    if (workers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Add full image URLs
    const worker = workers[0];
    if (worker.profile_image) {
      worker.profile_image = `/uploads/profiles/${worker.profile_image}`;
    }
    if (worker.document1) {
      worker.document1 = `/uploads/documents/${worker.document1}`;
    }
    if (worker.document2) {
      worker.document2 = `/uploads/documents/${worker.document2}`;
    }

    // Get category titles for multiple skill IDs
    if (worker.skill_id) {
      const skillIds = worker.skill_id.split(',').map(id => id.trim()).filter(id => id);
      
      if (skillIds.length > 0) {
        const placeholders = skillIds.map(() => '?').join(',');
        const categoryQuery = `
          SELECT title 
          FROM tbl_category 
          WHERE id IN (${placeholders})
        `;
        
        const [categories] = await pool.query(categoryQuery, skillIds);
        worker.category_title = categories.map(cat => cat.title).join(', ');
      } else {
        worker.category_title = null;
      }
    } else {
      worker.category_title = null;
    }

    res.json({
      success: true,
      worker: worker
    });

  } catch (error) {
    console.error('❌ Error fetching worker details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker details',
      error: error.message
    });
  }
});

// Get Quotes for admin
app.get('/api/admin/quotes', async (req, res) => {
try {
const query = `SELECT q.*,s.name FROM tbl_requestquote AS q LEFT JOIN tbl_serviceseeker AS S ON q.customer_id = s.id ORDER BY q.id DESC`;
const [quotes] = await pool.query(query);

res.json({
  success: true,
  quotes: quotes
});
} catch (error) {
   console.error('❌ Error fetching quotes:', error);
   res.status(500).json({
    success: false,
    message: 'failed to fetch quotes',
    error: error.message
   });
}
});

//get Categories for admin
app.get( '/api/admin/categories', async ( req, res ) => {
try {
  const query = `SELECT * FROM tbl_category ORDER BY id DESC`;
  const [categories] = await pool.query(query);

  res.json({
    success: true,
    categories: categories
  })

} catch ( error) {
console.error( '❌ Error fetching categories:', error );
res.status( 500 ).json({
success: false,
message: 'failed to fetch categories',
error: error.message
});
}
});

// Create Category for admin
app.post('/api/admin/categories', upload.single('categoryImage'), async (req, res) => {
  try {
    const { title, status, visibility } = req.body;
    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    if (!req.file) {
      console.error('❌ No file received in request');
      return res.status(400).json({
        success: false,
        message: 'Category image is required'
      });
    }

    // Validate status/visibility - should be 0 or 1
    const statusValue = status !== undefined ? parseInt(status) : (visibility !== undefined ? parseInt(visibility) : 1);
    if (statusValue !== 0 && statusValue !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Visibility status must be 0 or 1'
      });
    }

    // Store only filename in database (without path)
    const imageFileName = req.file.filename;

    // Insert into database - using both status and visibility to match table structure
    const query = `INSERT INTO tbl_category (title, image, status, visibility) VALUES (?, ?, ?, ?)`;
    const [result] = await pool.execute(query, [title.trim(), imageFileName, statusValue, statusValue]);

    res.json({
      success: true,
      message: 'Category created successfully',
      category: {
        id: result.insertId,
        title: title.trim(),
        image: imageFileName,
        status: statusValue,
        visibility: statusValue
      }
    });

  } catch (error) {
    console.error('❌ Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
});

// Update Category for admin
app.put('/api/admin/categories/:id', upload.single('categoryImage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status, visibility } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Validate status/visibility - should be 0 or 1
    const statusValue = status !== undefined ? parseInt(status) : (visibility !== undefined ? parseInt(visibility) : 1);
    if (statusValue !== 0 && statusValue !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Visibility status must be 0 or 1'
      });
    }

    // Check if category exists
    const [existingCategory] = await pool.execute('SELECT * FROM tbl_category WHERE id = ?', [id]);
    if (existingCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    let imageFileName = existingCategory[0].image;

    // If new image is uploaded, use it; otherwise keep existing
    if (req.file) {
      imageFileName = req.file.filename;
    }

    // Update database - preserve existing status if not provided, only update visibility if provided
    const existingStatus = existingCategory[0].status;
    const finalStatus = status !== undefined ? parseInt(status) : existingStatus;
    const finalVisibility = visibility !== undefined ? parseInt(visibility) : existingCategory[0].visibility;
    
    const query = `UPDATE tbl_category SET title = ?, image = ?, status = ?, visibility = ? WHERE id = ?`;
    await pool.execute(query, [title.trim(), imageFileName, finalStatus, finalVisibility, id]);

    res.json({
      success: true,
      message: 'Category updated successfully',
      category: {
        id: parseInt(id),
        title: title.trim(),
        image: imageFileName,
        status: statusValue,
        visibility: statusValue
      }
    });

  } catch (error) {
    console.error('❌ Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
});

// Delete category for admin (soft delete - update only status to 0)
app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const [existingCategory] = await pool.execute('SELECT * FROM tbl_category WHERE id = ?', [id]);
    if (existingCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Update only status to 0 (soft delete), keep other values unchanged
    const query = `UPDATE tbl_category SET status = 0 WHERE id = ?`;
    await pool.execute(query, [id]);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
});

// ============================================
// ANIMATIONS ENDPOINTS FOR ADMIN
// ============================================

// Get all animations for admin
app.get('/api/admin/animations', async (req, res) => {
  try {
    const query = `SELECT * FROM tbl_animations ORDER BY id DESC`;
    const [animations] = await pool.query(query);

    res.json({
      success: true,
      animations: animations
    });

  } catch (error) {
    console.error('❌ Error fetching animations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch animations',
      error: error.message
    });
  }
});

// Get active animation for Customer APP
app.get('/api/active-animation', async (req, res) => {
  try {
    const query = `SELECT * FROM tbl_animations WHERE status = 1 LIMIT 1`;
    const [animations] = await pool.query(query);

    if (animations.length > 0) {
      res.json({
        success: true,
        animation: animations[0]
      });
    } else {
      res.json({
        success: false,
        message: 'No active animation found'
      });
    }

  } catch (error) {
    console.error('❌ Error fetching active animation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active animation',
      error: error.message
    });
  }
});

// Create Animation for admin
app.post('/api/admin/animations', upload.single('animationVideo'), async (req, res) => {
  try {
    const { event_name, is_active } = req.body;
    
    // Validation
    if (!event_name || !event_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Event name is required'
      });
    }

    if (!req.file) {
      console.error('❌ No video file received in request');
      return res.status(400).json({
        success: false,
        message: 'Animation video is required'
      });
    }

    // Validate is_active - should be 0 or 1
    const statusValue = is_active !== undefined ? parseInt(is_active) : 0;
    if (statusValue !== 0 && statusValue !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Active status must be 0 or 1'
      });
    }

    // Store only filename in database (without path)
    const videoFileName = req.file.filename;
    // Insert into database - default status is 0 (inactive)
    const query = `INSERT INTO tbl_animations (name, video_title, status) VALUES (?, ?, ?)`;
    const [result] = await pool.execute(query, [event_name.trim(), videoFileName, statusValue]);

    res.json({
      success: true,
      message: 'Animation created successfully',
      animation: {
        id: result.insertId,
        event_name: event_name.trim(),
        animation_name: videoFileName,
        video_url: videoFileName,
        is_active: statusValue === 1
      }
    });

  } catch (error) {
    console.error('❌ Error creating animation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create animation',
      error: error.message
    });
  }
});

// Update Animation for admin
app.put('/api/admin/animations/:id', upload.single('animationVideo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { event_name, is_active } = req.body;

    // Validation
    if (!event_name || !event_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Event name is required'
      });
    }

    // Validate is_active - should be 0 or 1
    const statusValue = is_active !== undefined ? parseInt(is_active) : 1;
    if (statusValue !== 0 && statusValue !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Active status must be 0 or 1'
      });
    }

    // Check if animation exists
    const [existingAnimation] = await pool.execute('SELECT * FROM tbl_animations WHERE id = ?', [id]);
    if (existingAnimation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Animation not found'
      });
    }

    let videoFileName = existingAnimation[0].video_title;

    // If new video is uploaded, use it; otherwise keep existing
    if (req.file) {
      videoFileName = req.file.filename;
      
      // Optionally delete old video file
      try {
        const oldFilePath = path.join(__dirname, 'uploads', 'animations', existingAnimation[0].video_title);
        await fs.unlink(oldFilePath);
        console.log('🗑️ Deleted old video file:', existingAnimation[0].video_title);
      } catch (err) {
        console.log('⚠️ Could not delete old video file:', err.message);
      }
    }


    // If activating this animation (status = 1), first deactivate all others
    if (statusValue === 1) {
      await pool.execute('UPDATE tbl_animations SET status = 0 WHERE id != ?', [id]);
    }

    // Update database
    const query = `UPDATE tbl_animations SET name = ?, video_title = ?, status = ? WHERE id = ?`;
    await pool.execute(query, [event_name.trim(), videoFileName, statusValue, id]);

    res.json({
      success: true,
      message: 'Animation updated successfully',
      animation: {
        id: parseInt(id),
        event_name: event_name.trim(),
        animation_name: videoFileName,
        video_url: videoFileName,
        is_active: statusValue === 1
      }
    });

  } catch (error) {
    console.error('❌ Error updating animation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update animation',
      error: error.message
    });
  }
});

// Delete Animation for admin (hard delete - removes from database and file)
app.delete('/api/admin/animations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if animation exists
    const [existingAnimation] = await pool.execute('SELECT * FROM tbl_animations WHERE id = ?', [id]);
    if (existingAnimation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Animation not found'
      });
    }

    // Delete video file from uploads directory
    try {
      const filePath = path.join(__dirname, 'uploads', 'animations', existingAnimation[0].video_title);
      await fs.unlink(filePath);
      console.log('🗑️ Deleted video file:', existingAnimation[0].video_title);
    } catch (err) {
      console.log('⚠️ Could not delete video file:', err.message);
    }

    // Delete from database
    const query = `DELETE FROM tbl_animations WHERE id = ?`;
    await pool.execute(query, [id]);

    res.json({
      success: true,
      message: 'Animation deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting animation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete animation',
      error: error.message
    });
  }
});

//get SubCategories for admin
app.get('/api/admin/subcategories', async (req, res) => {
  try {
const query = `SELECT s.*,c.title FROM tbl_subcategory AS s LEFT JOIN tbl_category AS c ON s.category_id = c.id ORDER BY s.id DESC`;
const [subcategories] = await pool.query(query);

  res.json({
  success : true,
  subcategories : subcategories
  })

  } catch (error) {
    console.error('❌ Error fetching subcategories:', error);
    res.status(500).json({
      success: false,
      message: 'failed to fetch subcategories',
      error: error.message
    });
  }
});

// Create Subcategory for admin
app.post('/api/admin/subcategories', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, category_id, status, visibility } = req.body;
    
    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory name is required'
      });
    }

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    if (!req.files || !req.files['image']) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory image is required'
      });
    }

    // Validate status/visibility - should be 0 or 1
    const statusValue = status !== undefined ? parseInt(status) : (visibility !== undefined ? parseInt(visibility) : 1);
    if (statusValue !== 0 && statusValue !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Visibility status must be 0 or 1'
      });
    }

    // Store only filename in database (without path)
    const imageFileName = req.files['image'][0].filename;
    const videoFileName = req.files['video'] ? req.files['video'][0].filename : null;

    // Validate video size if uploaded (max 10MB)
    if (req.files['video']) {
      const videoSize = req.files['video'][0].size;
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (videoSize > maxSize) {
        return res.status(400).json({
          success: false,
          message: 'Video file size must be less than 10MB'
        });
      }
    }

    // Insert into database
    const query = `INSERT INTO tbl_subcategory (name, category_id, image, video_title, status, visibility) VALUES (?, ?, ?, ?, ?, ?)`;
    const [result] = await pool.execute(query, [name.trim(), category_id, imageFileName, videoFileName, statusValue, statusValue]);

    res.json({
      success: true,
      message: 'Subcategory created successfully',
      subcategory: {
        id: result.insertId,
        name: name.trim(),
        category_id: category_id,
        image: imageFileName,
        video_title: videoFileName,
        status: statusValue,
        visibility: statusValue
      }
    });

  } catch (error) {
    console.error('❌ Error creating subcategory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subcategory',
      error: error.message
    });
  }
});

// Update Subcategory for admin
app.put('/api/admin/subcategories/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, status, visibility } = req.body;
    
    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory name is required'
      });
    }

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    // Validate status/visibility - should be 0 or 1
    const statusValue = status !== undefined ? parseInt(status) : (visibility !== undefined ? parseInt(visibility) : 1);
    if (statusValue !== 0 && statusValue !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Visibility status must be 0 or 1'
      });
    }

    // Check if subcategory exists
    const [existingSubcategory] = await pool.execute('SELECT * FROM tbl_subcategory WHERE id = ?', [id]);
    if (existingSubcategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    let imageFileName = existingSubcategory[0].image;
    let videoFileName = existingSubcategory[0].video_title;

    // If new image is uploaded, use it; otherwise keep existing
    if (req.files && req.files['image']) {
      imageFileName = req.files['image'][0].filename;
    }

    // If new video is uploaded, use it; otherwise keep existing
    if (req.files && req.files['video']) {
      const videoSize = req.files['video'][0].size;
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (videoSize > maxSize) {
        return res.status(400).json({
          success: false,
          message: 'Video file size must be less than 10MB'
        });
      }
      videoFileName = req.files['video'][0].filename;
    }

    // Update database - preserve existing status if not provided, only update visibility if provided
    const existingStatus = existingSubcategory[0].status;
    const finalStatus = status !== undefined ? parseInt(status) : existingStatus;
    const finalVisibility = visibility !== undefined ? parseInt(visibility) : existingSubcategory[0].visibility;
    
    const query = `UPDATE tbl_subcategory SET name = ?, category_id = ?, image = ?, video_title = ?, status = ?, visibility = ? WHERE id = ?`;
    await pool.execute(query, [name.trim(), category_id, imageFileName, videoFileName, finalStatus, finalVisibility, id]);

    res.json({
      success: true,
      message: 'Subcategory updated successfully',
      subcategory: {
        id: parseInt(id),
        name: name.trim(),
        category_id: category_id,
        image: imageFileName,
        video_title: videoFileName,
        status: statusValue,
        visibility: statusValue
      }
    });

  } catch (error) {
    console.error('❌ Error updating subcategory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subcategory',
      error: error.message
    });
  }
});

// Delete Subcategory for admin (soft delete - update status to 0)
app.delete('/api/admin/subcategories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subcategory exists
    const [existingSubcategory] = await pool.execute('SELECT * FROM tbl_subcategory WHERE id = ?', [id]);
    if (existingSubcategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subcategory not found'
      });
    }

    // Update status to 0 (soft delete)
    const query = `UPDATE tbl_subcategory SET status = 0 WHERE id = ?`;
    await pool.execute(query, [id]);

    res.json({
      success: true,
      message: 'Subcategory deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting subcategory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subcategory',
      error: error.message
    });
  }
});

//get Services for admin
app.get('/api/admin/services', async (req, res) => {
  try {
    const query = `SELECT sv.*, ts.name as subcaregory_name, tc.title as category_name FROM tbl_services AS sv LEFT JOIN tbl_subcategory AS ts ON sv.subcategory_id = ts.id LEFT JOIN tbl_category AS tc ON ts.category_id = tc.id ORDER BY sv.id DESC`;
    const [services] =  await pool.query(query);

    res.json({
      success : true,
      services : services
    });

  } catch (error) {
    console.error('❌ Error fetching services:', error);
    res.status(500).json({
      success : false,
      message : 'failed to fetch services',
      error : error.message
    });
  }
});

// Create Service for admin
app.post('/api/admin/services', upload.single('image'), async (req, res) => {
  try {
    const { name, subcategory_id, price, rating, is_top_service, instant_service } = req.body;
    
    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required'
      });
    }

    if (!subcategory_id) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory is required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Service image is required'
      });
    }

    if (!price || isNaN(Number(price))) {
      return res.status(400).json({
        success: false,
        message: 'Valid price is required'
      });
    }

    if (!rating || isNaN(Number(rating))) {
      return res.status(400).json({
        success: false,
        message: 'Valid rating is required'
      });
    }

    // Store only filename in database (without path)
    const imageFileName = req.file.filename;

    // Parse values
    const priceValue = parseFloat(price);
    const ratingValue = parseFloat(rating);
    const isTopServiceValue = is_top_service ? parseInt(is_top_service) : 0;
    const instantServiceValue = instant_service ? parseInt(instant_service) : 0;

    // Insert into tbl_services
    const query = `INSERT INTO tbl_services (name, subcategory_id, image, price, rating, is_top_service, instant_service, status, visibility) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`;
    const [result] = await pool.execute(query, [
      name.trim(), 
      subcategory_id, 
      imageFileName, 
      priceValue, 
      ratingValue, 
      isTopServiceValue, 
      instantServiceValue
    ]);

    res.json({
      success: true,
      message: 'Service created successfully',
      service: {
        id: result.insertId,
        name: name.trim(),
        subcategory_id: subcategory_id,
        image: imageFileName,
        price: priceValue,
        rating: ratingValue,
        is_top_service: isTopServiceValue,
        instant_service: instantServiceValue,
        status: 1,
        visibility: 1
      }
    });

  } catch (error) {
    console.error('❌ Error creating service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service',
      error: error.message
    });
  }
});

// Update Service for admin
app.put('/api/admin/services/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subcategory_id, price, rating, is_top_service, instant_service, status, visibility } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Service name is required'
      });
    }

    if (!subcategory_id) {
      return res.status(400).json({
        success: false,
        message: 'Subcategory is required'
      });
    }

    if (!price || isNaN(Number(price))) {
      return res.status(400).json({
        success: false,
        message: 'Valid price is required'
      });
    }

    if (!rating || isNaN(Number(rating))) {
      return res.status(400).json({
        success: false,
        message: 'Valid rating is required'
      });
    }

    // Check if service exists
    const [existingService] = await pool.execute('SELECT * FROM tbl_services WHERE id = ?', [id]);
    if (existingService.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Parse values
    const priceValue = parseFloat(price);
    const ratingValue = parseFloat(rating);
    const isTopServiceValue = is_top_service ? parseInt(is_top_service) : 0;
    const instantServiceValue = instant_service ? parseInt(instant_service) : 0;
    const statusValue = status !== undefined ? parseInt(status) : 1;
    const visibilityValue = visibility !== undefined ? parseInt(visibility) : 1;

    // If image is uploaded, update with new image, otherwise keep existing
    let updateQuery;
    let values;

    if (req.file) {
      const imageFileName = req.file.filename;
      updateQuery = `UPDATE tbl_services SET name = ?, subcategory_id = ?, image = ?, price = ?, rating = ?, is_top_service = ?, instant_service = ?, status = ?, visibility = ? WHERE id = ?`;
      values = [name.trim(), subcategory_id, imageFileName, priceValue, ratingValue, isTopServiceValue, instantServiceValue, statusValue, visibilityValue, id];
    } else {
      updateQuery = `UPDATE tbl_services SET name = ?, subcategory_id = ?, price = ?, rating = ?, is_top_service = ?, instant_service = ?, status = ?, visibility = ? WHERE id = ?`;
      values = [name.trim(), subcategory_id, priceValue, ratingValue, isTopServiceValue, instantServiceValue, statusValue, visibilityValue, id];
    }

    await pool.execute(updateQuery, values);

    res.json({
      success: true,
      message: 'Service updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service',
      error: error.message
    });
  }
});

// Delete (Deactivate) Service for admin
app.delete('/api/admin/services/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if service exists
    const [existingService] = await pool.execute('SELECT * FROM tbl_services WHERE id = ?', [id]);
    if (existingService.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Set status and visibility to 0 (inactive) instead of actually deleting
    await pool.execute('UPDATE tbl_services SET status = 0, visibility = 0 WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Service deactivated successfully'
    });

  } catch (error) {
    console.error('❌ Error deactivating service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate service',
      error: error.message
    });
  }
});

//get Deals for admin
app.get('/api/admin/deals', async (req, res) => {
  try {
    const query = `SELECT d.*, s.name as service_name 
                   FROM tbl_deals AS d 
                   LEFT JOIN tbl_services AS s ON d.service_id = s.id 
                   ORDER BY d.id DESC`;
    const [deals] = await pool.query(query);

    res.json({
      success: true,
      deals: deals
    });

  } catch (error) {
    console.error('❌ Error fetching deals:', error);
    res.status(500).json({
      success: false,
      message: 'failed to fetch deals',
      error: error.message
    });
  }
});

//get Reviews and Ratings for admin
app.get('/api/admin/reviews-ratings', async (req, res) => {
  try {
    const query = `
      SELECT 
        b.booking_id,
        s.name AS customer_name,
        w.name AS worker_name,
        b.description AS booking_for,
        cr.rating,
        cr.description AS review,
        cr.created_at
      FROM tbl_customerratings cr
      INNER JOIN tbl_bookings b ON cr.bookingid = b.id
      INNER JOIN tbl_workers w ON b.worker_id = w.id
      INNER JOIN tbl_serviceseeker s ON b.user_id = s.id
      ORDER BY cr.id DESC
    `;
    const [reviews] = await pool.query(query);

    res.json({
      success: true,
      reviews: reviews
    });

  } catch (error) {
    console.error('❌ Error fetching reviews and ratings:', error);
    res.status(500).json({
      success: false,
      message: 'failed to fetch reviews and ratings',
      error: error.message
    });
  }
});

// Create Deal for admin
app.post('/api/admin/deals', async (req, res) => {
  try {
    const { service_id, original_price, deal_price, discount, is_active } = req.body;
    
    // Validation
    if (!service_id) {
      return res.status(400).json({
        success: false,
        message: 'Service ID is required'
      });
    }

    if (!original_price || isNaN(Number(original_price))) {
      return res.status(400).json({
        success: false,
        message: 'Valid original price is required'
      });
    }

    if (!deal_price || isNaN(Number(deal_price))) {
      return res.status(400).json({
        success: false,
        message: 'Valid deal price is required'
      });
    }

    if (!discount) {
      return res.status(400).json({
        success: false,
        message: 'Discount is required'
      });
    }

    const isActiveValue = is_active !== undefined ? parseInt(is_active) : 1;
    const originalPriceValue = parseFloat(original_price);
    const dealPriceValue = parseFloat(deal_price);

    // Insert into database
    const query = `INSERT INTO tbl_deals (service_id, original_price, deal_price, discount, is_active) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await pool.execute(query, [service_id, originalPriceValue, dealPriceValue, discount, isActiveValue]);

    res.json({
      success: true,
      message: 'Deal created successfully',
      deal: {
        id: result.insertId,
        service_id: service_id,
        original_price: originalPriceValue,
        deal_price: dealPriceValue,
        discount: discount,
        is_active: isActiveValue
      }
    });

  } catch (error) {
    console.error('❌ Error creating deal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create deal',
      error: error.message
    });
  }
});

// Update Deal for admin
app.put('/api/admin/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { service_id, original_price, deal_price, discount, is_active } = req.body;

    // Check if deal exists
    const [existingDeal] = await pool.execute('SELECT * FROM tbl_deals WHERE id = ?', [id]);
    if (existingDeal.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (service_id !== undefined) {
      updates.push('service_id = ?');
      values.push(service_id);
    }

    if (original_price !== undefined) {
      updates.push('original_price = ?');
      values.push(parseFloat(original_price));
    }

    if (deal_price !== undefined) {
      updates.push('deal_price = ?');
      values.push(parseFloat(deal_price));
    }

    if (discount !== undefined) {
      updates.push('discount = ?');
      values.push(discount);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(parseInt(is_active));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(id);
    const query = `UPDATE tbl_deals SET ${updates.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);

    res.json({
      success: true,
      message: 'Deal updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating deal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update deal',
      error: error.message
    });
  }
});

// Delete Deal for admin
app.delete('/api/admin/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if deal exists
    const [existingDeal] = await pool.execute('SELECT * FROM tbl_deals WHERE id = ?', [id]);
    if (existingDeal.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deal not found'
      });
    }

    // Actually delete the deal (not soft delete)
    await pool.execute('DELETE FROM tbl_deals WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Deal deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting deal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete deal',
      error: error.message
    });
  }
});

// 404 handler - THIS MUST BE LAST!
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Periodic notification function for all workers
const startPeriodicNotifications = async () => {
  console.log('🚀 Starting periodic notifications every 3 seconds...');
  console.log('📱 Make sure your device is ready!');
  console.log('👥 Will notify all workers with pending bookings (status = 0)');
  
  let count = 0;
  
  const sendPeriodicNotification = async () => {
    try {
      count++;
      console.log(`\n🔄 Periodic notification #${count}`);
      console.log(`⏰ ${new Date().toLocaleTimeString()}`);
      console.log('================================');
      
      // Get all pending bookings for all workers
      const [bookings] = await pool.execute(`
        SELECT 
          b.*,
          w.mobile as worker_mobile,
          w.name as worker_name
        FROM tbl_bookings b
        LEFT JOIN tbl_workers w ON b.worker_id = w.id
        WHERE b.status = 0
        ORDER BY b.id DESC
      `);

      if (bookings.length === 0) {
        console.log('❌ No pending bookings found for any worker');
        return;
      }

      // Send notifications for all pending bookings
      for (const booking of bookings) {
        console.log(`📋 Found booking: ${booking.booking_id}`);
        console.log(`   Worker: ${booking.worker_name} (${booking.worker_mobile}) - ID: ${booking.worker_id}`);
        console.log(`   Location: ${booking.work_location}`);
        
        // Get customer name from tbl_serviceseeker table
        const [customers] = await pool.execute(
          'SELECT name, mobile FROM tbl_serviceseeker WHERE id = ?',
          [booking.user_id]
        );
        
        const customer = customers.length > 0 ? customers[0] : { name: 'Customer', mobile: booking.contact_number || 'N/A' };
        
        // Prepare booking data
        const bookingData = {
          booking_id: booking.booking_id,
          customer_name: customer.name || 'Customer',
          customer_mobile: booking.contact_number || 'N/A',  // Always use contact_number from booking
          work_location: booking.work_location || 'Location not specified',
          work_location_lat: booking.work_location_lat || null,
          work_location_lng: booking.work_location_lng || null,
          description: booking.description || 'Service request',
          booking_time: booking.booking_time ? new Date(booking.booking_time).toISOString() : new Date().toISOString(),
          work_type: 'Service Request'
        };
        
        // Send notification using the existing function
        const result = await sendBookingAlertNotification(booking.worker_id, bookingData);
        
        if (result.success) {
          console.log(`✅ Notification sent successfully to worker ${booking.worker_id}!`);
        } else {
          console.log(`❌ Failed to send notification to worker ${booking.worker_id}: ${result.error}`);
        }
        console.log('---');
      }
      
      console.log('================================');
      
    } catch (error) {
      console.error('❌ Error in periodic notification:', error);
    }
  };
  
  // Send first notification immediately
  await sendPeriodicNotification();
  
  // Set up interval for every 3 seconds
  setInterval(sendPeriodicNotification, 3000);
};

// Initialize server
const startServer = async () => {
  await createUploadsDir();
  await testConnection();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OriginX Backend Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Register API: http://localhost:${PORT}/api/register-professional`);
    console.log(`📱 For physical devices, use your computer's IP address:`);
    console.log(`   Example: http://192.168.1.100:${PORT}/api/health`);
    console.log(`   Run 'node scripts/find-ip.js' to find your IP address`);
    
    // Start periodic notifications after server starts
    setTimeout(() => {
      startPeriodicNotifications();
    }, 2000); // Wait 2 seconds after server starts
  });
};

startServer().catch(console.error);

module.exports = app;