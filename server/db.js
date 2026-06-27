import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_STORAGE || path.join(__dirname, 'database.sqlite'),
  logging: false
});

// Define Models
export const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  points: { type: DataTypes.INTEGER, defaultValue: 1240 },
  reports: { type: DataTypes.INTEGER, defaultValue: 18 },
  resolved: { type: DataTypes.INTEGER, defaultValue: 7 },
  streak: { type: DataTypes.INTEGER, defaultValue: 6 },
  levelName: { type: DataTypes.STRING, defaultValue: 'Neighborhood Hero' },
  avBg: { type: DataTypes.STRING, defaultValue: '#1E8A4F' },
  initial: { type: DataTypes.STRING, defaultValue: 'A' },
  isYou: { type: DataTypes.BOOLEAN, defaultValue: false }
});

export const Issue = sequelize.define('Issue', {
  customId: { type: DataTypes.STRING, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  cat: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'Reported' },
  confirms: { type: DataTypes.INTEGER, defaultValue: 1 },
  dist: { type: DataTypes.STRING, defaultValue: '0.1 km' },
  when: { type: DataTypes.STRING, defaultValue: 'just now' },
  by: { type: DataTypes.STRING, defaultValue: 'You' },
  sev: { type: DataTypes.STRING, defaultValue: 'Medium' },
  loc: { type: DataTypes.STRING, defaultValue: 'Lajpat Nagar' },
  lat: { type: DataTypes.DOUBLE, allowNull: false },
  lng: { type: DataTypes.DOUBLE, allowNull: false },
  imageUrl: { type: DataTypes.STRING, allowNull: true }
});

export const Timeline = sequelize.define('Timeline', {
  label: { type: DataTypes.STRING, allowNull: false },
  who: { type: DataTypes.STRING, allowNull: false },
  reach: { type: DataTypes.INTEGER, allowNull: false }
});

// Setup Associations
Issue.hasMany(Timeline, { as: 'timeline', foreignKey: 'issueId', onDelete: 'CASCADE' });
Timeline.belongsTo(Issue, { foreignKey: 'issueId' });

// Seed default data
export async function initDb() {
  await sequelize.sync();

  const userCount = await User.count();
  if (userCount === 0) {
    // Seed Users
    await User.bulkCreate([
      { name: 'Priya Sharma', points: 2180, initial: 'P', avBg: '#C0603C' },
      { name: 'Rohan Mehra', points: 1640, initial: 'R', avBg: '#357FD6' },
      { name: 'Aarav Kapoor', points: 1240, initial: 'A', avBg: '#1E8A4F', isYou: true },
      { name: 'Ananya Iyer', points: 1120, initial: 'A', avBg: '#A9801C' },
      { name: 'Vikram Singh', points: 980, initial: 'V', avBg: '#5E8A2E' }
    ]);

    // Seed Issues
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
        lng: 77.2410
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
        lng: 77.2185
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
        lng: 77.2105
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
        lng: 77.2198
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
        lng: 77.1979
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
        lng: 77.2510
      }
    ];

    for (const it of initialIssues) {
      const issue = await Issue.create(it);
      
      // Seed default timelines
      const order = { 'Reported': 0, 'Verified': 1, 'In Progress': 2, 'Resolved': 3 };
      const lvl = order[issue.status] !== undefined ? order[issue.status] : 0;
      
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
    }
  }
}

export default sequelize;
