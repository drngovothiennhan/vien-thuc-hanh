const SEXES = new Set(["nam", "nữ"]);
const KEYS = [
  "Hb", "RBC", "Hct", "MCV", "MCH", "MCHC", "WBC", "PLT",
  "neut", "lymph", "mono", "eos", "baso"
];

/**
 * Classify one CBC index in its internal unit.
 */
export function classifyValue(value, range, sex) {
  if (!SEXES.has(sex)) {
    throw new Error("sex_thieu_hoac_khong_hop_le");
  }
  if (!range || !Number.isFinite(range.low) || !Number.isFinite(range.high)) {
    throw new Error("reference_chua_co");
  }
  if (value < range.low) {
    return "thap";
  }
  if (value > range.high) {
    return "cao";
  }
  return "binh_thuong";
}

/**
 * Classify all 13 learner-facing CBC indices using the scenario's internal values.
 */
export function classifyScenario(scenario, reference, sex) {
  if (!scenario || !reference) {
    throw new Error("scenario_reference_required");
  }
  if (scenario.sex !== sex || !SEXES.has(sex)) {
    throw new Error("sex_mismatch");
  }

  const result = {};

  for (const key of KEYS) {
    const item = reference.indices[key];
    if (!item?.ranges?.[sex]) {
      throw new Error("reference_thieu_gioi:" + key);
    }
    result[key] = classifyValue(scenario.values[key], item.ranges[sex], sex);
  }

  return result;
}
