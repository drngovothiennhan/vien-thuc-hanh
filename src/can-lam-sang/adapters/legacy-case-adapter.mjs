import overrideConfig from '../../../data/can-lam-sang/legacy-content-overrides.json' with { type: 'json' };
import { createSeededRng } from '../lib/seeded-rng.mjs';

const PUBLIC_SCHEMA_VERSION = '1.0.0';
const ANSWER_SCHEMA_VERSION = '1.0.0';
const RESOURCE_SCHEMA_VERSION = '1.0.0';
const LEGACY_REVIEW_STATUS = 'CHUA_DUYET';
const BLOCKING_DIAGNOSIS_GROUPS = Object.freeze(['ydx', 'bd', 'bc', 'the']);

const SOURCE_TYPE = Object.freeze({
  pubmed: 'article',
  huong_dan_web: 'guideline',
  van_ban_byt: 'regulation',
  sach_giao_trinh: 'textbook'
});

const SHA256_K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);

const safeText = value => value == null ? '' : String(value);
const rotr = (value, bits) => (value >>> bits) | (value << (32 - bits));

export function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value));
  const bitLength = bytes.length * 8;
  const totalLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(totalLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(totalLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(totalLength - 4, bitLength >>> 0, false);

  const state = new Uint32Array([
    0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
    0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19
  ]);
  const words = new Uint32Array(64);

  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) words[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const a = words[i - 15];
      const b = words[i - 2];
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
    }

    let [a,b,c,d,e,f,g,h] = state;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + s1 + ch + SHA256_K[i] + words[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  return Array.from(state, n => n.toString(16).padStart(8, '0')).join('');
}

function requireLegacyCase(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('legacy case must be an object');
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(safeText(input.id))) throw new TypeError('legacy case id invalid');
  return input;
}

function requireFiniteVitals(vitals) {
  const v = vitals && typeof vitals === 'object' ? vitals : {};
  for (const key of ['hr', 'sbp', 'dbp', 'rr', 't', 'spo2']) {
    if (typeof v[key] !== 'number' || !Number.isFinite(v[key])) {
      throw new TypeError(`legacy case vital ${key} must be a finite number`);
    }
  }
  return v;
}

function normalizeId(value) {
  const x = safeText(value).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return x || 'unknown';
}

function normalizeExact(value) {
  return safeText(value).normalize('NFC').toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ').trim();
}

function isWordChar(value) {
  return typeof value === 'string' && value.length > 0 && /[\\p{L}\\p{N}_]/u.test(value);
}

export function hasWordBoundedMatch(value, choice) {
  const haystack = normalizeExact(value);
  const needle = normalizeExact(choice);
  if (needle.length <= 5) return false;
  let index = haystack.indexOf(needle);
  while (index >= 0) {
    const before = index === 0 ? '' : haystack[index - 1];
    const end = index + needle.length;
    const after = end >= haystack.length ? '' : haystack[end];
    if (!isWordChar(before) && !isWordChar(after)) return true;
    index = haystack.indexOf(needle, index + 1);
  }
  return false;
}

function sourceFor(caseId, sourceText, verification, index) {
  const source = verification?.url
    || (verification?.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${verification.pmid}/` : '')
    || sourceText
    || `legacy:${caseId}:${index}`;
  const id = verification?.id ? `legacy-${normalizeId(verification.id)}` : `legacy-${normalizeId(caseId)}-${index + 1}`;
  return {
    schema_version: RESOURCE_SCHEMA_VERSION,
    resource_id: id,
    resource_type: SOURCE_TYPE[verification?.loai] || 'other',
    source,
    title: sourceText || id,
    organization: null,
    year_version: null,
    citation: sourceText || source,
    checked_date: null,
    reviewer: null,
    review_status: LEGACY_REVIEW_STATUS,
    license: null,
    provenance_tags: ['legacy_unverified']
  };
}

function legacyResources(c) {
  const sources = Array.isArray(c.nguon) ? c.nguon : [];
  const checks = Array.isArray(c.nguon_kiem) ? c.nguon_kiem : [];
  const out = [];
  const seen = new Set();
  sources.forEach((sourceText, index) => {
    const verification = checks.find(item => item && item.i === index) || null;
    const resource = sourceFor(c.id, safeText(sourceText), verification, index);
    if (!seen.has(resource.resource_id)) {
      seen.add(resource.resource_id);
      out.push(resource);
    }
  });
  return out;
}

function diagnosisChoice(raw) {
  const text = safeText(raw);
  if (text.startsWith('+')) return { text: text.slice(1), credit: 'full' };
  if (text.startsWith('~')) return { text: text.slice(1), credit: 'partial' };
  return { text, credit: 'none' };
}

export function blockingDiagnosisChoices(diagnosisOptions) {
  const out = [];
  for (const group of BLOCKING_DIAGNOSIS_GROUPS) {
    const choices = diagnosisOptions[group];
    if (!Array.isArray(choices)) continue;
    for (const choice of choices) {
      if (!choice || !['full', 'partial'].includes(choice.credit)) continue;
      if (normalizeExact(choice.text).length > 5) out.push({ group, ...choice });
    }
  }
  return out;
}

function protectTitle(caseId, title, diagnosisOptions) {
  const original = safeText(title);
  const leaked = blockingDiagnosisChoices(diagnosisOptions).some(choice => hasWordBoundedMatch(original, choice.text));
  return leaked
    ? { publicTitle: `Ca bệnh ${caseId}`, titleReveal: original }
    : { publicTitle: original, titleReveal: null };
}

function actionChoice(raw) {
  const text = safeText(raw);
  const marker = text.startsWith('++') ? '++' : ['+','-','!'].includes(text[0]) ? text[0] : '';
  const body = marker ? text.slice(marker.length) : text;
  const [label = '', minutes = '0', ...why] = body.split('|');
  const grade = marker === '++' ? 'critical'
    : marker === '+' ? 'recommended'
    : marker === '-' ? 'waste'
    : marker === '!' ? 'harmful'
    : 'neutral';
  const time = Number(minutes);
  return {
    text: label,
    time_minutes: Number.isFinite(time) && time >= 0 ? time : 0,
    grade,
    rationale: why.join('|')
  };
}

function trackOf(c) {
  if (['noi','ngoai','yhct'].includes(c.track)) return c.track;
  if (c.opt && c.opt.bd) return 'yhct';
  if (c.group === 'ngoai' || c.id === 'thai-ngoai-tu-cung-vo') return 'ngoai';
  return 'noi';
}

function modeOf(c) {
  if (c.mode === 'tay' || c.mode === 'dongtay') return c.mode;
  return c.setting === 'capcuu' || c.setting === 'giuong' ? 'tay' : 'dongtay';
}

function parseInvestigationPath(path) {
  const match = /^investigations\[(\d+)\]\.(name|result)$/.exec(path);
  if (!match) throw new TypeError(`unsupported legacy content override path: ${path}`);
  return { index: Number(match[1]), field: match[2] };
}

function originalAtOverridePath(c, path) {
  const { index, field } = parseInvestigationPath(path);
  const row = Array.isArray(c.tests) ? c.tests[index] : undefined;
  if (!Array.isArray(row)) throw new TypeError(`${c.id}: override path missing: ${path}`);
  const value = row[field === 'name' ? 0 : 2];
  if (typeof value !== 'string') throw new TypeError(`${c.id}: override target must be a string: ${path}`);
  return value;
}

function applyOverrides(c) {
  const fieldValues = new Map();
  const afterSubmissionNotes = [];
  const matching = overrideConfig.overrides.filter(item => item.case_id === c.id);

  for (const override of matching) {
    if (override.status !== LEGACY_REVIEW_STATUS) throw new TypeError(`${c.id}: override status must be CHUA_DUYET`);
    const original = originalAtOverridePath(c, override.path);
    const actualSha = sha256Hex(original);
    if (actualSha !== override.original_sha256) {
      throw new Error(`${c.id}: override sha256 mismatch at ${override.path}; expected ${override.original_sha256}, got ${actualSha}`);
    }

    if (override.op === 'move_to_after_submission') {
      fieldValues.set(override.path, '');
      afterSubmissionNotes.push({ path: override.path, text: original, reason: override.reason });
      continue;
    }

    if (override.op === 'remove_substring') {
      const remove = override.remove_substring;
      if (typeof remove !== 'string' || remove.length === 0) throw new TypeError(`${c.id}: remove_substring text missing at ${override.path}`);
      const first = original.indexOf(remove);
      const last = original.lastIndexOf(remove);
      if (first < 0 || first !== last) throw new Error(`${c.id}: remove_substring must occur exactly once at ${override.path}`);
      const next = original.slice(0, first) + original.slice(first + remove.length);
      if (next.length > original.length) throw new Error(`${c.id}: override unexpectedly lengthened ${override.path}`);
      fieldValues.set(override.path, next);
      continue;
    }

    throw new TypeError(`${c.id}: unsupported override op ${override.op}`);
  }

  return { fieldValues, afterSubmissionNotes };
}

function investigationValue(overrides, index, field, fallback) {
  const path = `investigations[${index}].${field}`;
  return overrides.has(path) ? overrides.get(path) : fallback;
}

function shuffleTextChoices(values, rng) {
  const unique = [...new Map((Array.isArray(values) ? values : []).map(value => [safeText(value), safeText(value)])).values()];
  for (let i = unique.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  return unique;
}

function publicChoices(caseId, diagnosisOptions, actionOptions) {
  const rng = createSeededRng({ caseId, module: 'core', schemaVersion: PUBLIC_SCHEMA_VERSION });
  const diagnosis = {};
  for (const [group, options] of Object.entries(diagnosisOptions)) {
    diagnosis[group] = shuffleTextChoices(options.map(option => option.text), rng);
  }
  return { diagnosis, actions: shuffleTextChoices(actionOptions.map(option => option.text), rng) };
}

function redactAnswerText(publicBundle, answerKey) {
  const secrets = [
    answerKey.teaching_explanation,
    ...(answerKey.action_options || []).map(option => option.rationale),
    ...(answerKey.after_submission_notes || []).flatMap(note => [note.text, note.reason])
  ].filter(value => typeof value === 'string' && value.length > 5);
  const notes = [];
  const walk = (node, path) => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, path + '[' + index + ']'));
    } else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (key === 'choices') continue;
        if (typeof value === 'string') {
          let next = value;
          for (const secret of secrets) {
            if (next.includes(secret)) {
              notes.push({ path: path + '.' + key, text: secret, reason: 'server_only_answer_text' });
              next = next.split(secret).join('');
            }
          }
          node[key] = next;
        } else {
          walk(value, path + '.' + key);
        }
      }
    }
  };
  walk(publicBundle, '$');
  return notes;
}

export function adaptLegacyCase(input) {
  const c = requireLegacyCase(input);
  const v = requireFiniteVitals(c.vitals);
  const diagnosisOptions = {};
  for (const key of ['ydx','bd','bc','the','phap','phuong','huyet']) {
    if (Array.isArray(c.opt?.[key])) diagnosisOptions[key] = c.opt[key].map(diagnosisChoice);
  }
  const title = protectTitle(c.id, c.title, diagnosisOptions);
  const overrideResult = applyOverrides(c);
  const actionOptions = (Array.isArray(c.actions) ? c.actions : []).map(actionChoice);

  const public_bundle = {
    schema_version: PUBLIC_SCHEMA_VERSION,
    case_id: c.id,
    data_origin: 'synthetic',
    review_status: LEGACY_REVIEW_STATUS,
    title: title.publicTitle,
    setting: c.setting,
    level: c.level,
    track: trackOf(c),
    mode: modeOf(c),
    specialty: c.specialty ?? c.chuyen_khoa ?? null,
    demographics: {
      age: c.age,
      sex: c.sex,
      patient_label: safeText(c.name)
    },
    presentation: {
      intro: safeText(c.intro),
      place: c.place == null ? null : safeText(c.place),
      clock: c.clock == null ? null : safeText(c.clock),
      night: Boolean(c.night)
    },
    vitals: {
      hr: v.hr,
      sbp: v.sbp,
      dbp: v.dbp,
      rr: v.rr,
      temperature_c: v.t,
      spo2: v.spo2
    },
    history: (Array.isArray(c.ask) ? c.ask : []).map(item => ({
      question: safeText(item?.[0]),
      response: safeText(item?.[1])
    })),
    examination: (Array.isArray(c.exam) ? c.exam : []).map(item => ({
      group: safeText(item?.[0]),
      item: safeText(item?.[1]),
      finding: safeText(item?.[2])
    })),
    investigations: (Array.isArray(c.tests) ? c.tests : []).map((item, index) => ({
      name: investigationValue(overrideResult.fieldValues, index, 'name', safeText(item?.[0])),
      duration_minutes: Number.isFinite(Number(item?.[1])) ? Number(item[1]) : 0,
      result: investigationValue(overrideResult.fieldValues, index, 'result', safeText(item?.[2]))
    })),
    choices: publicChoices(c.id, diagnosisOptions, actionOptions)
  };

  const answer_key = {
    schema_version: ANSWER_SCHEMA_VERSION,
    case_id: c.id,
    server_only: true,
    title_reveal: title.titleReveal,
    resources_after_submission: legacyResources(c),
    after_submission_notes: overrideResult.afterSubmissionNotes,
    history_essential_indices: (Array.isArray(c.ask) ? c.ask : []).flatMap((item, index) => item?.[2] === 'e' ? [index] : []),
    examination_essential_indices: (Array.isArray(c.exam) ? c.exam : []).flatMap((item, index) => item?.[3] === 'e' ? [index] : []),
    investigation_roles: (Array.isArray(c.tests) ? c.tests : []).map((item, index) => ({
      index,
      role: item?.[3] === 'e' ? 'essential' : item?.[3] === 'w' ? 'waste' : 'neutral'
    })),
    diagnosis_options: diagnosisOptions,
    action_options: actionOptions,
    teaching_explanation: safeText(c.teach)
  };

  answer_key.after_submission_notes.push(...redactAnswerText(public_bundle, answer_key));
  return { public_bundle, answer_key };
}

export default adaptLegacyCase;
