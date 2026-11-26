import 'dotenv/config';
import mongoose from 'mongoose';
import { resetAndSeedDb } from '../db/store';
import { JobCategoryModel, UserModel } from '../models/schemas';

async function main() {
  console.log('[seed] Seeding VanguardHire persistent database...');
  const data = resetAndSeedDb();
  console.log(
    `[seed] Local persistent store populated with ${data.users.length} users, ${data.companies.length} companies, ${data.jobs.length} jobs, ${data.applications.length} applications.`
  );

  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('[seed] Connected to MongoDB Atlas. Syncing categories and core accounts...');
      for (const cat of data.categories) {
        await JobCategoryModel.updateOne(
          { slug: cat.slug },
          { $setOnInsert: { name: cat.name, slug: cat.slug, description: cat.description, active: cat.active } },
          { upsert: true }
        );
      }
      for (const u of data.users) {
        await UserModel.updateOne(
          { email: u.email },
          {
            $setOnInsert: {
              name: u.name,
              email: u.email,
              passwordHash: u.passwordHash,
              role: u.role,
              status: u.status,
              emailVerified: u.emailVerified,
              avatarUrl: u.avatarUrl,
            },
          },
          { upsert: true }
        );
      }
      await mongoose.disconnect();
      console.log('[seed] MongoDB Atlas sync completed.');
    } catch (err) {
      console.error('[seed] MongoDB sync failed:', (err as Error).message);
      process.exitCode = 1;
    }
  }
}

void main();
