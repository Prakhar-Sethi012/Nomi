// Turns a raw copy-paste of a VTOP "Course Registration" / FFCS table into
// Subject-shaped objects this app already knows how to save (see
// schemas.SubjectCreate on the backend and TimetableView's manual "Add
// Subject" form). VTOP's own export has no stable delimiters — copy-pasting
// an HTML table collapses every cell onto its own line with a wildly
// inconsistent number of blank lines between them (varies by browser) — so
// instead of counting lines, each field is recognised by its own shape
// (a course-code header, a "( Type )" line, an all-caps slot/venue token,
// VIT's "VL##############" class id, ...) wherever it appears in the stream.
// Blank lines are stripped up front and never matter after that.

const CODE_TITLE_RE = /^([A-Z]{2,10}\d{2,4}[A-Z]?)\s*-\s*(.+)$/;
const TYPE_RE = /^\(\s*(.+?)\s*\)$/;
const LTPJC_RE = /^\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?){4}$/;
const CLASS_ID_RE = /^VL\d+$/;
// Shared shape for both a slot expression ("L3+L4+L29+L30") and a venue code
// ("SJT119") — VIT slots are almost always "+"-joined while venues are a
// single token, but that alone isn't reliable enough to tell them apart, so
// this only recognises the shape; ORDER (slot always precedes venue in the
// source table) is what actually disambiguates the two, below.
const CODE_TOKEN_RE = /^[A-Z]+\d+(?:\+[A-Z]+\d+)*\s*-?\s*$/;

const stripTrailingDash = (s) => s.replace(/-+\s*$/, '').trim();

function classifyComponent(rawType) {
  const t = rawType.toLowerCase();
  const isLab = t.includes('lab');
  const isTheory = t.includes('theory');
  if (isLab && !isTheory) return 'LAB';
  // "Theory Only", "Embedded Theory", and anything else we don't recognise
  // (e.g. "Soft Skill", which is structurally a single-slot theory-shaped
  // course in VTOP's own export) all behave the same way here: one slot,
  // filed under theory.
  return 'THEORY';
}

// Walks the pasted text once and pulls out one raw row per course/type
// combination (an Embedded course contributes two rows — Theory and Lab —
// same code, same title).
function extractRows(rawText) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = [];
  let current = null;

  const commitCurrent = () => {
    if (current && current.slot) rows.push(current);
    current = null;
  };

  for (const line of lines) {
    const codeMatch = line.match(CODE_TITLE_RE);
    if (codeMatch) {
      commitCurrent();
      current = {
        code: codeMatch[1],
        title: stripTrailingDash(codeMatch[2]),
        type: '',
        slot: '',
        venue: '',
        faculty: '',
      };
      continue;
    }

    if (!current) continue; // stray text before the first recognised course

    if (!current.type) {
      const typeMatch = line.match(TYPE_RE);
      if (typeMatch) {
        current.type = typeMatch[1].trim();
        continue;
      }
    }

    if (LTPJC_RE.test(line) || CLASS_ID_RE.test(line)) continue;

    if (current.type && !current.slot && CODE_TOKEN_RE.test(line)) {
      current.slot = stripTrailingDash(line);
      continue;
    }

    if (current.slot && !current.venue && CODE_TOKEN_RE.test(line)) {
      current.venue = stripTrailingDash(line);
      continue;
    }

    if (current.venue && !current.faculty && !CODE_TOKEN_RE.test(line)) {
      current.faculty = stripTrailingDash(line);
      continue;
    }
    // Everything after faculty (source system, dates, attendance type,
    // registration status) isn't something this app tracks — ignored.
  }
  commitCurrent();

  return rows;
}

// Merges an Embedded course's separate Theory/Lab rows into the single
// {theory_slot, lab_slot} shape SubjectCreate already expects (this is
// exactly what the existing "Add Subject" form's subject_type: 'EMBEDDED'
// option is for) — a Theory-Only or Lab-Only course just ends up with one
// side filled in.
function groupRows(rows) {
  const byCode = new Map();

  for (const row of rows) {
    if (!byCode.has(row.code)) {
      byCode.set(row.code, { code: row.code, title: row.title, theory: null, lab: null });
    }
    const entry = byCode.get(row.code);
    const component = { slot: row.slot, venue: row.venue, faculty: row.faculty };
    if (classifyComponent(row.type) === 'LAB') entry.lab = component;
    else entry.theory = component;
  }

  return Array.from(byCode.values()).map((entry) => {
    const subject_type = entry.theory && entry.lab ? 'EMBEDDED' : entry.lab ? 'LAB' : 'THEORY';
    return {
      name: `${entry.code} - ${entry.title}`,
      subject_type,
      theory_slot: entry.theory?.slot || '',
      lab_slot: entry.lab?.slot || '',
      room_number: entry.theory?.venue || entry.lab?.venue || '',
      // Not part of SubjectCreate (the backend has no column for it yet) —
      // carried along so the import preview can show who's teaching what,
      // and dropped before the actual save call.
      faculty: entry.theory?.faculty || entry.lab?.faculty || '',
    };
  });
}

// Parses a raw VTOP course-registration paste into Subject-shaped objects
// ready for api.addSubject (minus the `faculty` field — see groupRows above).
export function parseFFCSText(rawText) {
  if (!rawText || !rawText.trim()) return [];
  return groupRows(extractRows(rawText));
}
