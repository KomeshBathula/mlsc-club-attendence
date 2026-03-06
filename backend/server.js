const express = require('express');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Debug Middleware: Log all requests
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Error handling for the process
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n[UNHANDLED REJECTION]');
  console.error('At Promise:', promise);
  console.error('Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('\n[UNCAUGHT EXCEPTION]');
  console.error(error);
  process.exit(1);
});

// Initialize Auth - using service account
if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
  console.error('CRITICAL ERROR: Missing Google Credentials in .env');
  process.exit(1);
}

if (!process.env.SPOT_REGISTRATION_PASSWORD) {
  console.error('CRITICAL ERROR: Missing SPOT_REGISTRATION_PASSWORD in .env');
  process.exit(1);
}

// Sanitize the private key:
let privateKey = process.env.GOOGLE_PRIVATE_KEY;
if (privateKey) {
  // Replace literal '\n' characters with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
  // Remove surrounding double-quotes if they were accidentally pasted
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
}

// Configure Proxy if present
const proxyUrl = process.env.HTTPS_PROXY;
if (proxyUrl) {
  console.log(`[PROXY] Detected HTTPS_PROXY: ${proxyUrl}`);
}

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  // Pass the proxy agent to the underlying request library (gaxios)
  ...(proxyUrl ? { options: { agent: new HttpsProxyAgent(proxyUrl) } } : {})
});

const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, serviceAccountAuth);

/**
 * Ensures the Google Sheet is loaded and accessible.
 * Throws an error with a descriptive message if it fails.
 */
async function ensureDocLoaded() {
  try {
    // Check if info is already loaded. Use try-catch because 
    // accessing sheetCount throws if not loaded.
    try {
      if (doc.sheetCount > 0) return;
    } catch (e) {
      // Info not loaded yet, proceed to load
    }

    console.log('[SHEET] Initializing connection...');
    await doc.loadInfo();

    if (doc.sheetCount === 0) {
      throw new Error('The spreadsheet contains no worksheets.');
    }

    console.log(`[SHEET] Successfully loaded: "${doc.title}" (${doc.sheetCount} sheets)`);
  } catch (error) {
    console.error('[SHEET ERROR]', error.message);

    let advice = 'Check your internet connection.';
    if (error.code === 'ETIMEDOUT') {
      advice = 'Connection timed out. If you are behind a proxy, ensure HTTPS_PROXY is set in .env.';
    } else if (error.message.includes('403')) {
      advice = 'Ensure the service account has permission to view the sheet.';
    }

    throw new Error(`Failed to connect to Google Sheets. ${advice} (${error.code || 'UNKNOWN_ERROR'})`);
  }
}

// API to Mark Attendance
app.post('/api/mark-attendance', async (req, res) => {
  const { rollNo } = req.body;
  console.log(`\n[API] Received Scan Request for: "${rollNo}"`);

  if (!rollNo) {
    return res.status(400).json({ error: 'Roll Number is required' });
  }

  try {
    await ensureDocLoaded();
    const sheet = doc.sheetsByIndex[0];

    // Load headers
    await sheet.loadHeaderRow();

    const rows = await sheet.getRows();

    const studentRow = rows.find(row => {
      const sheetRoll = row.get('Rollnumber');
      return sheetRoll && sheetRoll.toString().trim().toLowerCase() === rollNo.toString().trim().toLowerCase();
    });

    if (!studentRow) {
      return res.status(404).json({ error: `Student not registered (Roll: ${rollNo})` });
    }

    const currentStatus = studentRow.get('isPresent');
    if (currentStatus === 'TRUE' || currentStatus === 'Present' || currentStatus === true || String(currentStatus).toLowerCase() === 'true') {
      return res.status(200).json({
        message: 'Already marked present',
        student: {
          name: studentRow.get('Name'),
          rollNo: studentRow.get('Rollnumber'),
          branch: studentRow.get('Branch')
        }
      });
    }

    studentRow.set('isPresent', 'TRUE');
    await studentRow.save();

    return res.status(200).json({
      message: 'Marked Present',
      student: {
        name: studentRow.get('Name'),
        rollNo: studentRow.get('Rollnumber'),
        branch: studentRow.get('Branch')
      }
    });

  } catch (error) {
    console.error('[API ERROR]', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// API for Spot Registration
app.post('/api/spot-register', async (req, res) => {
  const { name, rollNo, branch, yearOfStudy, password } = req.body;
  console.log(`\n[SPOT] Received Request for: "${name}" (${rollNo})`);

  if (!password || password !== process.env.SPOT_REGISTRATION_PASSWORD) {
    return res.status(401).json({ error: 'Invalid portal password' });
  }

  if (!name || !rollNo || !branch || !yearOfStudy) {
    return res.status(400).json({ error: 'Name, Roll Number, Branch, and Year of Study are required' });
  }

  try {
    await ensureDocLoaded();
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();

    const rows = await sheet.getRows();

    let studentRow = rows.find(row => {
      const sheetRoll = row.get('Rollnumber');
      return sheetRoll && sheetRoll.toString().trim().toLowerCase() === rollNo.toString().trim().toLowerCase();
    });

    if (studentRow) {
      studentRow.set('isPresent', 'TRUE');
      // Update data if it was missing
      if (yearOfStudy) studentRow.set('Year of Study', yearOfStudy);
      await studentRow.save();

      return res.status(200).json({
        message: 'Student already in list, marked as Present',
        student: {
          name: studentRow.get('Name'),
          rollNo: studentRow.get('Rollnumber'),
          branch: studentRow.get('Branch'),
          yearOfStudy: studentRow.get('Year of Study')
        }
      });
    }

    const newRow = await sheet.addRow({
      'isPresent': 'TRUE',
      'Name': name.trim(),
      'Rollnumber': rollNo.toString().trim().toUpperCase(),
      'Branch': branch.trim().toUpperCase(),
      'Year of Study': yearOfStudy.trim()
    });

    return res.status(201).json({
      message: 'Successfully Registered & Marked Present',
      student: {
        name: newRow.get('Name'),
        rollNo: newRow.get('Rollnumber'),
        branch: newRow.get('Branch'),
        yearOfStudy: newRow.get('Year of Study')
      }
    });

  } catch (error) {
    console.error('[SPOT ERROR]', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// API to Get All Attendance Data
app.get('/api/attendance', async (req, res) => {
  console.log('[API] Fetching attendance list...');
  try {
    await ensureDocLoaded();
    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const students = rows.map(row => ({
      name: row.get('Name'),
      rollNo: row.get('Rollnumber'),
      branch: row.get('Branch'),
      year: row.get('Year of Study') || row.get('Year') || '',
      isPresent: row.get('isPresent') === 'TRUE' || row.get('isPresent') === 'Present' || row.get('isPresent') === true
    }));

    res.json({ students });
  } catch (error) {
    console.error('[API ERROR]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API to Verify Portal Password
app.post('/api/verify-password', (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.SPOT_REGISTRATION_PASSWORD) {
    return res.status(401).json({ error: 'Invalid portal password' });
  }
  return res.status(200).json({ message: 'Password verified' });
});

app.get('/', (req, res) => {
  res.send('Attendance Backend is Running');
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\nCRITICAL ERROR: Port ${PORT} is already in use.`);
    console.error(`This usually happens if another instance of the server is already running.`);
    console.error(`Try stopping other nodes or use: fuser -k ${PORT}/tcp`);
    process.exit(1);
  } else {
    console.error('\n[SERVER ERROR]', error);
  }
});
