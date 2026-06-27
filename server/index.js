import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import vision from '@google-cloud/vision';

// Import db models
import { initDb, User, Issue, Timeline } from './db.js';

// Setup environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config(); // fallback to server/.env

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Multer Config for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

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
    const user = await User.findOne({ where: { isYou: true } });
    if (!user) return res.status(404).json({ error: 'Current user not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch neighborhood leaderboard
app.get('/api/users/leaderboard', async (req, res) => {
  try {
    const users = await User.findAll({ order: [['points', 'DESC']] });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch list of issues
app.get('/api/issues', async (req, res) => {
  try {
    const { category, status } = req.query;
    const where = {};
    if (category && category !== 'All') where.cat = category;
    if (status && status !== 'All') where.status = status;

    const issues = await Issue.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch individual issue details (with timeline)
app.get('/api/issues/:id', async (req, res) => {
  try {
    const issue = await Issue.findOne({
      where: { customId: req.params.id },
      include: [{ model: Timeline, as: 'timeline' }]
    });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm an issue (Citizen App)
app.post('/api/issues/:id/confirm', async (req, res) => {
  try {
    const issue = await Issue.findOne({ where: { customId: req.params.id } });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const newConfirms = issue.confirms + 1;
    let newStatus = issue.status;

    // Auto verify if confirms >= 4 and still reported
    if (issue.status === 'Reported' && newConfirms >= 4) {
      newStatus = 'Verified';
    }

    await issue.update({ confirms: newConfirms, status: newStatus });

    // Update community verifying timeline event if it exists
    await Timeline.update(
      { who: `${newConfirms} neighbors confirmed` },
      { where: { issueId: issue.customId, label: 'Community verifying' } }
    );

    // If verified by city timeline doesn't exist but status became Verified, insert it
    if (newStatus === 'Verified') {
      const exists = await Timeline.findOne({ where: { issueId: issue.customId, label: 'Verified by city' } });
      if (!exists) {
        await Timeline.create({
          label: 'Verified by city',
          who: 'Municipal Corporation of Delhi',
          reach: 1,
          issueId: issue.customId
        });
      }
    }

    // Award +10 points to current user
    const user = await User.findOne({ where: { isYou: true } });
    if (user) {
      await user.update({ points: user.points + 10 });
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
    const issue = await Issue.findOne({ where: { customId: req.params.id } });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    await issue.update({ status });

    // Regenerate timelines to match state
    await Timeline.destroy({ where: { issueId: issue.customId } });

    const order = { 'Reported': 0, 'Verified': 1, 'In Progress': 2, 'Resolved': 3 };
    const lvl = order[status] !== undefined ? order[status] : 0;
    
    const timelineSteps = [
      { label: 'Reported', who: `by ${issue.by} · ${issue.when}`, reach: 0, issueId: issue.customId },
      { label: 'Community verifying', who: `${issue.confirms} neighbors confirmed`, reach: 0, issueId: issue.customId },
      { label: 'Verified by city', who: 'Municipal Corporation of Delhi', reach: 1, issueId: issue.customId },
      { label: 'Crew assigned', who: 'Field team dispatched', reach: 2, issueId: issue.customId },
      { label: 'Resolved', who: 'Issue closed', reach: 3, issueId: issue.customId }
    ];

    for (const t of timelineSteps) {
      if (lvl >= t.reach) {
        await Timeline.create(t);
      }
    }

    // If status changed to Resolved, award user points for their reports if it's their issue
    if (status === 'Resolved' && issue.by === 'You') {
      const user = await User.findOne({ where: { isYou: true } });
      if (user) {
        await user.update({ resolved: user.resolved + 1, points: user.points + 100 });
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

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const issue = await Issue.create({
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
      imageUrl
    });

    // Create default timelines
    await Timeline.create({
      label: 'Reported',
      who: 'by You · just now',
      reach: 0,
      issueId: customId
    });
    await Timeline.create({
      label: 'Community verifying',
      who: '1 neighbors confirmed',
      reach: 0,
      issueId: customId
    });

    // Update user stats: +50 points, +1 reports
    const user = await User.findOne({ where: { isYou: true } });
    if (user) {
      await user.update({
        reports: user.reports + 1,
        points: user.points + 50
      });
    }

    res.status(201).json(issue);
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

    const filePath = req.file.path;
    let labelText = '';
    let category = 'Pothole';
    let confidence = '92%';
    let severity = 'High';

    if (visionClient) {
      try {
        // Run Google Vision Label Detection
        const [result] = await visionClient.labelDetection(filePath);
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
