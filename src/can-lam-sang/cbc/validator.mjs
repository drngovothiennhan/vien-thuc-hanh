import { convertToInternal, convertFromInternal, PROFILES } from "./generator.mjs";

/**
 * Build the display-precision interval for a value.
 */
function interval(value, precision) {
  const halfStep = 0.5 * 10 ** (-precision);
  return [value - halfStep, value + halfStep];
}

/**
 * Divide two positive closed intervals.
 */
function divInterval(a, b) {
  const values = [
    a[0] / b[0],
    a[0] / b[1],
    a[1] / b[0],
    a[1] / b[1]
  ];
  return [Math.min(...values), Math.max(...values)];
}

/**
 * Check whether two closed intervals overlap.
 */
function overlaps(a, b) {
  return a[0] <= b[1] + 1e-12 && b[0] <= a[1] + 1e-12;
}

/**
 * Validate CBC arithmetic invariants using display-precision interval arithmetic.
 */
export function validateInvariants(scenario, profile = "vn_lab") {
  const display = scenario.display_profiles?.[profile];

  if (!display) {
    throw new Error("profile_missing");
  }

  const profileSpec = PROFILES[profile];
  const get = (key) => interval(display[key].value, profileSpec[key][1]);

  const hb = get("Hb");
  const hbInternal = profile === "conventional"
    ? hb.map((value) => value * 10)
    : hb;
  const rbc = get("RBC");

  const mchExpected = divInterval(hbInternal, rbc);
  if (!overlaps(get("MCH"), mchExpected)) {
    throw new Error("MCH_interval_failed");
  }

  const mcv = get("MCV");
  const hctExpected = [
    rbc[0] * mcv[0] / 1000,
    rbc[1] * mcv[1] / 1000
  ];

  if (!overlaps(get("Hct"), hctExpected.map((value) => value * 100))) {
    throw new Error("Hct_interval_failed");
  }

  const mchcExpected = divInterval(hbInternal, hctExpected);
  const mchcDisplay = profile === "conventional"
    ? mchcExpected.map((value) => value / 10)
    : mchcExpected;

  if (!overlaps(get("MCHC"), mchcDisplay)) {
    throw new Error("MCHC_interval_failed");
  }

  const differential = ["neut", "lymph", "mono", "eos", "baso"];
  const sum = differential.reduce((total, key) => total + display[key].value, 0);

  if (Math.abs(sum - 100) > 10 ** (-profileSpec.neut[1]) / 2) {
    throw new Error("differential_sum_failed");
  }

  const wbc = display.WBC.value;

  for (const key of differential) {
    const actual = interval(display["abs_" + key].value, profileSpec.abs[1]);
    const expected = [
      wbc * display[key].value / 100,
      wbc * display[key].value / 100
    ];

    if (!overlaps(actual, expected)) {
      throw new Error("absolute_differential_failed:" + key);
    }
  }

  return true;
}

/**
 * Round-trip one value through two display profiles without changing internal units.
 */
export function roundTripUnit(key, value, fromProfile, toProfile) {
  const internal = convertToInternal(key, value, fromProfile);
  const displayed = convertFromInternal(key, internal, toProfile);
  return convertToInternal(key, displayed, toProfile);
}
