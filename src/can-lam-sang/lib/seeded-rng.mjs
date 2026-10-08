const DEFAULT_NONZERO_SEED = 0x6d2b79f5;

export function hash32(input) {
  const text = String(input);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function seedMaterial(caseId, module, schemaVersion) {
  for (const [name, value] of [['case_id', caseId], ['module', module], ['schema_version', schemaVersion]]) {
    if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} must be a non-empty string`);
  }
  return `${caseId}\u001f${module}\u001f${schemaVersion}`;
}

export function createSeededRng({ caseId, module, schemaVersion }) {
  let state = hash32(seedMaterial(caseId, module, schemaVersion)) || DEFAULT_NONZERO_SEED;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededInt(rng, minInclusive, maxExclusive) {
  if (typeof rng !== 'function') throw new TypeError('rng must be a function');
  if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive) || maxExclusive <= minInclusive) {
    throw new RangeError('invalid integer range');
  }
  return minInclusive + Math.floor(rng() * (maxExclusive - minInclusive));
}
