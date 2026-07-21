// src/services/dailyQuests.ts
//
// Single source of truth for "which quests are active on day X". Extracted
// from questController.getDailyQuests so the badge system (and any future
// quest-completion code) resolves the exact same set the endpoint serves —
// two copies of this logic drifting apart would silently corrupt the
// "completed ALL of today's quests" badge checks.

import { Transaction } from "sequelize";
import { Quest } from "../models/Quest";
import { DailyQuestOverride } from "../models/DailyQuestOverride";

const DAILY_QUEST_COUNT = 3;

// Deterministic pick: same dateKey + same quest bank → same selection, no
// stored state needed. (Behavior-identical move from questController.)
function pickDeterministic(bank: Quest[], dateKey: string): Quest[] {
  if (bank.length === 0) return [];
  let seed = 0;
  for (const ch of dateKey) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = [...bank];
  const picked: Quest[] = [];
  const count = Math.min(DAILY_QUEST_COUNT, pool.length);
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const idx = seed % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

// dateKey is "YYYY-MM-DD". Admin override wins (1–5 quests); otherwise the
// deterministic pick of up to 3 from the bank.
export async function resolveDailyQuests(
  dateKey: string,
  transaction?: Transaction,
): Promise<Quest[]> {
  const bank = await Quest.findAll({ transaction });
  const override = await DailyQuestOverride.findOne({ where: { dateKey }, transaction });
  if (override) {
    const byId = new Map(bank.map((q) => [q.questId, q]));
    // Number(id) guards against ids stored as strings in the JSON override.
    const picked = override.questIds.map((id) => byId.get(Number(id))).filter(Boolean) as Quest[];
    // An override that no longer maps to any live quest (all its quests were
    // deleted) falls back to the deterministic pick rather than serving nothing.
    if (picked.length > 0) return picked;
  }
  return pickDeterministic(bank, dateKey);
}
