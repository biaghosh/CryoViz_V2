// lib/mongodb.ts
import { MongoClient } from "mongodb";

// Only establish connection during runtime, not build time
let clientPromise: Promise<MongoClient>;

if (typeof window === "undefined" && process.env.MONGODB_URI) {
  const uri = process.env.MONGODB_URI;
  const options = {};

  let client: MongoClient | undefined;
  clientPromise = (global._mongoClientPromise ?? (() => {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
    return global._mongoClientPromise;
  })()) as Promise<MongoClient>;
} else {
  // Return a dummy promise during build time
  clientPromise = Promise.resolve({} as MongoClient);
}

declare global {
  // allow global to have _mongoClientPromise
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export default clientPromise;