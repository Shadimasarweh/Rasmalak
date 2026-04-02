import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const COURSES_DIR = join(import.meta.dirname, '..', 'src', 'data', 'courses');

const files = readdirSync(COURSES_DIR).filter((f) => f.endsWith('.json'));

const enFiles = files.filter((f) => f.endsWith('_en.json')).sort();
const pairs = enFiles.map((enFile) => {
  const arFile = enFile.replace(/_en\.json$/, '_ar.json');
  return { enFile, arFile, exists: files.includes(arFile) };
});

let allMatch = true;

for (const { enFile, arFile, exists } of pairs) {
  if (!exists) {
    console.log(`MISSING  ${arFile} (no AR counterpart for ${enFile})`);
    allMatch = false;
    continue;
  }

  const en = JSON.parse(readFileSync(join(COURSES_DIR, enFile), 'utf-8'));
  const ar = JSON.parse(readFileSync(join(COURSES_DIR, arFile), 'utf-8'));

  const enSectionIds = en.lessons.flatMap((l) => l.sections.map((s) => s.id));
  const arSectionIds = ar.lessons.flatMap((l) => l.sections.map((s) => s.id));

  const enSet = new Set(enSectionIds);
  const arSet = new Set(arSectionIds);

  const onlyInEn = enSectionIds.filter((id) => !arSet.has(id));
  const onlyInAr = arSectionIds.filter((id) => !enSet.has(id));

  const lessonCountMatch = en.lessons.length === ar.lessons.length;
  const sectionCountMatch = enSectionIds.length === arSectionIds.length;
  const idsMatch = onlyInEn.length === 0 && onlyInAr.length === 0;

  if (idsMatch && lessonCountMatch && sectionCountMatch) {
    console.log(`OK       ${enFile.replace('_en.json', '')} — ${enSectionIds.length} sections, ${en.lessons.length} lessons`);
  } else {
    allMatch = false;
    console.log(`MISMATCH ${enFile.replace('_en.json', '')}`);
    if (!lessonCountMatch) console.log(`         Lessons: EN=${en.lessons.length} AR=${ar.lessons.length}`);
    if (!sectionCountMatch) console.log(`         Sections: EN=${enSectionIds.length} AR=${arSectionIds.length}`);
    if (onlyInEn.length) console.log(`         Only in EN: ${onlyInEn.join(', ')}`);
    if (onlyInAr.length) console.log(`         Only in AR: ${onlyInAr.join(', ')}`);
  }
}

console.log();
console.log(allMatch ? 'All 30 pairs match.' : 'Some pairs have mismatches — fix before proceeding.');
process.exit(allMatch ? 0 : 1);
