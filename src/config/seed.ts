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

// Mirrors the frontend catalog (LancerFit/src/data/activityData.js) exactly:
// each sub's `id` is used verbatim as the backend `key`, so the app's logged
// exerciseKey/areaKey match the catalog and badges resolve. The frontend fetches
// this catalog via GET /api/area — this is the single source of truth.
const AREA_SEED = [
  { key: "pool", name: "Pool", icon: "pool", accent: "blue", subs: [
    { id: "fitlane", name: "Fit Lanes", icon: "lane" },
    { id: "shallow", name: "Shallow Aquafit", icon: "aqua" },
    { id: "deep", name: "Deep Water Aquafit", icon: "deep" },
    { id: "leisure", name: "Leisure Swim", icon: "leisure" },
    { id: "rec", name: "Recreational Swim", icon: "recswim" },
    { id: "lessons", name: "Swim Lessons", icon: "lessons" },
  ] },
  { key: "fitness", name: "Fitness Centre", icon: "dumbbell", accent: "gold", subs: [
    { id: "cardio", name: "Cardio", icon: "treadmill", hint: "Treadmill · elliptical · stepmill · bikes" },
    { id: "strength", name: "Strength", icon: "barbell" },
    { id: "flex", name: "Flexibility & Stretch", icon: "stretch" },
    { id: "boxing", name: "Boxing", icon: "boxing" },
  ] },
  { key: "group", name: "Group Fitness", icon: "group", accent: "plum", subs: [
    { id: "spin", name: "Spin", icon: "spin" },
    { id: "lancerlift", name: "Lancer Lift", icon: "barbell" },
    { id: "bootcamp", name: "Bootcamp", icon: "bootcamp" },
    { id: "kickbox", name: "Kickboxing", icon: "boxing" },
    { id: "hyrox", name: "HYROX", icon: "hyrox" },
    { id: "yoga", name: "Yoga", icon: "yoga" },
    { id: "zumba", name: "Zumba", icon: "zumba" },
    { id: "karate", name: "Karate", icon: "karate" },
  ] },
  { key: "courts", name: "Open Rec & Courts", icon: "court", accent: "green", subs: [
    { id: "pickleball", name: "Pickleball", icon: "paddle" },
    { id: "badminton", name: "Badminton", icon: "shuttle" },
    { id: "tabletennis", name: "Table Tennis", icon: "paddle" },
    { id: "volleyball", name: "Volleyball", icon: "volleyball" },
    { id: "basketball", name: "Basketball", icon: "basketball" },
    { id: "track", name: "Walking Track", icon: "track" },
  ] },
  { key: "intramural", name: "Intramural Leagues", icon: "trophy", accent: "coral", subs: [
    { id: "imbasket", name: "Basketball", icon: "basketball" },
    { id: "imvolley", name: "Volleyball", icon: "volleyball" },
    { id: "soccer", name: "Soccer", icon: "soccer" },
    { id: "futsal", name: "Futsal", icon: "soccer" },
    { id: "flagfb", name: "Flag Football", icon: "football" },
  ] },
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
          // Use the catalog's explicit id as the key (matches the frontend's
          // exercise ids), NOT a slug of the name — the app logs by this key.
          areaId: created.areaId, key: (s as any).id, name: s.name,
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