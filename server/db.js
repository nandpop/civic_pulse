import { Firestore } from '@google-cloud/firestore';

// Initialize Firestore with custom databaseId
export const db = new Firestore({
  projectId: 'remgur-ai',
  databaseId: 'civic-pulse'
});

// Seed default data
export async function initDb() {
  try {
    const usersColl = db.collection('users');
    const issuesColl = db.collection('issues');

    // Check if users collection is empty
    const usersSnapshot = await usersColl.limit(1).get();
  
  if (usersSnapshot.empty) {
    console.log('Seeding default users...');
    const seedUsers = [
      { id: 'priya_sharma', name: 'Priya Sharma', points: 2180, initial: 'P', avBg: '#C0603C', isYou: false },
      { id: 'rohan_mehra', name: 'Rohan Mehra', points: 1640, initial: 'R', avBg: '#357FD6', isYou: false },
      { id: 'aarav_kapoor', name: 'Aarav Kapoor', points: 1240, initial: 'A', avBg: '#1E8A4F', isYou: true, levelName: 'Neighborhood Hero', reports: 18, resolved: 7, streak: 6 },
      { id: 'ananya_iyer', name: 'Ananya Iyer', points: 1120, initial: 'A', avBg: '#A9801C', isYou: false },
      { id: 'vikram_singh', name: 'Vikram Singh', points: 980, initial: 'V', avBg: '#5E8A2E', isYou: false },
      { id: 'sandeep_sen', name: 'Sandeep Sen', points: 870, initial: 'S', avBg: '#7A6BC0', isYou: false },
      { id: 'meera_joshi', name: 'Meera Joshi', points: 750, initial: 'M', avBg: '#C0603C', isYou: false },
      { id: 'kabir_verma', name: 'Kabir Verma', points: 620, initial: 'K', avBg: '#357FD6', isYou: false },
      { id: 'diya_malhotra', name: 'Diya Malhotra', points: 540, initial: 'D', avBg: '#A9801C', isYou: false },
      { id: 'arjun_nair', name: 'Arjun Nair', points: 430, initial: 'A', avBg: '#5E8A2E', isYou: false }
    ];

    for (const u of seedUsers) {
      await usersColl.doc(u.id).set(u);
    }
  }

  // Check if issues collection is empty
  const issuesSnapshot = await issuesColl.limit(1).get();

  if (issuesSnapshot.empty) {
    console.log('Seeding default issues...');
    const initialIssues = [
      {
        customId: '#1042',
        title: 'Deep pothole on Ring Road',
        cat: 'Pothole',
        status: 'Verified',
        confirms: 14,
        dist: '0.2 km',
        when: '2h ago',
        by: 'Priya Sharma',
        sev: 'High',
        loc: 'Ring Rd, Lajpat Nagar',
        lat: 28.5682,
        lng: 77.2410,
        imageUrl: 'https://storage.googleapis.com/civic-pulse-images-remgur-ai/deep_pothole.webp',
        createdAt: new Date().toISOString()
      },
      {
        customId: '#1038',
        title: 'Streetlight out near Nehru Park',
        cat: 'Streetlight',
        status: 'In Progress',
        confirms: 9,
        dist: '0.4 km',
        when: '5h ago',
        by: 'Rohan Mehra',
        sev: 'Medium',
        loc: 'Nehru Park',
        lat: 28.5823,
        lng: 77.2185,
        imageUrl: 'https://storage.googleapis.com/civic-pulse-images-remgur-ai/streetlight_out.avif',
        createdAt: new Date().toISOString()
      },
      {
        customId: '#1031',
        title: 'Water pipeline leak flooding lane',
        cat: 'Water',
        status: 'Reported',
        confirms: 3,
        dist: '0.5 km',
        when: '1d ago',
        by: 'You',
        sev: 'High',
        loc: 'Aurobindo Marg',
        lat: 28.5620,
        lng: 77.2105,
        imageUrl: 'https://storage.googleapis.com/civic-pulse-images-remgur-ai/water_pipeline_leak_flooding_lane.jpg',
        createdAt: new Date().toISOString()
      },
      {
        customId: '#1019',
        title: 'Fallen branch blocking footpath',
        cat: 'Tree / Park',
        status: 'Verified',
        confirms: 7,
        dist: '1.1 km',
        when: '4h ago',
        by: 'Arjun Nair',
        sev: 'Medium',
        loc: 'Lodhi Garden',
        lat: 28.5915,
        lng: 77.2198,
        imageUrl: 'https://storage.googleapis.com/civic-pulse-images-remgur-ai/fallen_branch_blocking_footpath.webp',
        createdAt: new Date().toISOString()
      },
      {
        customId: '#1024',
        title: 'Garbage overflow at Sarojini Market',
        cat: 'Waste',
        status: 'Resolved',
        confirms: 21,
        dist: '0.8 km',
        when: '3d ago',
        by: 'Ananya Iyer',
        sev: 'Low',
        loc: 'Sarojini Market',
        lat: 28.5772,
        lng: 77.1979,
        imageUrl: 'https://storage.googleapis.com/civic-pulse-images-remgur-ai/garbage_overflow.jpg',
        createdAt: new Date().toISOString()
      },
      {
        customId: '#1011',
        title: 'Broken footpath tile, unsafe',
        cat: 'Other',
        status: 'In Progress',
        confirms: 5,
        dist: '1.3 km',
        when: '2d ago',
        by: 'Vikram Singh',
        sev: 'Medium',
        loc: 'CR Park',
        lat: 28.5365,
        lng: 77.2510,
        imageUrl: 'https://storage.googleapis.com/civic-pulse-images-remgur-ai/broken_footpath_tile.avif',
        createdAt: new Date().toISOString()
      }
    ];

    for (const it of initialIssues) {
      // Build embedded timeline
      const order = { 'Reported': 0, 'Verified': 1, 'In Progress': 2, 'Resolved': 3 };
      const lvl = order[it.status] !== undefined ? order[it.status] : 0;
      
      const timelineSteps = [
        { label: 'Reported', who: `by ${it.by} · ${it.when}`, reach: 0 },
        { label: 'Community verifying', who: `${it.confirms} neighbors confirmed`, reach: 0 },
        { label: 'Verified by city', who: 'Municipal Corporation of Delhi', reach: 1 },
        { label: 'Crew assigned', who: 'Field team dispatched', reach: 2 },
        { label: 'Resolved', who: 'Issue closed', reach: 3 }
      ];

      it.timeline = timelineSteps.filter(t => lvl >= t.reach);

      const getDepartment = (category, title) => {
        const t = (title || '').toLowerCase();
        const c = category || 'Other';
        
        if (c === 'Pothole' || t.includes('footpath') || t.includes('road') || t.includes('pavement') || t.includes('path') || t.includes('tile')) {
          return 'MCD Road Works Dept';
        }
        if (c === 'Streetlight' || t.includes('light') || t.includes('lamp') || t.includes('electric')) {
          return 'MCD Electrical Dept';
        }
        if (c === 'Water' || t.includes('leak') || t.includes('pipe') || t.includes('sewer')) {
          return 'MCD Water & Sewerage Dept';
        }
        if (c === 'Waste' || t.includes('garbage') || t.includes('trash') || t.includes('overflow') || t.includes('waste') || t.includes('dump')) {
          return 'PWD Sanitation Dept';
        }
        if (c === 'Tree / Park' || t.includes('tree') || t.includes('park') || t.includes('branch') || t.includes('horticulture')) {
          return 'MCD Horticulture Dept';
        }
        return 'MCD General Administration';
      };

      const SLA_HOURS = {
        'Pothole': 24,
        'Streetlight': 48,
        'Water': 12,
        'Waste': 36,
        'Tree / Park': 72,
        'Other': 72
      };

      const dept = getDepartment(it.cat, it.title);
      const sla = SLA_HOURS[it.cat] || SLA_HOURS['Other'];

      const createdDate = new Date();
      const ageHoursMap = { '#1042': 2, '#1038': 5, '#1031': 24, '#1019': 4, '#1024': 72, '#1011': 48 };
      const ageHours = ageHoursMap[it.customId] || 0;
      createdDate.setHours(createdDate.getHours() - ageHours);

      const dueTime = new Date(createdDate.getTime() + sla * 60 * 60 * 1000).toISOString();

      it.createdAt = createdDate.toISOString();
      it.dueTime = dueTime;
      it.slaHours = sla;
      it.department = dept;
      it.guardrailStatus = 'Approved';
      it.assignedAgent = (it.status !== 'Reported' && it.status !== 'Verified') ? 'Team Alpha' : null;
      it.resolutionImageUrl = it.status === 'Resolved' ? 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&q=80&w=400' : null;

      await issuesColl.doc(it.customId).set(it);
    }
  }
  } catch (err) {
    if (err.message && err.message.includes('Could not load the default credentials')) {
      console.error('\n⚠️  [Firestore Error]: Could not load Google Cloud credentials.');
      console.error('To run Firestore locally, please authenticate your local environment by running:');
      console.error('   gcloud auth application-default login\n');
    }
    throw err;
  }
}
