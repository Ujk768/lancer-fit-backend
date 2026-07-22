// src/config/seed.ts
import { Admin, AdminRole } from "../models/Admin";
import { Quest } from "../models/Quest";
import { ActivityArea } from "../models/ActivityArea";
import { ActivitySubActivity } from "../models/ActivitySubActivity";
import { hashPassword } from "../utils/password";
import { seedQuestBadges } from "../services/badges/questBadges";
import { seedExerciseBadges } from "../services/badges/exerciseBadges";

const QUEST_SEED = [
  { title: "Walk 8,000 steps", xp: 40, category: "Cardio" },
  { title: "Complete a 20 minute run", xp: 50, category: "Cardio" },
  { title: "Hold a 60 second plank", xp: 30, category: "Core" },
  { title: "Do 30 push-ups across the day", xp: 35, category: "Strength" },
  { title: "Do 50 bodyweight squats", xp: 35, category: "Strength" },
  { title: "Stretch for 10 minutes", xp: 25, category: "Mobility" },
  { title: "Swim 10 laps at the TLC pool", xp: 60, category: "Swimming" },
  { title: "Cycle for 15 minutes", xp: 40, category: "Cardio" },
  { title: "Take the stairs all day", xp: 30, category: "Lifestyle" },
  { title: "Attend any TLC group class", xp: 70, category: "Classes" },
];

const AREA_SEED = [
  { key: "pool", name: "Pool", icon: "pool", accent: "blue",
    subs: [{ name: "Fit Lanes", icon: "lane" }, { name: "Leisure Swim", icon: "leisure" }, { name: "Recreational Swim", icon: "recswim" }] },
  { key: "fitness", name: "Fitness Centre", icon: "dumbbell", accent: "gold",
    subs: [{ name: "Cardio", icon: "treadmill", hint: "Treadmill · elliptical · bikes" }, { name: "Strength", icon: "barbell" }, { name: "Boxing", icon: "boxing" }] },
  { key: "group", name: "Group Fitness", icon: "group", accent: "plum",
    subs: [{ name: "Spin", icon: "spin" }, { name: "Yoga", icon: "yoga" }, { name: "Bootcamp", icon: "bootcamp" }] },
  { key: "courts", name: "Open Rec & Courts", icon: "court", accent: "green",
    subs: [{ name: "Basketball", icon: "basketball" }, { name: "Badminton", icon: "shuttle" }, { name: "Walking Track", icon: "track" }] },
];

const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function runSeed() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@uwindsor.ca").toLowerCase();
  const existingAdmin = await Admin.findOne({ where: { email } });
  if (!existingAdmin) {
    await Admin.create({
      name: process.env.SEED_ADMIN_NAME || "Administrator", email,
      password: await hashPassword(process.env.SEED_ADMIN_PASSWORD || "LancerAdmin2026"),
      role: AdminRole.ADMINISTRATOR,
    });
    console.log(`Seeded admin: ${email}`);
  }
  if ((await Quest.count()) === 0) {
    await Quest.bulkCreate(QUEST_SEED);
    console.log(`Seeded ${QUEST_SEED.length} quests`);
  }
  if ((await ActivityArea.count()) === 0) {
    for (const area of AREA_SEED) {
      const created = await ActivityArea.create({ key: area.key, name: area.name, icon: area.icon, accent: area.accent });
      await ActivitySubActivity.bulkCreate(
        area.subs.map((s) => ({
          areaId: created.areaId, key: slugify(s.name), name: s.name,
          icon: (s as any).icon ?? null, hint: (s as any).hint ?? null, promotedFromOther: false,
        })),
      );
    }
    console.log(`Seeded ${AREA_SEED.length} activity areas`);
  }
  await seedQuestBadges();
  // Runs after areas/sub-activities are seeded above so it has a catalog to
  // generate exercise badges from. Idempotent, backfills new ones each boot.
  await seedExerciseBadges();
}