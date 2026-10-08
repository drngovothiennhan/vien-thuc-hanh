import { createSeededRng } from "../lib/seeded-rng.mjs";
import { classifyScenario } from "./classify.mjs";

const INDICES = [
  "Hb", "RBC", "Hct", "MCV", "MCH", "MCHC", "WBC", "PLT",
  "neut", "lymph", "mono", "eos", "baso"
];

const DIFFERENTIAL = ["neut", "lymph", "mono", "eos", "baso"];

const PROFILES = {
  vn_lab: {
    Hb: ["g/L", 1], RBC: ["T/L", 2], Hct: ["%", 1], MCV: ["fL", 1],
    MCH: ["pg", 1], MCHC: ["g/L", 1], WBC: ["G/L", 2], PLT: ["G/L", 2],
    neut: ["%", 1], lymph: ["%", 1], mono: ["%", 1], eos: ["%", 1], baso: ["%", 1],
    abs: ["G/L", 2]
  },
  conventional: {
    Hb: ["g/dL", 1], RBC: ["×10^12/L", 2], Hct: ["%", 1], MCV: ["fL", 1],
    MCH: ["pg", 1], MCHC: ["g/dL", 2], WBC: ["×10^9/L", 2], PLT: ["×10^9/L", 2],
    neut: ["%", 1], lymph: ["%", 1], mono: ["%", 1], eos: ["%", 1], baso: ["%", 1],
    abs: ["×10^9/L", 2]
  }
};

const INTERNAL = {
  Hb: "g/L", RBC: "T/L", Hct: "fraction", MCV: "fL", MCH: "pg", MCHC: "g/L",
  WBC: "G/L", PLT: "G/L", neut: "%", lymph: "%", mono: "%", eos: "%", baso: "%"
};

const SEXES = ["nam", "nữ"];
const MAX_ATTEMPTS = 200;

function round(value, precision) {
  const multiplier = 10 ** precision;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function pick(rng, low, high) {
  return low + (high - low) * rng();
}

function convertFromInternal(key, value, profile) {
  if (key === "Hct") {
    return value * 100;
  }
  if (key === "Hb" && profile === "conventional") {
    return value / 10;
  }
  if (key === "MCHC" && profile === "conventional") {
    return value / 10;
  }
  return value;
}

function convertToInternal(key, value, profile) {
  if (key === "Hct") {
    return value / 100;
  }
  if (key === "Hb" && profile === "conventional") {
    return value * 10;
  }
  if (key === "MCHC" && profile === "conventional") {
    return value * 10;
  }
  return value;
}

function requireSex(sex) {
  if (!SEXES.includes(sex)) {
    throw new Error("sex_thieu_hoac_khong_hop_le");
  }
}

function requireRanges(pattern, sex) {
  requireSex(sex);
  for (const key of INDICES) {
    if (!pattern.indices?.[key]?.ranges?.[sex]) {
      throw new Error("reference_thieu_gioi:" + key);
    }
  }
}

function inRange(value, range) {
  return Number.isFinite(value) && value >= range.low && value <= range.high;
}

function allIndicesInRange(values, pattern, sex) {
  return INDICES.every((key) => inRange(values[key], pattern.indices[key].ranges[sex]));
}

function boundsPermitDifferential(pattern, sex) {
  const lower = DIFFERENTIAL.reduce((sum, key) => sum + pattern.indices[key].ranges[sex].low, 0);
  const upper = DIFFERENTIAL.reduce((sum, key) => sum + pattern.indices[key].ranges[sex].high, 0);
  if (lower > 100 || upper < 100) {
    throw new Error("cong_thuc_bach_cau_khong_kha_thi:" + sex);
  }
}

function largestRemainder(rawValues, ranges, precision = 1) {
  const scale = 10 ** precision;
  const floors = rawValues.map((value) => Math.floor(value * scale));
  const target = Math.round(100 * scale);
  const order = rawValues
    .map((value, index) => ({
      index,
      fraction: value * scale - Math.floor(value * scale)
    }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  let remainder = target - floors.reduce((sum, value) => sum + value, 0);

  while (remainder > 0) {
    let changed = false;
    for (const item of order) {
      const upper = Math.round(ranges[item.index].high * scale);
      if (floors[item.index] < upper) {
        floors[item.index] += 1;
        remainder -= 1;
        changed = true;
        if (remainder === 0) break;
      }
    }
    if (!changed) {
      throw new Error("cong_thuc_bach_cau_khong_kha_thi");
    }
  }

  while (remainder < 0) {
    let changed = false;
    for (const item of [...order].reverse()) {
      const lower = Math.round(ranges[item.index].low * scale);
      if (floors[item.index] > lower) {
        floors[item.index] -= 1;
        remainder += 1;
        changed = true;
        if (remainder === 0) break;
      }
    }
    if (!changed) {
      throw new Error("cong_thuc_bach_cau_khong_kha_thi");
    }
  }

  return floors.map((value) => value / scale);
}

function sampleDifferential(rng, pattern, sex) {
  boundsPermitDifferential(pattern, sex);

  const ranges = DIFFERENTIAL.map((key) => pattern.indices[key].ranges[sex]);
  const raw = ranges.map((range) => pick(rng, range.low, range.high));
  const rounded = largestRemainder(raw, ranges, 1);

  const valid = DIFFERENTIAL.every((key, index) =>
    inRange(rounded[index], pattern.indices[key].ranges[sex])
  );

  return valid
    ? Object.fromEntries(DIFFERENTIAL.map((key, index) => [key, rounded[index]]))
    : null;
}

function deriveCore(rng, pattern, sex) {
  const indices = pattern.indices;
  const hb = round(
    pick(rng, indices.Hb.ranges[sex].low, indices.Hb.ranges[sex].high),
    indices.Hb.precision ?? 1
  );
  const rbc = round(
    pick(rng, indices.RBC.ranges[sex].low, indices.RBC.ranges[sex].high),
    indices.RBC.precision ?? 2
  );
  const mcv = round(
    pick(rng, indices.MCV.ranges[sex].low, indices.MCV.ranges[sex].high),
    indices.MCV.precision ?? 1
  );

  const hct = round(rbc * mcv / 1000, indices.Hct.precision ?? 1);
  const mch = round(hb / rbc, indices.MCH.precision ?? 1);
  const mchc = round(hb / hct, indices.MCHC.precision ?? 1);

  const wbc = round(
    pick(rng, indices.WBC.ranges[sex].low, indices.WBC.ranges[sex].high),
    indices.WBC.precision ?? 2
  );
  const plt = round(
    pick(rng, indices.PLT.ranges[sex].low, indices.PLT.ranges[sex].high),
    indices.PLT.precision ?? 2
  );

  return { Hb: hb, RBC: rbc, Hct: hct, MCV: mcv, MCH: mch, MCHC: mchc, WBC: wbc, PLT: plt };
}

function buildDisplayProfiles(values) {
  const displayProfiles = {};

  for (const profile of Object.keys(PROFILES)) {
    displayProfiles[profile] = {};

    for (const key of INDICES) {
      const [unit, precision] = PROFILES[profile][key];
      displayProfiles[profile][key] = {
        value: round(convertFromInternal(key, values[key], profile), precision),
        unit
      };
    }

    for (const key of DIFFERENTIAL) {
      const absoluteKey = "abs_" + key;
      displayProfiles[profile][absoluteKey] = {
        value: values[absoluteKey],
        unit: PROFILES[profile].abs[0]
      };
    }
  }

  return displayProfiles;
}

function buildScenario({ pattern, scenario_id, sex, rng, generationAttempts }) {
  const core = deriveCore(rng, pattern, sex);
  const differential = sampleDifferential(rng, pattern, sex);

  if (!differential) {
    return null;
  }

  const values = { ...core, ...differential };

  if (!allIndicesInRange(values, pattern, sex)) {
    return null;
  }

  const absolute = {};
  for (const key of DIFFERENTIAL) {
    absolute["abs_" + key] = round(values.WBC * values[key] / 100, 2);
  }

  return {
    schema_version: pattern.schema_version,
    scenario_id,
    pattern_id: pattern.pattern_id,
    sex,
    values: { ...values, ...absolute },
    display_profiles: buildDisplayProfiles({ ...values, ...absolute }),
    internal_units: INTERNAL,
    generation_attempts: generationAttempts,
    classifications: classifyScenario(
      { values, sex },
      { indices: pattern.indices },
      sex
    )
  };
}

function seedRng(pattern, variant) {
  const schemaWithVariant = pattern.schema_version + "\u001f" + String(variant);
  return createSeededRng({
    caseId: pattern.pattern_id,
    module: "cbc",
    schemaVersion: schemaWithVariant
  });
}

export function generateScenario({
  pattern,
  variant = 0,
  scenario_id = "fixture",
  sex,
  profile = "vn_lab"
}) {
  requireSex(sex);
  requireRanges(pattern, sex);

  if (!Number.isInteger(variant) || variant < 0) {
    throw new Error("variant_invalid");
  }
  if (!PROFILES[profile]) {
    throw new Error("profile_invalid");
  }

  const rng = seedRng(pattern, variant);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const scenario = buildScenario({
      pattern,
      scenario_id,
      sex,
      rng,
      generationAttempts: attempt
    });

    if (!scenario) {
      continue;
    }

    if (pattern.expected_classifications) {
      for (const key of INDICES) {
        if (pattern.expected_classifications[key] !== scenario.classifications[key]) {
          throw new Error("expected_classification_mismatch:" + key);
        }
      }
    }

    return scenario;
  }

  throw new Error("khong_sinh_duoc_kich_ban");
}

/**
 * Convert a single CBC value between display profiles; internal units remain canonical.
 */
export function convertValue(key, value, fromProfile, toProfile) {
  const internal = convertToInternal(key, value, fromProfile);
  return convertFromInternal(key, internal, toProfile);
}

/**
 * Return the learner-facing CBC scenario without pattern or approval metadata.
 */
export function toPublicScenario(scenario, profile = "vn_lab") {
  if (!scenario?.display_profiles?.[profile]) {
    throw new Error("profile_missing");
  }

  const values = {};
  for (const key of INDICES) {
    values[key] = { ...scenario.display_profiles[profile][key] };
  }

  for (const key of DIFFERENTIAL) {
    values["abs_" + key] = { ...scenario.display_profiles[profile]["abs_" + key] };
  }

  return {
    scenario_id: scenario.scenario_id,
    sex: scenario.sex,
    values
  };
}

export { PROFILES, INDICES, INTERNAL, convertFromInternal, convertToInternal, MAX_ATTEMPTS };
