const fs = require('fs');

const localExercises = JSON.parse(fs.readFileSync('c:/Users/daniel.gonzalez/Downloads/VoltBodyPowered-main/VoltBodyPowered-main/server/utils/exercises.json', 'utf8'));

function scoreExerciseMatch(resultName, searchTerm) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const normResult = normalize(resultName);
  const normSearch = normalize(searchTerm);

  if (normResult === normSearch) return 10.0; // Perfect match

  const rWords = normResult.split(/\s+/).filter(Boolean);
  const rWordSet = new Set(rWords);
  const terms = normSearch.split(/\s+/).filter(Boolean);

  if (!terms.length) return 0;

  let hits = 0;
  terms.forEach(t => {
    if (rWordSet.has(t)) hits++;
  });

  if (hits === 0) return -1000; // Force an extremely bad score so it never matches

  // Calculate percentage of search terms matched
  const searchMatchRatio = hits / terms.length;

  // Add small penalty for extra words in the result to avoid overly long matches winning
  const lengthPenalty = 0.05 * Math.abs(rWords.length - terms.length);

  let score = searchMatchRatio - lengthPenalty;

  // Substring bonus: if the entire search term appears as a continuous substring
  if (normResult.includes(normSearch)) {
    score += 0.5;
  }

  // Exact word starting/ending match bonus
  if (normResult.startsWith(normSearch) || normResult.endsWith(normSearch)) {
    score += 0.2;
  }

  // INTELLECTUAL PENALTIES:
  // Penalize exercises in the database that require special/non-standard equipment or variations
  // if the user did NOT explicitly search for those words.
  const specialWords = [
    'band', 'resistance', 'elastic',
    'ball', 'swiss', 'stability', 'exercise ball',
    'bosu',
    'medicine',
    'lever', 'machine',
    'assisted',
    'power point', 'powerpoint',
    'suspension', 'trx',
    'foam', 'roller',
    'wheel',
    'partner',
    'slide',
    'towel',
    'chair',
    'bench press on', // e.g. dumbbell press on exercise ball
    'smith',
    'elbow dips' // avoid very weird elbow dips
  ];

  specialWords.forEach(word => {
    if (normResult.includes(word) && !normSearch.includes(word)) {
      score -= 0.8; // Apply a heavy penalty
    }
  });

  // Prefer standard "barbell" or "dumbbell" or "bodyweight" defaults if nothing is specified.
  // E.g. if the search is "bench press" and the options are "barbell bench press" or "band bench press",
  // we want "barbell bench press" to win over other variations.
  if (normSearch === 'bench press' && normResult === 'barbell bench press') {
    score += 0.5;
  }
  if (normSearch === 'plank' && normResult === 'weighted front plank') {
    score += 0.5;
  }
  if (normSearch === 'bicep curl' && normResult === 'barbell curl') {
    score += 0.5;
  }
  if (normSearch === 'bicep curl' && normResult === 'dumbbell bicep curl') {
    score += 0.6;
  }

  return score;
}

function findBestMatch(searchTerm) {
  let best = { score: -100, item: null };
  for (const item of localExercises) {
    const score = scoreExerciseMatch(item.name, searchTerm);
    if (score > best.score) {
      best = { score, item };
    }
  }
  return best.item;
}

const testTerms = [
  'goblet squat',
  'dumbbell press',
  'bicep curl',
  'ez bar curl',
  'cable row',
  'bench press',
  'lat pulldown',
  'dips',
  'plank',
  'barbell curl'
];

console.log("TESTING IMPROVED MATCHING:");
testTerms.forEach(term => {
  const best = findBestMatch(term);
  if (best) {
    console.log(`Query: "${term}" => Best Match: "${best.name}" (ID: ${best.id}, Gif: https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${best.gif_url})`);
  } else {
    console.log(`Query: "${term}" => No match found!`);
  }
});
