// src/utils/season.ts
//
// Season classification, mirrored from the admin frontend so both sides agree.
// Winter (Dec–Feb), Spring (Mar–May), Summer (Jun–Aug), Fall (Sep–Nov).
// December rolls into the following year's Winter.

export function seasonOf(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "Unscheduled";
  const month = d.getMonth();
  let year = d.getFullYear();
  let name: string;
  if (month === 11) { name = "Winter"; year += 1; }
  else if (month <= 1) name = "Winter";
  else if (month <= 4) name = "Spring";
  else if (month <= 7) name = "Summer";
  else name = "Fall";
  return `${name} ${year}`;
}