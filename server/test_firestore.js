import { db, initDb } from './db.js';

async function test() {
  try {
    console.log("Initializing/Seeding DB...");
    await initDb();
    console.log("Connecting to Firestore...");
    const usersSnapshot = await db.collection('users').get();
    console.log(`Successfully connected! Found ${usersSnapshot.size} users.`);
    usersSnapshot.forEach(doc => {
      console.log(` - User ID: ${doc.id}, Name: ${doc.data().name}, isYou: ${doc.data().isYou}`);
    });
    
    console.log("Fetching all issues...");
    const issuesSnapshot = await db.collection('issues').get();
    console.log(`Found ${issuesSnapshot.size} issues:`);
    issuesSnapshot.forEach(doc => {
      console.log(` - ID: ${doc.id}, Title: "${doc.data().title}", Loc: "${doc.data().loc}", Lat: ${doc.data().lat}, Lng: ${doc.data().lng}`);
    });
  } catch (err) {
    console.error("Firestore connectivity error:", err);
  }
}

test();
