// server.js – FINAL PRODUCTION BACKEND (v13)
// OpenRouter streaming, Gemini fallback, MongoDB Atlas, Cloudinary, all CRUD
// Updated system prompt to ensure academic question answering

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const xss = require('xss');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const crypto = require('crypto');

// ---------- ENVIRONMENT VARIABLES ----------
const {
  MONGODB_URI,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  JWT_SECRET,
  GEMINI_API_KEY,
  OPENROUTER_API_KEY,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  PORT = 3000
} = process.env;

// ---------- CLOUDINARY ----------
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

// ---------- GEMINI ----------
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ---------- EXPRESS ----------
const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: 'Too many requests, please try again later.'
});
app.use(globalLimiter);

// ---------- MONGOOSE ----------
let cachedDb = null;
async function connectDB() {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  const conn = await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  });
  cachedDb = conn;
  console.log('MongoDB connected');
  return conn;
}

// ======================== DATABASE MODELS ========================

const inquirySchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
  createdAt: { type: Date, default: Date.now }
});
inquirySchema.index({ status: 1, createdAt: -1 });
const Inquiry = mongoose.model('Inquiry', inquirySchema);

const aiLeadSchema = new mongoose.Schema({
  firstName: String,
  class: String,
  interest: String,
  phone: String,
  city: String,
  parentName: String,
  email: String,
  aiSummary: String,
  leadScore: { type: Number, min: 0, max: 100 },
  status: { type: String, enum: ['pending', 'contacted', 'converted'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
aiLeadSchema.index({ status: 1, leadScore: -1 });
const AILead = mongoose.model('AILead', aiLeadSchema);

const aiQuestionSchema = new mongoose.Schema({
  type: { type: String, enum: ['text', 'image', 'pdf'], required: true },
  question: String,
  answer: String,
  createdAt: { type: Date, default: Date.now }
});
const AIQuestion = mongoose.model('AIQuestion', aiQuestionSchema);

const resultCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  mode: { type: String, enum: ['pdf', 'builder'], default: 'builder' },
  fields: [{
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'date', 'textarea'], default: 'text' },
    required: { type: Boolean, default: false },
    showOnMarksheet: { type: Boolean, default: true }
  }],
  createdAt: { type: Date, default: Date.now }
});
const ResultCategory = mongoose.model('ResultCategory', resultCategorySchema);

const resultSchema = new mongoose.Schema({
  registrationNumber: { type: String, required: true, unique: true },
  resultPasswordHash: { type: String, default: '' },
  studentName: { type: String, required: true },
  fatherName: { type: String, default: '' },
  motherName: { type: String, default: '' },
  dob: { type: Date, required: true },
  mobile: { type: String, default: '' },
  className: { type: String, default: '' },
  rollNumber: { type: String, default: '' },
  session: { type: String, default: '' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResultCategory', default: null },
  categoryName: { type: String, default: 'General Result' },
  resultMode: { type: String, enum: ['builder', 'pdf'], default: 'builder' },
  studentImageUrl: { type: String, default: '' },
  pdfUrl: { type: String, default: '' },
  pdfOriginalName: { type: String, default: '' },
  subjects: [{
    subject: String,
    marksObtained: Number,
    maxMarks: Number,
    grade: String
  }],
  marksObtained: { type: Number, default: null },
  totalMarks: { type: Number, default: null },
  percentage: { type: Number, default: null },
  grade: { type: String, default: '' },
  remarks: { type: String, default: '' },
  customFields: { type: Map, of: String, default: {} },
  published: { type: Boolean, default: false },
  accessKey: { type: String, default: () => crypto.randomBytes(18).toString('hex') },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
resultSchema.index({ registrationNumber: 1 });
const Result = mongoose.model('Result', resultSchema);

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  image: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const Event = mongoose.model('Event', eventSchema);

const gallerySchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  caption: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const Gallery = mongoose.model('Gallery', gallerySchema);

const programSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  features: [String],
  image: { type: String, default: '' }
});
const Program = mongoose.model('Program', programSchema);

// ======================== MIDDLEWARES ========================

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' }
});

function adminAuth(req, res, next) {
  const token = req.cookies?.admin_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') throw new Error();
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function sanitize(obj) {
  for (let key in obj) {
    if (typeof obj[key] === 'string') obj[key] = xss(obj[key]);
  }
  return obj;
}

const forbiddenPatterns = [/system:/i, /ignore previous/i, /pretend/i, /bypass/i];
function filterPrompt(text) {
  let filtered = text;
  forbiddenPatterns.forEach(p => (filtered = filtered.replace(p, '')));
  return filtered;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  }
});

async function uploadToCloudinary(buffer, folder = 'sankalp') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

const resultUpload = upload.fields([
  { name: 'studentImage', maxCount: 1 },
  { name: 'resultPdf', maxCount: 1 }
]);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slugifyFieldKey(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `field_${Date.now()}`;
}

function parseJsonInput(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

function parseBoolean(value) {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanSubjectRows(subjects) {
  return (Array.isArray(subjects) ? subjects : [])
    .map(item => ({
      subject: String(item.subject || '').trim(),
      marksObtained: parseNumber(item.marksObtained),
      maxMarks: parseNumber(item.maxMarks),
      grade: String(item.grade || '').trim()
    }))
    .filter(item => item.subject);
}

function calculateResultSummary(data) {
  const subjects = cleanSubjectRows(data.subjects);
  const subjectObtained = subjects.reduce((sum, item) => sum + (Number(item.marksObtained) || 0), 0);
  const subjectTotal = subjects.reduce((sum, item) => sum + (Number(item.maxMarks) || 0), 0);
  const marksObtained = parseNumber(data.marksObtained) ?? (subjectTotal ? subjectObtained : null);
  const totalMarks = parseNumber(data.totalMarks) ?? (subjectTotal || null);
  const percentage = parseNumber(data.percentage) ?? (totalMarks ? Number(((marksObtained / totalMarks) * 100).toFixed(2)) : null);
  return { subjects, marksObtained, totalMarks, percentage };
}

function normalizeCategoryFields(fields) {
  return (Array.isArray(fields) ? fields : [])
    .map(field => {
      const label = String(field.label || field.key || '').trim();
      if (!label) return null;
      return {
        key: slugifyFieldKey(field.key || label),
        label,
        type: ['text', 'number', 'date', 'textarea'].includes(field.type) ? field.type : 'text',
        required: parseBoolean(field.required),
        showOnMarksheet: field.showOnMarksheet === undefined ? true : parseBoolean(field.showOnMarksheet)
      };
    })
    .filter(Boolean);
}

function normalizeCategoryMode(value) {
  return value === 'pdf' ? 'pdf' : 'builder';
}

function firstFieldValue(customFields, keys) {
  for (const key of keys) {
    const value = customFields?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function createGeneratedRegistrationNumber(studentName, dob) {
  const namePart = String(studentName || 'student')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8) || 'STUDENT';
  const datePart = String(dob || '')
    .replace(/[^0-9]/g, '')
    .slice(0, 8) || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `SDP-${datePart}-${namePart}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function publicResult(result) {
  const obj = result.toObject ? result.toObject() : { ...result };
  delete obj.resultPasswordHash;
  obj.studentId = obj.registrationNumber;
  obj.downloadUrl = `/api/result/download/${obj._id}?key=${obj.accessKey}`;
  obj.viewUrl = `/api/result/view/${obj._id}?key=${obj.accessKey}`;
  delete obj.accessKey;
  return obj;
}

function pdfText(value) {
  return String(value ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapePdf(value) {
  return pdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildMarksheetPdf(resultDoc) {
  const result = resultDoc.toObject ? resultDoc.toObject() : resultDoc;
  const lines = [];
  const add = (text, x, y, size = 10, bold = false, color = '0 0 0') => {
    lines.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg ${x} ${y} Td (${escapePdf(text)}) Tj ET`);
  };
  const line = (x1, y1, x2, y2, width = 0.8, color = '0.70 0.82 0.88') => {
    lines.push(`q ${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`);
  };
  const rect = (x, y, w, h, color = '0.93 0.98 1') => {
    lines.push(`q ${color} rg ${x} ${y} ${w} ${h} re f Q`);
  };
  const wrap = (text, max = 78) => {
    const words = pdfText(text).split(' ');
    const rows = [];
    let row = '';
    words.forEach(word => {
      if (`${row} ${word}`.trim().length > max) {
        if (row) rows.push(row);
        row = word;
      } else {
        row = `${row} ${word}`.trim();
      }
    });
    if (row) rows.push(row);
    return rows.length ? rows : [''];
  };

  rect(34, 744, 527, 62);
  add('SANKALP DIGITAL PATHSHALA', 50, 782, 20, true, '0 0.45 0.65');
  add(result.categoryName || 'Academic Result', 50, 762, 12, true, '0.02 0.11 0.21');
  add('Verified Academic Marksheet', 390, 762, 10, true, '0 0.55 0.35');
  line(34, 735, 561, 735, 1.2, '0 0.68 0.93');

  const summary = calculateResultSummary(result);
  const left = [
    ['Student ID', result.registrationNumber],
    ['Student Name', result.studentName],
    ["Father's Name", result.fatherName],
    ["Mother's Name", result.motherName],
    ['Date of Birth', result.dob ? new Date(result.dob).toLocaleDateString('en-IN') : ''],
    ['Mobile', result.mobile]
  ];
  const right = [
    ['Class', result.className],
    ['Roll No', result.rollNumber],
    ['Session', result.session],
    ['Category', result.categoryName],
    ['Issue Date', new Date(result.updatedAt || result.createdAt || Date.now()).toLocaleDateString('en-IN')],
    ['Status', result.published ? 'Published' : 'Draft']
  ];

  let y = 710;
  add('Student Details', 50, y, 13, true, '0.02 0.11 0.21');
  y -= 20;
  for (let index = 0; index < left.length; index += 1) {
    add(`${left[index][0]}:`, 50, y, 9, true, '0.22 0.32 0.42');
    add(left[index][1] || '-', 142, y, 9);
    add(`${right[index][0]}:`, 320, y, 9, true, '0.22 0.32 0.42');
    add(right[index][1] || '-', 405, y, 9);
    y -= 18;
  }

  const customFields = result.customFields ? Object.fromEntries(Object.entries(result.customFields)) : {};
  const visibleCustomFields = Object.entries(customFields).filter(([, value]) => value);
  if (visibleCustomFields.length) {
    y -= 6;
    add('Additional Details', 50, y, 12, true, '0.02 0.11 0.21');
    y -= 18;
    visibleCustomFields.slice(0, 8).forEach(([key, value]) => {
      add(`${key.replace(/_/g, ' ')}:`, 50, y, 9, true, '0.22 0.32 0.42');
      add(value, 160, y, 9);
      y -= 16;
    });
  }

  if (summary.subjects.length) {
    y -= 14;
    add('Subject Performance', 50, y, 12, true, '0.02 0.11 0.21');
    y -= 20;
    rect(50, y - 4, 495, 22, '0.90 0.97 1');
    add('Subject', 62, y + 3, 9, true);
    add('Marks', 330, y + 3, 9, true);
    add('Max', 410, y + 3, 9, true);
    add('Grade', 480, y + 3, 9, true);
    y -= 20;
    summary.subjects.slice(0, 12).forEach(subject => {
      line(50, y - 5, 545, y - 5);
      add(subject.subject, 62, y, 9);
      add(subject.marksObtained ?? '-', 335, y, 9);
      add(subject.maxMarks ?? '-', 415, y, 9);
      add(subject.grade || '-', 485, y, 9);
      y -= 18;
    });
  }

  y -= 12;
  rect(50, y - 18, 495, 42, '0.96 0.98 0.99');
  add('Total', 70, y + 5, 10, true);
  add(`${summary.marksObtained ?? '-'} / ${summary.totalMarks ?? '-'}`, 125, y + 5, 11, true, '0 0.45 0.65');
  add('Percentage', 245, y + 5, 10, true);
  add(summary.percentage !== null ? `${summary.percentage}%` : '-', 335, y + 5, 11, true, '0 0.45 0.65');
  add('Grade', 430, y + 5, 10, true);
  add(result.grade || '-', 485, y + 5, 11, true, '0.02 0.11 0.21');
  y -= 46;

  add('Remarks', 50, y, 11, true);
  wrap(result.remarks || 'Keep learning with discipline and confidence.', 92).slice(0, 3).forEach(row => {
    y -= 15;
    add(row, 50, y, 9);
  });

  line(50, 88, 545, 88, 0.8);
  add('This is a digitally generated result from Sankalp Digital Pathshala.', 50, 68, 8, false, '0.35 0.45 0.55');
  add(`Generated on ${new Date().toLocaleString('en-IN')}`, 50, 54, 8, false, '0.35 0.45 0.55');
  add('Authorized Signatory', 432, 54, 9, true, '0.02 0.11 0.21');

  const stream = lines.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

async function sendResultPdf(res, result, disposition = 'attachment') {
  const filename = `Sankalp-Result-${result.registrationNumber}.pdf`;
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  if (result.resultMode === 'pdf' && result.pdfUrl) {
    try {
      const remote = await fetch(result.pdfUrl);
      if (!remote.ok) throw new Error('Could not fetch PDF');
      const buffer = Buffer.from(await remote.arrayBuffer());
      res.setHeader('Content-Type', remote.headers.get('content-type') || 'application/pdf');
      return res.send(buffer);
    } catch (err) {
      return res.redirect(result.pdfUrl);
    }
  }
  res.setHeader('Content-Type', 'application/pdf');
  return res.send(buildMarksheetPdf(result));
}

async function buildResultData(body, files = {}, existing = null) {
  const subjectsInput = parseJsonInput(body.subjects, []);
  const customFieldsInput = parseJsonInput(body.customFields, {});
  const customFields = customFieldsInput && typeof customFieldsInput === 'object' ? customFieldsInput : {};
  const nameFromFields = firstFieldValue(customFields, ['name', 'student_name', 'student', 'candidate_name']);
  const summary = calculateResultSummary({
    subjects: subjectsInput,
    marksObtained: body.marksObtained,
    totalMarks: body.totalMarks,
    percentage: body.percentage
  });
  const data = {
    registrationNumber: String(body.registrationNumber || body.studentId || existing?.registrationNumber || '').trim(),
    studentName: String(body.studentName || nameFromFields || '').trim(),
    fatherName: String(body.fatherName || firstFieldValue(customFields, ['father_name', 'fathers_name', 'father_s_name']) || '').trim(),
    motherName: String(body.motherName || firstFieldValue(customFields, ['mother_name', 'mothers_name', 'mother_s_name']) || '').trim(),
    dob: body.dob ? new Date(body.dob) : undefined,
    mobile: String(body.mobile || firstFieldValue(customFields, ['mobile', 'mobile_number', 'phone']) || '').trim(),
    className: String(body.className || body.class || firstFieldValue(customFields, ['class', 'class_name']) || '').trim(),
    rollNumber: String(body.rollNumber || firstFieldValue(customFields, ['roll_no', 'roll_number']) || '').trim(),
    session: String(body.session || firstFieldValue(customFields, ['session', 'academic_session']) || '').trim(),
    categoryName: String(body.categoryName || 'General Result').trim(),
    resultMode: normalizeCategoryMode(body.resultMode),
    pdfUrl: String(body.pdfUrl || existing?.pdfUrl || '').trim(),
    pdfOriginalName: existing?.pdfOriginalName || '',
    studentImageUrl: String(body.studentImageUrl || existing?.studentImageUrl || '').trim(),
    subjects: summary.subjects,
    marksObtained: summary.marksObtained,
    totalMarks: summary.totalMarks,
    percentage: summary.percentage,
    grade: String(body.grade || '').trim(),
    remarks: String(body.remarks || '').trim(),
    customFields,
    published: parseBoolean(body.published),
    updatedAt: new Date()
  };

  if (body.categoryId) {
    const category = await ResultCategory.findById(body.categoryId);
    if (category) {
      data.categoryId = category._id;
      data.categoryName = category.name;
      data.resultMode = normalizeCategoryMode(category.mode);
    }
  }

  if (!data.registrationNumber) {
    data.registrationNumber = createGeneratedRegistrationNumber(data.studentName, body.dob);
  }

  if (files.studentImage?.[0]) {
    data.studentImageUrl = await uploadToCloudinary(files.studentImage[0].buffer, 'sankalp/results/students');
  }
  if (files.resultPdf?.[0]) {
    data.pdfUrl = await uploadToCloudinary(files.resultPdf[0].buffer, 'sankalp/results/pdfs');
    data.pdfOriginalName = files.resultPdf[0].originalname;
    data.resultMode = 'pdf';
  }
  if (body.password) {
    data.resultPasswordHash = await bcrypt.hash(String(body.password), 10);
  }
  return data;
}

// ======================== VALIDATION SCHEMAS ========================

const contactSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  mobile: z.string().regex(/^[0-9+\- ]{7,15}$/),
  subject: z.string().min(2).max(200),
  message: z.string().min(5).max(2000)
});

const resultCheckSchema = z.object({
  studentId: z.string().min(1).max(40).optional(),
  password: z.string().min(1).max(100).optional(),
  registrationNumber: z.string().min(1).max(40).optional(),
  studentName: z.string().min(1).max(120).optional(),
  categoryId: z.string().min(1).max(80).optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
}).refine(data => (data.studentId || data.registrationNumber || data.studentName) && (data.password || data.dob), {
  message: 'Student name or ID and DOB are required.'
});

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// ======================== UPDATED SYSTEM PROMPT ========================

const SYSTEM_PROMPT = `You are Sankalp Sathi, a friendly and warm AI academic mentor for Sankalp Digital Pathshala, run by Sankalp Shiksha Foundation. Your job is to help students learn. You can answer any academic question, explain concepts, solve problems, and provide study tips. You also know about the foundation, its mission, courses, and admission process. When a user asks an academic question, focus on giving a clear, step‑by‑step explanation. When a user asks about the foundation or admissions, share relevant information.

ABOUT THE FOUNDATION:
Sankalp Shiksha Foundation's mission is "हमारा संकल्प, सामाजिक उत्थान व कायाकल्प" (Our Pledge: Social Upliftment and Transformation). It works to close the digital divide between villages and cities. It was founded on November 18, 2020, and is headquartered in Gorakhpur, Uttar Pradesh. The learning center, Sankalp Digital Pathshala, is in Salemgarh, Tamkuhi, Kushinagar. Founders: Abhishek Kumar (B.Tech from NIT, engineer) and Vikas Kumar (B.Tech CSE from NIT Hamirpur, technical lead). They started the Pathshala to provide digital education, job‑ready skills, and holistic community upliftment. Milestones include starting as COVID‑19 relief in 2020, launching the first digital classroom in 2021, AI & Robotics Labs in 2022, Rojgaar Buddy skilling program in 2023, Doordarshan recognition in 2024, 312+ trainees and 40+ placements in 2025, and expanding to neighboring districts in 2026. The Rojgaar Buddy program trains rural youth in Web Development, Graphic Design, Excel, Digital Marketing, and Communication. Community programs include cleanliness drives, road safety rallies, flood relief, and more.

CONTACT: info@sankalppathshala.com, +91 8055698328. Donate at sankalpshiksha.com/donate.

AI DEVELOPER: This AI assistant was developed by NexGenAiTech, founded by Jahid, specializing in AI and full‑stack development. Website: https://nexgenaitech.online. Contact Jahid at +91 8055698328.

RESPONSE RULES (STRICT):
- Use only plain paragraphs. Do not use markdown, bold, italics, headings, tables, lists, or code blocks.
- Write naturally like you are talking to a friend. Use simple, clear sentences.
- Break information into short paragraphs (2‑4 sentences each). Use a blank line between paragraphs.
- Always answer in the same language the user uses: Hindi, English, or Hinglish.
- When someone asks for admission or course help, gently collect: name, class, interest, phone, city, parent name, email. Then tell them our team will contact them soon.
- If you don't know something, say so honestly and suggest contacting the support team.`;

// ======================== ROUTES ========================

// ---------- AI QUESTION SOLVER (Gemini) ----------
app.post('/api/solve-question', upload.single('file'), async (req, res) => {
  try {
    const { type, question } = req.body;
    if (!type || !['text', 'image', 'pdf'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be text, image, or pdf.' });
    }
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const basePrompt = 'You are a helpful academic tutor. Provide a detailed step-by-step explanation. Answer in the same language as the question.';
    const filteredQuestion = question ? filterPrompt(xss(question)) : '';

    let result;
    if (type === 'text') {
      if (!filteredQuestion) return res.status(400).json({ error: 'Question text required.' });
      result = await model.generateContent(`${basePrompt}\n\nQuestion: ${filteredQuestion}`);
    } else if (type === 'image') {
      if (!req.file) return res.status(400).json({ error: 'Image file required.' });
      const imagePart = {
        inlineData: {
          data: req.file.buffer.toString('base64'),
          mimeType: req.file.mimetype
        }
      };
      result = await model.generateContent([`${basePrompt}\n\nQuestion about the uploaded image: ${filteredQuestion || 'Explain and solve what is shown in the image.'}`, imagePart]);
    } else if (type === 'pdf') {
      if (!req.file) return res.status(400).json({ error: 'PDF file required.' });
      const pdfPart = {
        inlineData: {
          data: req.file.buffer.toString('base64'),
          mimeType: 'application/pdf'
        }
      };
      result = await model.generateContent([`${basePrompt}\n\nQuestion about the uploaded PDF: ${filteredQuestion || 'Read the PDF and explain the important answer clearly.'}`, pdfPart]);
    }

    const response = await result.response;
    const answer = response.text();

    connectDB()
      .then(() => new AIQuestion({
        type,
        question: type === 'text' ? question : (question || `[${type} upload]`),
        answer
      }).save())
      .catch(err => console.warn('AI question log skipped:', err.message));

    res.json({ success: true, answer });
  } catch (err) {
    console.error('AI Solver Error:', err);
    res.status(500).json({ error: 'AI processing failed.' });
  }
});

// ---------- STREAMING CHATBOT (OpenRouter with Gemini fallback) ----------
app.post('/api/chat', async (req, res) => {
  try {
    let { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required.' });
    message = filterPrompt(xss(message));

    const geminiFallback = async () => {
      if (!GEMINI_API_KEY) return 'AI keys are not configured. Please contact the Sankalp team.';
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUser: ${message}`);
      const reply = (await result.response).text();
      return reply.replace(/\*\*|__/g, '').replace(/\*/g, '').replace(/#/g, '');
    };

    // If no OpenRouter key, fallback to Gemini non-streaming
    if (!OPENROUTER_API_KEY) {
      return res.send(await geminiFallback());
    }

    // Set streaming headers
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://www.sankalpdigitalpathshala.online',
        'X-Title': 'Sankalp Digital Pathshala'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:free',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message }
        ],
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', errorText);
      return res.send(await geminiFallback());
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const sendChunk = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.replace('data: ', '').trim();
              if (data === '[DONE]') {
                res.end();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  res.write(content);
                }
              } catch (e) { /* ignore malformed chunks */ }
            }
          }
        }
      } catch (err) {
        console.error('Stream error:', err);
        res.end();
      }
    };

    sendChunk();
  } catch (err) {
    console.error('Chatbot Error:', err);
    res.status(500).send('I am having a small technical issue. Please try again.');
  }
});

// ---------- LEAD CAPTURE ----------
app.post('/api/lead', async (req, res) => {
  try {
    await connectDB();
    const schema = z.object({
      firstName: z.string().min(1),
      class: z.string().min(1),
      interest: z.string().min(1),
      phone: z.string().min(7),
      city: z.string().optional(),
      parentName: z.string().optional(),
      email: z.string().email().optional()
    });
    const data = schema.parse(req.body);
    sanitize(data);

    let aiSummary = '';
    let leadScore = 50;

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const summaryPrompt = `Based on the following lead info, generate a short summary and a lead score from 0 to 100 (where 100 is highest conversion potential). Return ONLY a JSON object: { "summary": "...", "score": number }. Info: ${JSON.stringify(data)}`;
      const result = await model.generateContent(summaryPrompt);
      const text = (await result.response).text();
      const extracted = JSON.parse(text.match(/\{.*\}/s)[0]);
      aiSummary = extracted.summary || '';
      leadScore = Math.min(100, Math.max(0, Number(extracted.score) || 50));
    } catch (e) { /* use defaults */ }

    const lead = new AILead({ ...data, aiSummary, leadScore });
    await lead.save();
    res.json({ success: true, message: 'Lead captured successfully.' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid lead data.' });
  }
});

// ---------- CONTACT FORM ----------
app.post('/api/contact', async (req, res) => {
  try {
    await connectDB();
    const data = contactSchema.parse(req.body);
    sanitize(data);
    const inquiry = new Inquiry(data);
    await inquiry.save();
    res.json({ success: true, message: 'Thank you for contacting us! We will get back soon.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: 'Could not submit inquiry.' });
  }
});

// ---------- PUBLIC RESULT CHECKER ----------
app.post('/api/result/check', async (req, res) => {
  try {
    await connectDB();
    const data = resultCheckSchema.parse(req.body);
    const studentId = data.studentId || data.registrationNumber;

    const query = { published: true };
    if (studentId) {
      query.registrationNumber = new RegExp(`^${escapeRegExp(studentId)}$`, 'i');
    } else {
      query.studentName = new RegExp(`^${escapeRegExp(data.studentName)}$`, 'i');
      if (data.categoryId && mongoose.Types.ObjectId.isValid(data.categoryId)) {
        query.categoryId = data.categoryId;
      }
    }

    const result = await Result.findOne(query).sort({ updatedAt: -1 });
    if (!result) {
      return res.status(404).json({ error: 'Result not found or not published yet.' });
    }

    let verified = false;
    if (data.dob) {
      const resultDob = new Date(result.dob).toISOString().split('T')[0];
      verified = resultDob === data.dob;
    } else if (data.password && result.resultPasswordHash) {
      verified = await bcrypt.compare(data.password, result.resultPasswordHash);
    } else if (data.password) {
      const resultDob = new Date(result.dob).toISOString().split('T')[0];
      verified = resultDob === data.password;
    }

    if (!verified) {
      return res.status(400).json({ error: 'Invalid student details or DOB.' });
    }

    res.json({ success: true, result: publicResult(result) });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input.' });
    res.status(500).json({ error: 'Server error.' });
  }
});

app.get('/api/result/download/:id', async (req, res) => {
  try {
    await connectDB();
    const result = await Result.findOne({ _id: req.params.id, accessKey: req.query.key, published: true });
    if (!result) return res.status(404).send('Result not found.');
    return sendResultPdf(res, result, 'attachment');
  } catch (err) {
    console.error('Result download error:', err);
    res.status(500).send('Could not download result.');
  }
});

app.get('/api/result/view/:id', async (req, res) => {
  try {
    await connectDB();
    const result = await Result.findOne({ _id: req.params.id, accessKey: req.query.key, published: true });
    if (!result) return res.status(404).send('Result not found.');
    return sendResultPdf(res, result, 'inline');
  } catch (err) {
    console.error('Result view error:', err);
    res.status(500).send('Could not open result.');
  }
});

app.get('/api/public/result-categories', async (req, res) => {
  try {
    await connectDB();
    const categories = await ResultCategory.find({}, { name: 1, mode: 1 }).sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Could not load result categories.' });
  }
});

// ---------- ADMIN AUTH ----------
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = adminLoginSchema.parse(req.body);
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true });
});

app.get('/api/admin/check-auth', adminAuth, (req, res) => {
  res.json({ authenticated: true, email: req.admin.email });
});

// ---------- ADMIN DASHBOARD ----------
app.get('/api/admin/dashboard', adminAuth, async (req, res) => {
  try {
    await connectDB();
    const [totalChats, totalSolves, totalLeads, totalInquiries, totalResults] = await Promise.all([
      AIQuestion.countDocuments(),
      AIQuestion.countDocuments(),
      AILead.countDocuments(),
      Inquiry.countDocuments(),
      Result.countDocuments()
    ]);

    res.json({
      stats: { totalChats, totalSolves, totalLeads, totalInquiries, totalResults }
    });
  } catch (err) {
    res.status(500).json({ error: 'Dashboard error' });
  }
});

// ---------- INQUIRIES CRUD ----------
app.get('/api/admin/inquiries', adminAuth, async (req, res) => {
  await connectDB();
  const inquiries = await Inquiry.find().sort({ createdAt: -1 });
  res.json(inquiries);
});

app.patch('/api/admin/inquiries/:id', adminAuth, async (req, res) => {
  await connectDB();
  const { status } = req.body;
  if (!['new', 'contacted', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json(inquiry);
});

app.delete('/api/admin/inquiries/:id', adminAuth, async (req, res) => {
  await connectDB();
  await Inquiry.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ---------- LEADS CRUD ----------
app.get('/api/admin/leads', adminAuth, async (req, res) => {
  await connectDB();
  const leads = await AILead.find().sort({ createdAt: -1 });
  res.json(leads);
});

app.patch('/api/admin/leads/:id', adminAuth, async (req, res) => {
  await connectDB();
  const { status } = req.body;
  if (!['pending', 'contacted', 'converted'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const lead = await AILead.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json(lead);
});

app.delete('/api/admin/leads/:id', adminAuth, async (req, res) => {
  await connectDB();
  await AILead.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ---------- RESULT CATEGORIES ----------
app.get('/api/admin/result-categories', adminAuth, async (req, res) => {
  await connectDB();
  const categories = await ResultCategory.find().sort({ name: 1 });
  res.json(categories);
});

app.post('/api/admin/result-categories', adminAuth, async (req, res) => {
  try {
    await connectDB();
    const mode = normalizeCategoryMode(req.body.mode);
    const category = new ResultCategory({
      name: String(req.body.name || '').trim(),
      description: String(req.body.description || '').trim(),
      mode,
      fields: mode === 'pdf' ? [] : normalizeCategoryFields(req.body.fields)
    });
    await category.save();
    res.json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Category already exists' });
    res.status(400).json({ error: 'Could not save category' });
  }
});

app.put('/api/admin/result-categories/:id', adminAuth, async (req, res) => {
  try {
    await connectDB();
    const mode = normalizeCategoryMode(req.body.mode);
    const category = await ResultCategory.findByIdAndUpdate(
      req.params.id,
      {
        name: String(req.body.name || '').trim(),
        description: String(req.body.description || '').trim(),
        mode,
        fields: mode === 'pdf' ? [] : normalizeCategoryFields(req.body.fields)
      },
      { new: true, runValidators: true }
    );
    res.json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Category already exists' });
    res.status(400).json({ error: 'Could not update category' });
  }
});

app.delete('/api/admin/result-categories/:id', adminAuth, async (req, res) => {
  await connectDB();
  await ResultCategory.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ---------- RESULTS CRUD ----------
app.get('/api/admin/results', adminAuth, async (req, res) => {
  await connectDB();
  const results = await Result.find().sort({ createdAt: -1 }).populate('categoryId');
  res.json(results);
});

app.post('/api/admin/results', adminAuth, resultUpload, async (req, res) => {
  try {
    await connectDB();
    const data = await buildResultData(req.body, req.files || {});
    if (!data.studentName || !data.dob) {
      return res.status(400).json({ error: 'Student name and DOB are required' });
    }
    if (data.resultMode === 'pdf' && !data.pdfUrl) {
      return res.status(400).json({ error: 'Result PDF link is required for PDF categories' });
    }
    const result = new Result(data);
    await result.save();
    res.json(result);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Duplicate registration number' });
    console.error('Result save error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/results/:id', adminAuth, resultUpload, async (req, res) => {
  try {
    await connectDB();
    const existing = await Result.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Result not found' });
    const data = await buildResultData(req.body, req.files || {}, existing);
    if (!data.studentName || !data.dob) {
      return res.status(400).json({ error: 'Student name and DOB are required' });
    }
    if (data.resultMode === 'pdf' && !data.pdfUrl) {
      return res.status(400).json({ error: 'Result PDF link is required for PDF categories' });
    }
    const result = await Result.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );
    res.json(result);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Duplicate registration number' });
    console.error('Result update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/results/:id', adminAuth, async (req, res) => {
  await connectDB();
  await Result.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ---------- EVENTS CRUD ----------
app.get('/api/admin/events', adminAuth, async (req, res) => {
  await connectDB();
  const events = await Event.find().sort({ date: -1 });
  res.json(events);
});

app.post('/api/admin/events', adminAuth, upload.single('image'), async (req, res) => {
  await connectDB();
  let imageUrl = '';
  if (req.file) {
    imageUrl = await uploadToCloudinary(req.file.buffer, 'sankalp/events');
  }
  const { title, description, date } = req.body;
  const event = new Event({ title, description, date, image: imageUrl });
  await event.save();
  res.json(event);
});

app.put('/api/admin/events/:id', adminAuth, upload.single('image'), async (req, res) => {
  await connectDB();
  const update = { ...req.body };
  if (req.file) {
    update.image = await uploadToCloudinary(req.file.buffer, 'sankalp/events');
  }
  const event = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
  res.json(event);
});

app.delete('/api/admin/events/:id', adminAuth, async (req, res) => {
  await connectDB();
  await Event.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ---------- GALLERY CRUD ----------
app.get('/api/admin/gallery', adminAuth, async (req, res) => {
  await connectDB();
  const items = await Gallery.find().sort({ createdAt: -1 });
  res.json(items);
});

app.post('/api/admin/gallery', adminAuth, upload.single('image'), async (req, res) => {
  await connectDB();
  if (!req.file) return res.status(400).json({ error: 'Image required' });
  const imageUrl = await uploadToCloudinary(req.file.buffer, 'sankalp/gallery');
  const { caption } = req.body;
  const gallery = new Gallery({ imageUrl, caption });
  await gallery.save();
  res.json(gallery);
});

app.delete('/api/admin/gallery/:id', adminAuth, async (req, res) => {
  await connectDB();
  await Gallery.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ---------- PROGRAMS CRUD ----------
app.get('/api/admin/programs', adminAuth, async (req, res) => {
  await connectDB();
  const programs = await Program.find().sort({ title: 1 });
  res.json(programs);
});

app.post('/api/admin/programs', adminAuth, async (req, res) => {
  await connectDB();
  const program = new Program(req.body);
  await program.save();
  res.json(program);
});

app.put('/api/admin/programs/:id', adminAuth, async (req, res) => {
  await connectDB();
  const program = await Program.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(program);
});

app.delete('/api/admin/programs/:id', adminAuth, async (req, res) => {
  await connectDB();
  await Program.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ---------- PUBLIC DATA ----------
app.get('/api/public/events', async (req, res) => {
  await connectDB();
  const events = await Event.find().sort({ date: 1 });
  res.json(events);
});

app.get('/api/public/gallery', async (req, res) => {
  await connectDB();
  const gallery = await Gallery.find().sort({ createdAt: -1 });
  res.json(gallery);
});

app.get('/api/public/programs', async (req, res) => {
  await connectDB();
  const programs = await Program.find();
  res.json(programs);
});

// ---------- FALLBACK ----------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- ERROR HANDLER ----------
app.use((err, req, res, next) => {
  console.error(err);
  if (err.message === 'Invalid file type') return res.status(400).json({ error: 'Invalid file type' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large' });
  res.status(500).json({ error: 'Internal server error' });
});

// ---------- START ----------
if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  });
}

module.exports = app;
