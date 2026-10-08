import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LEARNER_APPROVED_STATUS = "DA_DUYET";
const REVIEWERS_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../data/can-lam-sang/reviewers.json"
);

function loadReviewers() {
  const document = JSON.parse(fs.readFileSync(REVIEWERS_PATH, "utf8"));
  return new Set(document.reviewers.map((item) => item.reviewer));
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function referenceMetadataApproved(reference) {
  const required = [
    "resource_id",
    "type",
    "source",
    "document_name",
    "agency",
    "year_or_version",
    "citation",
    "checked_at",
    "reviewer",
    "approval_status",
    "license"
  ];

  return required.every((key) => {
    const value = reference?.[key];
    return typeof value === "string" && value.trim().length > 0;
  }) && reference.approval_status === LEARNER_APPROVED_STATUS;
}

/**
 * Assert that a CBC pattern is fully approved for learner-facing use.
 */
export function assertLearnerApproved(pattern) {
  if (!pattern || pattern.review_status !== LEARNER_APPROVED_STATUS) {
    throw new Error("pattern_chua_duyet");
  }

  if (typeof pattern.reviewer !== "string" || !loadReviewers().has(pattern.reviewer)) {
    throw new Error("reviewer_chua_duoc_uy_quyen");
  }

  if (!isIsoDate(pattern.approved_at)) {
    throw new Error("approved_at_khong_hop_le");
  }

  if (typeof pattern.approval_ref !== "string" || pattern.approval_ref.trim().length === 0) {
    throw new Error("approval_ref_thieu");
  }

  if (!referenceMetadataApproved(pattern.reference)) {
    throw new Error("nguon_pattern_chua_du_metadata_A7");
  }

  return true;
}

/**
 * Assert that a fixture can never be opened to learners.
 */
export function assertFixtureNeverLearner(pattern) {
  if (
    pattern?.review_status === "FIXTURE_ONLY" ||
    String(pattern?.pattern_id || "").startsWith("FIXTURE-")
  ) {
    throw new Error("fixture_only");
  }

  return assertLearnerApproved(pattern);
}
