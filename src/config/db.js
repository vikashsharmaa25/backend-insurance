import mongoose from 'mongoose';
import env from './env.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(`📡 MongoDB Connected: ${conn.connection.host}`);

    // ── Index migration: drop old unique index if it exists ──────────────
    // Old index was { planId, coverageId, isDeleted } (no sumInsuredId).
    // New index is  { planId, coverageId, sumInsuredId, isDeleted }.
    // This migration runs once safely on every deploy.
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('plancoverages');
      const indexes = await collection.indexes();
      const oldIndex = indexes.find(
        (idx) =>
          idx.unique &&
          idx.key?.planId === 1 &&
          idx.key?.coverageId === 1 &&
          idx.key?.isDeleted === 1 &&
          !idx.key?.sumInsuredId
      );
      if (oldIndex) {
        await collection.dropIndex(oldIndex.name);
        console.log('✅ Dropped old PlanCoverage unique index (no sumInsuredId)');
      }
    } catch (idxErr) {
      // Non-fatal — log and continue
      console.warn('⚠️  PlanCoverage index migration skipped:', idxErr.message);
    }

  } catch (error) {
    console.error(`❌ Database connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
