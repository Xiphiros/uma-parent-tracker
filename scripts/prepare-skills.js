// --- INSTRUCTIONS ---
// 1. Place this script in a `scripts/` directory in your project root.
// 2. Create a `raw_data/` directory in your project root.
// 3. Copy `skill_data.json` and `skillnames.json` from the `uma-skill-tools` project into `raw_data/`.
// 4. Create an empty `data/` directory in your `js/` directory.
// 5. Run this script from your project root: `node scripts/prepare-skills.js`
// 6. It will generate a `js/data/skill-list.json` file, which the application will use.

const fs = require('fs');
const path = require('path');

const skillDataPath = path.join(__dirname, '../raw_data/skill_data.json');
const skillNamesPath = path.join(__dirname, '../raw_data/skillnames.json');
const outputPath = path.join(__dirname, '../js/data/skill-list.json');

console.log('Reading skill data...');
const skillData = JSON.parse(fs.readFileSync(skillDataPath, 'utf8'));
const skillNames = JSON.parse(fs.readFileSync(skillNamesPath, 'utf8'));

const inheritableSkills = [];

// Rarity IDs: 1=White, 2=Gold. Uniques (3,4,5) are handled by checking the ID prefix.
const INHERITABLE_RARITIES = [1, 2];

for (const id in skillData) {
    const skill = skillData[id];

    const isInheritedUnique = id.startsWith('9');

    // Only include white/gold skills and inherited uniques. Exclude base uniques (rarity 3, 4, 5).
    if (!INHERITABLE_RARITIES.includes(skill.rarity) && !isInheritedUnique) {
        continue;
    }
    
    // Skip skills with no name entry (they are usually dummy skills)
    if (!skillNames[id]) {
        continue;
    }

    // Skip skills whose effects are only stat boosts (green skills)
    const isGreenSkill = skill.alternatives.length > 0 && 
                         skill.alternatives[0].effects.every(e => e.type >= 1 && e.type <= 5);
    if (isGreenSkill) {
        continue;
    }

    inheritableSkills.push({
        id: id,
        name_jp: skillNames[id][0],
        name_en: skillNames[id][1] || skillNames[id][0], // Fallback to JP name if EN is missing
        type: isInheritedUnique ? 'unique' : 'normal'
    });
}

// Ensure the output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(inheritableSkills, null, 2));

console.log(`Successfully processed ${inheritableSkills.length} skills.`);
console.log(`Output saved to: ${outputPath}`);