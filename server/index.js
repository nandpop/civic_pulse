import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import vision from '@google-cloud/vision';

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

// Initialize GCP Vision Client if credentials exist
let visionClient = null;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS || (process.env.GCP_PROJECT_ID && process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY)) {
  try {
    const config = {};
    if (process.env.GCP_PROJECT_ID) {
      config.projectId = process.env.GCP_PROJECT_ID;
      config.credentials = {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n')
      };
    }
    visionClient = new vision.ImageAnnotatorClient(config);
    console.log('Google Cloud Vision API Client initialized.');
  } catch (err) {
    console.error('Failed to initialize Google Cloud Vision API:', err.message);
  }
} else {
  console.log('Running Vision API in Mock/Fallback mode (no credentials in .env).');
}

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
    const { title, cat, sev, loc, lat, lng } = req.body;
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

    const newIssue = {
      customId,
      title: title || 'New reported issue',
      cat: cat || 'Pothole',
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
      createdAt: new Date().toISOString()
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

// Image Analysis API (GCloud Vision with Mock fallback)
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    let labelText = '';
    let category = 'Pothole';
    let confidence = '92%';
    let severity = 'High';

    if (visionClient) {
      try {
        // Run Google Vision Label Detection using the memory buffer
        const [result] = await visionClient.labelDetection(req.file.buffer);
        const labels = result.labelAnnotations || [];
        
        labelText = labels.map(l => l.description.toLowerCase()).join(' ');
        const topLabel = labels[0];
        if (topLabel) {
          confidence = Math.round(topLabel.score * 100) + '%';
        }

        // Map labels to categories
        if (labelText.includes('light') || labelText.includes('lamp') || labelText.includes('electricity')) {
          category = 'Streetlight';
          severity = 'Medium';
        } else if (labelText.includes('water') || labelText.includes('leak') || labelText.includes('flood') || labelText.includes('pipe')) {
          category = 'Water';
          severity = 'High';
        } else if (labelText.includes('trash') || labelText.includes('waste') || labelText.includes('garbage') || labelText.includes('bin')) {
          category = 'Waste';
          severity = 'Low';
        } else if (labelText.includes('tree') || labelText.includes('plant') || labelText.includes('branch') || labelText.includes('grass')) {
          category = 'Tree / Park';
          severity = 'Medium';
        } else if (labelText.includes('curb') || labelText.includes('curb ramp') || labelText.includes('pavement') || labelText.includes('concrete')) {
          category = 'Other';
          severity = 'Medium';
        } else {
          category = 'Pothole';
          severity = 'High';
        }
      } catch (err) {
        console.error('GCloud Vision API call failed, falling back to mock:', err.message);
        visionClient = null; // force mock next time
      }
    }

    // Heuristics Fallback if GCP vision client is null
    if (!visionClient) {
      const filenameLower = req.file.originalname.toLowerCase();
      
      if (filenameLower.includes('light') || filenameLower.includes('lamp')) {
        category = 'Streetlight';
        severity = 'Medium';
      } else if (filenameLower.includes('water') || filenameLower.includes('leak') || filenameLower.includes('pipe')) {
        category = 'Water';
        severity = 'High';
      } else if (filenameLower.includes('trash') || filenameLower.includes('waste') || filenameLower.includes('garbage') || filenameLower.includes('bin')) {
        category = 'Waste';
        severity = 'Low';
      } else if (filenameLower.includes('tree') || filenameLower.includes('park') || filenameLower.includes('branch')) {
        category = 'Tree / Park';
        severity = 'Medium';
      } else if (filenameLower.includes('footpath') || filenameLower.includes('broken')) {
        category = 'Other';
        severity = 'Medium';
      } else {
        category = 'Pothole';
        severity = 'High';
      }
    }

    res.json({
      success: true,
      category,
      severity,
      confidence,
      imageUrl: `/uploads/${req.file.filename}`,
      title: `Large ${category.toLowerCase()} near pedestrian lane`
    });

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
