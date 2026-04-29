const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Please set MONGODB_URI environment variable');
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('CryoVizWeb'); // Assuming DB name from URI or default
    const collections = await db.listCollections().toArray();
    
    console.log('Database Stats:');
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`- ${coll.name}: ${count} documents`);
    }
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
