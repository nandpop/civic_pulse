import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Clients
const db = new Firestore({ databaseId: 'civic-pulse' });
const storage = new Storage();
const bucketName = 'civic-pulse-images-remgur-ai';

const migrationItems = [
  { localName: 'deep pothole.webp', gcsName: 'deep_pothole.webp', customId: '#1042' },
  { localName: 'streetlight out.avif', gcsName: 'streetlight_out.avif', customId: '#1038' },
  { localName: 'water pipeline leak flooding lane.jpg', gcsName: 'water_pipeline_leak_flooding_lane.jpg', customId: '#1031' },
  { localName: 'fallen_branch_blocking_footpath.webp', gcsName: 'fallen_branch_blocking_footpath.webp', customId: '#1019' },
  { localName: 'garbage overflow.jpg', gcsName: 'garbage_overflow.jpg', customId: '#1024' },
  { localName: 'broken_footpath_tile.avif', gcsName: 'broken_footpath_tile.avif', customId: '#1011' }
];

async function runMigration() {
  console.log('Starting GCS Image Migration...');
  const bucket = storage.bucket(bucketName);
  
  for (const item of migrationItems) {
    const localFilePath = path.join(__dirname, '../issue_images', item.localName);
    
    if (!fs.existsSync(localFilePath)) {
      console.warn(`⚠️ Local file not found: ${localFilePath}`);
      continue;
    }
    
    console.log(`Uploading ${item.localName} to GCS as ${item.gcsName}...`);
    
    const gcsFile = bucket.file(item.gcsName);
    
    // Upload file
    await new Promise((resolve, reject) => {
      fs.createReadStream(localFilePath)
        .pipe(gcsFile.createWriteStream({
          public: true,
          metadata: {
            cacheControl: 'public, max-age=31536000'
          }
        }))
        .on('error', (err) => reject(err))
        .on('finish', () => resolve());
    });
    
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${item.gcsName}`;
    console.log(`Uploaded successfully. Public URL: ${publicUrl}`);
    
    // Update Firestore
    const docRef = db.collection('issues').doc(item.customId);
    const doc = await docRef.get();
    
    if (doc.exists) {
      console.log(`Updating Firestore document ${item.customId}...`);
      await docRef.update({ imageUrl: publicUrl });
    } else {
      console.log(`ℹ️ Firestore document ${item.customId} doesn't exist yet (will be seeded on next boot).`);
    }
  }
  
  console.log('✅ GCS Image Migration Complete.');
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
