import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Import db connection
import { initDb, db } from './db.js';
import { Storage } from '@google-cloud/storage';

// Setup environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config(); // fallback to server/.env

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize GCS Client
const storage = new Storage({ projectId: 'remgur-ai' });
const bucketName = 'civic-pulse-images-remgur-ai';

// Multer memory storage config
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Google Gen AI (Gemini) Client if key exists
let aiClient = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('Google Gemini LLM API Client initialized.');
  } catch (err) {
    console.error('Failed to initialize Google Gemini Client:', err.message);
  }
} else {
  console.log('Running Gemini in Mock/Fallback mode (no GEMINI_API_KEY in .env).');
}

// Category configuration mappings
const DEPARTMENTS = {
  'Pothole': 'MCD Road Works Dept',
  'Streetlight': 'MCD Electrical Dept',
  'Water': 'MCD Water & Sewerage Dept',
  'Waste': 'MCD Sanitation Dept',
  'Tree / Park': 'MCD Horticulture Dept',
  'Other': 'MCD General Administration'
};

const SLA_HOURS = {
  'Pothole': 24,
  'Streetlight': 48,
  'Water': 12,
  'Waste': 36,
  'Tree / Park': 72,
  'Other': 72
};

// ----------------- API ROUTES -----------------

// Fetch current user details
app.get('/api/users/me', async (req, res) => {
  try {
    const snapshot = await db.collection('users').where('isYou', '==', true).limit(1).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Current user not found' });
    const user = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch neighborhood leaderboard
app.get('/api/users/leaderboard', async (req, res) => {
  try {
    const snapshot = await db.collection('users').orderBy('points', 'desc').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch list of issues
app.get('/api/issues', async (req, res) => {
  try {
    const { category, status } = req.query;
    let queryRef = db.collection('issues');

    if (category && category !== 'All') {
      queryRef = queryRef.where('cat', '==', category);
    }
    if (status && status !== 'All') {
      queryRef = queryRef.where('status', '==', status);
    }

    const snapshot = await queryRef.get();
    const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort in memory to avoid needing custom composite indexes in Firestore
    issues.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch individual issue details (with timeline)
app.get('/api/issues/:id', async (req, res) => {
  try {
    const doc = await db.collection('issues').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Issue not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm an issue (Citizen App)
app.post('/api/issues/:id/confirm', async (req, res) => {
  try {
    const docRef = db.collection('issues').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Issue not found' });

    const issue = doc.data();
    const newConfirms = (issue.confirms || 0) + 1;
    let newStatus = issue.status;

    // Auto verify if confirms >= 4 and still reported
    if (issue.status === 'Reported' && newConfirms >= 4) {
      newStatus = 'Verified';
    }

    // Update embedded timeline
    let timeline = issue.timeline || [];
    timeline = timeline.map(t => {
      if (t.label === 'Community verifying') {
        return { ...t, who: `${newConfirms} neighbors confirmed` };
      }
      return t;
    });

    if (newStatus === 'Verified') {
      const exists = timeline.some(t => t.label === 'Verified by city');
      if (!exists) {
        timeline.push({
          label: 'Verified by city',
          who: 'Municipal Corporation of Delhi',
          reach: 1
        });
      }
    }

    await docRef.update({
      confirms: newConfirms,
      status: newStatus,
      timeline
    });

    // Award +10 points to current user
    const userSnapshot = await db.collection('users').where('isYou', '==', true).limit(1).get();
    if (!userSnapshot.empty) {
      const userRef = db.collection('users').doc(userSnapshot.docs[0].id);
      const userData = userSnapshot.docs[0].data();
      await userRef.update({
        points: (userData.points || 0) + 10
      });
    }

    res.json({ success: true, pointsAwarded: 10, confirms: newConfirms, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin change status
app.patch('/api/issues/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const docRef = db.collection('issues').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Issue not found' });

    const issue = doc.data();

    // Regenerate timeline to match state
    const order = { 'Reported': 0, 'Verified': 1, 'In Progress': 2, 'Resolved': 3 };
    const lvl = order[status] !== undefined ? order[status] : 0;
    
    const timelineSteps = [
      { label: 'Reported', who: `by ${issue.by} · ${issue.when}`, reach: 0 },
      { label: 'Community verifying', who: `${issue.confirms} neighbors confirmed`, reach: 0 },
      { label: 'Verified by city', who: 'Municipal Corporation of Delhi', reach: 1 },
      { label: 'Crew assigned', who: 'Field team dispatched', reach: 2 },
      { label: 'Resolved', who: 'Issue closed', reach: 3 }
    ];

    const timeline = timelineSteps.filter(t => lvl >= t.reach);

    await docRef.update({ status, timeline });

    // If status changed to Resolved, award user points for their reports if it's their issue
    if (status === 'Resolved' && issue.by === 'You') {
      const userSnapshot = await db.collection('users').where('isYou', '==', true).limit(1).get();
      if (!userSnapshot.empty) {
        const userRef = db.collection('users').doc(userSnapshot.docs[0].id);
        const userData = userSnapshot.docs[0].data();
        await userRef.update({
          resolved: (userData.resolved || 0) + 1,
          points: (userData.points || 0) + 100
        });
      }
    }

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new issue (Citizen App)
app.post('/api/issues', upload.single('image'), async (req, res) => {
  try {
    const { title, cat, sev, loc, lat, lng, guardrailStatus } = req.body;
    const n = Math.floor(1043 + Math.random() * 9000);
    const customId = '#' + n;

    let imageUrl = null;
    if (req.file) {
      const gcsFileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const blob = storage.bucket(bucketName).file(gcsFileName);
      
      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: req.file.mimetype,
        public: true,
        metadata: {
          cacheControl: 'public, max-age=31536000'
        }
      });

      await new Promise((resolve, reject) => {
        blobStream.on('error', err => reject(err));
        blobStream.on('finish', () => resolve());
        blobStream.end(req.file.buffer);
      });

      imageUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;
    }

    const timeline = [
      { label: 'Reported', who: 'by You · just now', reach: 0 },
      { label: 'Community verifying', who: '1 neighbors confirmed', reach: 0 }
    ];

    const category = cat || 'Pothole';
    const dept = DEPARTMENTS[category] || DEPARTMENTS['Other'];
    const sla = SLA_HOURS[category] || SLA_HOURS['Other'];
    
    // Calculate due time
    const createdDate = new Date();
    const dueTime = new Date(createdDate.getTime() + sla * 60 * 60 * 1000).toISOString();

    const newIssue = {
      customId,
      title: title || 'New reported issue',
      cat: category,
      status: 'Reported',
      confirms: 1,
      dist: '0.1 km',
      when: 'just now',
      by: 'You',
      sev: sev || 'Medium',
      loc: loc || 'Lajpat Nagar',
      lat: parseFloat(lat) || 28.5682,
      lng: parseFloat(lng) || 77.2410,
      imageUrl,
      timeline,
      createdAt: createdDate.toISOString(),
      dueTime,
      slaHours: sla,
      department: dept,
      assignedAgent: null,
      resolutionImageUrl: null,
      guardrailStatus: guardrailStatus || 'Approved'
    };

    await db.collection('issues').doc(customId).set(newIssue);

    // Update user stats: +50 points, +1 reports
    const userSnapshot = await db.collection('users').where('isYou', '==', true).limit(1).get();
    if (!userSnapshot.empty) {
      const userRef = db.collection('users').doc(userSnapshot.docs[0].id);
      const userData = userSnapshot.docs[0].data();
      await userRef.update({
        reports: (userData.reports || 0) + 1,
        points: (userData.points || 0) + 50
      });
    }

    res.status(201).json(newIssue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Image Analysis API (Gemini LLM with Mock fallback)
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    let category = 'Pothole';
    let title = 'New reported issue';
    let severity = 'Medium';
    let confidence = '85%';
    let guardrailStatus = 'Approved';

    if (aiClient) {
      try {
        const imagePart = {
          inlineData: {
            data: req.file.buffer.toString('base64'),
            mimeType: req.file.mimetype
          }
        };

        const prompt = `
          Analyze this civic issue photo. Output a clean JSON object containing:
          1. "category": Must be exactly one of: "Pothole", "Streetlight", "Water", "Waste", "Tree / Park", "Other".
          2. "title": A brief, descriptive title (e.g. "Broken streetlamp pole").
          3. "severity": Must be exactly one of: "Low", "Medium", "High".
          4. "confidence": Estimate your classification confidence percentage (e.g. "95%").
          5. "guardrail": Must be exactly one of: "Approved", "Flagged". Return "Flagged" if the photo is blurry, irrelevant to civic infrastructure issues (like random selfies, text, documents), or contains inappropriate content. Otherwise, return "Approved".
          
          Do not include markdown blocks, write only raw JSON.
        `;

        const response = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [prompt, imagePart]
        });

        const resultText = response.text.trim();
        const cleanedJson = resultText.replace(/```json|```/g, '');
        const parsedData = JSON.parse(cleanedJson);

        if (parsedData.category) category = parsedData.category;
        if (parsedData.title) title = parsedData.title;
        if (parsedData.severity) severity = parsedData.severity;
        if (parsedData.confidence) confidence = parsedData.confidence;
        if (parsedData.guardrail) guardrailStatus = parsedData.guardrail;
      } catch (err) {
        console.error('Gemini LLM API call failed, falling back to mock:', err.message);
      }
    }

    // Heuristics Fallback if Gemini client is null or call failed
    if (!aiClient || title === 'New reported issue') {
      const filenameLower = req.file.originalname.toLowerCase();
      confidence = '70% (Mock)';
      
      if (filenameLower.includes('light') || filenameLower.includes('lamp')) {
        category = 'Streetlight';
        severity = 'Medium';
        title = 'Streetlight outage reported';
      } else if (filenameLower.includes('water') || filenameLower.includes('leak') || filenameLower.includes('pipe')) {
        category = 'Water';
        severity = 'High';
        title = 'Water pipeline leakage';
      } else if (filenameLower.includes('trash') || filenameLower.includes('waste') || filenameLower.includes('garbage') || filenameLower.includes('bin')) {
        category = 'Waste';
        severity = 'Low';
        title = 'Garbage accumulation';
      } else if (filenameLower.includes('tree') || filenameLower.includes('park') || filenameLower.includes('branch')) {
        category = 'Tree / Park';
        severity = 'Medium';
        title = 'Fallen tree blocking path';
      } else if (filenameLower.includes('footpath') || filenameLower.includes('broken')) {
        category = 'Other';
        severity = 'Medium';
        title = 'Damaged footpath segment';
      } else {
        category = 'Pothole';
        severity = 'High';
        title = 'Large road pothole';
      }
    }

    res.json({
      category,
      title,
      severity,
      confidence,
      guardrailStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH endpoint to assign a field agent / worker to a ticket
app.patch('/api/issues/:id/assign', async (req, res) => {
  try {
    const { agent } = req.body;
    const docRef = db.collection('issues').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Issue not found' });
    
    const issue = doc.data();
    let newStatus = issue.status;
    let timeline = issue.timeline || [];
    
    // Auto-advance status to In Progress when assigned
    if (newStatus === 'Reported' || newStatus === 'Verified') {
      newStatus = 'In Progress';
    }

    // Check if Crew assigned timeline step exists
    const hasCrewStep = timeline.some(t => t.label === 'Crew assigned');
    if (!hasCrewStep) {
      timeline.push({
        label: 'Crew assigned',
        who: `Field agent ${agent} dispatched`,
        reach: 2
      });
    }

    await docRef.update({
      assignedAgent: agent,
      status: newStatus,
      timeline
    });

    res.json({ success: true, status: newStatus, assignedAgent: agent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH endpoint to simulate worker resolution photo upload
app.patch('/api/issues/:id/resolve', async (req, res) => {
  try {
    const { resolutionImageUrl } = req.body;
    const docRef = db.collection('issues').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Issue not found' });

    await docRef.update({
      resolutionImageUrl: resolutionImageUrl || 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&q=80&w=400',
      status: 'In Progress' // Stays In Progress but resolution image is uploaded for approval
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH endpoint to approve resolution and fully close the ticket
app.patch('/api/issues/:id/approve', async (req, res) => {
  try {
    const docRef = db.collection('issues').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Issue not found' });

    const issue = doc.data();
    let timeline = issue.timeline || [];

    // Push Resolved step
    const hasResolvedStep = timeline.some(t => t.label === 'Resolved');
    if (!hasResolvedStep) {
      timeline.push({
        label: 'Resolved',
        who: 'Issue closed and verified',
        reach: 3
      });
    }

    await docRef.update({
      status: 'Resolved',
      timeline
    });

    // If the issue was reported by "You", award user points for their reports
    if (issue.by === 'You') {
      const userSnapshot = await db.collection('users').where('isYou', '==', true).limit(1).get();
      if (!userSnapshot.empty) {
        const userRef = db.collection('users').doc(userSnapshot.docs[0].id);
        const userData = userSnapshot.docs[0].data();
        await userRef.update({
          resolved: (userData.resolved || 0) + 1,
          points: (userData.points || 0) + 100
        });
      }
    }

    res.json({ success: true, status: 'Resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static assets from client/dist in production
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Initialize database and start server
const start = async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Civic Pulse API server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
  }
};

start();
