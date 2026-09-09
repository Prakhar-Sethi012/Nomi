export const DAYS = ["MON", "TUES", "WEDNES", "THURS", "FRI"];

// ==========================================================================
// FFCS SOURCE DATA — must mirror backend/utils/slot_engine.py's THEORY_TIMES,
// LAB_TIMES and DAY_MAP exactly. MASTER_GRID/TIMES below are DERIVED from
// this data rather than hand-maintained, so the two sides can't silently
// drift out of sync the way a second hardcoded grid would.
// ==========================================================================
const THEORY_TIMES = [
  "08:00 - 08:50", "09:00 - 09:50", "10:00 - 10:50", "11:00 - 11:50", "12:00 - 12:50",
  "14:00 - 14:50", "15:00 - 15:50", "16:00 - 16:50", "17:00 - 17:50", "18:00 - 18:50",
  "19:01 - 19:50"
];
const LAB_TIMES = [
  "08:00 - 08:50", "08:51 - 09:40", "09:51 - 10:40", "10:41 - 11:30", "11:40 - 12:30", "12:31 - 13:20",
  "14:00 - 14:50", "14:51 - 15:40", "15:51 - 16:40", "16:41 - 17:30", "17:40 - 18:30", "18:31 - 19:20"
];

// Each day's theory list is 11 codes (5 morning, 5 afternoon, 1 evening "V" slot);
// each lab list is 12 codes (6 morning, 6 afternoon — there's no evening lab).
const DAY_SLOTS = {
  MON: {
    theory: ["A1", "F1", "D1", "TB1", "TG1", "A2", "F2", "D2", "TB2", "TG2", "V3"],
    lab: ["L1", "L2", "L3", "L4", "L5", "L6", "L31", "L32", "L33", "L34", "L35", "L36"]
  },
  TUES: {
    theory: ["B1", "G1", "E1", "TC1", "TAA1", "B2", "G2", "E2", "TC2", "TAA2", "V4"],
    lab: ["L7", "L8", "L9", "L10", "L11", "L12", "L37", "L38", "L39", "L40", "L41", "L42"]
  },
  WEDNES: {
    theory: ["C1", "A1", "F1", "V1", "V2", "C2", "A2", "F2", "TD2", "TBB2", "V5"],
    lab: ["L13", "L14", "L15", "L16", "L17", "L18", "L43", "L44", "L45", "L46", "L47", "L48"]
  },
  THURS: {
    theory: ["D1", "B1", "G1", "TE1", "TCC1", "D2", "B2", "G2", "TE2", "TCC2", "V6"],
    lab: ["L19", "L20", "L21", "L22", "L23", "L24", "L49", "L50", "L51", "L52", "L53", "L54"]
  },
  FRI: {
    theory: ["E1", "C1", "TA1", "TF1", "TD1", "E2", "C2", "TA2", "TF2", "TDD2", "V7"],
    lab: ["L25", "L26", "L27", "L28", "L29", "L30", "L55", "L56", "L57", "L58", "L59", "L60"]
  }
};

// Combines the theory/lab code sharing a column into one "/"-joined cell
// string (matching what slotExistsInCell below expects), dropping whichever
// side doesn't have a slot in that column.
const buildCell = (theoryCode, labCode) => [theoryCode, labCode].filter(Boolean).join('/');

// A session (morning or afternoon) has 5 theory slots but 6 lab slots — labs
// run shorter, tighter periods — so the 6th column in each session is always
// lab-only. Ordinal position pairs theory[i] with lab[i], not exact time
// overlap (theory and lab periods for the "same" column don't align exactly
// either — this is the same approximation VIT's own grid uses).
const buildDayRow = ({ theory, lab }) => {
  const morningTheory = theory.slice(0, 5);
  const afternoonTheory = theory.slice(5, 10);
  const eveningTheory = theory[10];
  const morningLab = lab.slice(0, 6);
  const afternoonLab = lab.slice(6, 12);

  const row = [];
  const timesRow = [];

  for (let i = 0; i < 6; i++) {
    row.push(buildCell(morningTheory[i], morningLab[i]));
    timesRow.push(morningTheory[i] !== undefined ? THEORY_TIMES[i] : LAB_TIMES[i]);
  }
  row.push("LUNCH");
  timesRow.push("LUNCH");
  for (let i = 0; i < 6; i++) {
    row.push(buildCell(afternoonTheory[i], afternoonLab[i]));
    timesRow.push(afternoonTheory[i] !== undefined ? THEORY_TIMES[5 + i] : LAB_TIMES[6 + i]);
  }
  row.push(buildCell(eveningTheory, undefined));
  timesRow.push(THEORY_TIMES[10]);

  return { row, timesRow };
};

const _builtRows = DAYS.map(day => buildDayRow(DAY_SLOTS[day]));

export const TIMES = _builtRows[0].timesRow; // identical column layout across all days
export const MASTER_GRID = _builtRows.map(b => b.row);

export const slotExistsInCell = (userSlots, cellData) => {
  if (!userSlots || cellData === "LUNCH") return false;
  const slotsArray = userSlots.split('+').map(s => s.trim().toUpperCase());
  const cellSlots = cellData.split('/');
  return slotsArray.some(s => cellSlots.includes(s));
};

const SUBJECT_COLORS = ['bg-indigo-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-cyan-600', 'bg-fuchsia-600'];

// Shared across TimetableView and ReadOnlyTimetable so the grid-cell math lives in one place.
export const getSubjectColor = (id) => SUBJECT_COLORS[id % SUBJECT_COLORS.length];

export const getSubjectForCell = (cellData, subjects) => {
  if (cellData === "LUNCH") return { type: "LUNCH" };

  const owner = subjects.find(sub =>
    slotExistsInCell(sub.theory_slot, cellData) || slotExistsInCell(sub.lab_slot, cellData)
  );

  if (owner) return { type: "SUBJECT", data: owner };
  return { type: "EMPTY", data: cellData };
};

const JS_DAY_NAMES = ["SUN", "MON", "TUES", "WEDNES", "THURS", "FRI", "SAT"];

// Is the class in this grid cell (dayName + "HH:MM - HH:MM" timeString) happening right now?
export const isClassActiveNow = (dayName, timeString, now = new Date()) => {
  const currentDayName = JS_DAY_NAMES[now.getDay()];
  if (dayName !== currentDayName) return false;

  try {
    const [startStr, endStr] = timeString.split(" - ");
    if (!startStr || !endStr) return false;

    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = startStr.split(":").map(Number);
    const startTotalMinutes = startH * 60 + startM;
    const [endH, endM] = endStr.split(":").map(Number);
    const endTotalMinutes = endH * 60 + endM;

    return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
  } catch (e) {
    return false;
  }
};

// The grid column nearest "now" — the first column whose end time hasn't
// passed yet, so it reads as "currently in" during a class and "coming up
// next" between them. Day-independent: TIMES is the same across every day.
export const getCurrentTimeColumnIndex = (times = TIMES, now = new Date()) => {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < times.length; i++) {
    if (times[i] === 'LUNCH') continue;
    const [startStr, endStr] = times[i].split(' - ');
    if (!startStr || !endStr) continue;

    const [endH, endM] = endStr.split(':').map(Number);
    if (currentMinutes <= endH * 60 + endM) return i;
  }

  return times.length - 1;
};

// Returns an array of classes for a specific date (defaults to today)
export const getTodayClasses = (subjects, dateObj = new Date()) => {
  const jsDay = dateObj.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  if (jsDay === 0 || jsDay === 6) return []; // It's the weekend!

  const rIndex = jsDay - 1; // Map JS Day to our MASTER_GRID index
  const dayRow = MASTER_GRID[rIndex];
  const todayClasses = [];

  dayRow.forEach((cellStr, cIndex) => {
    if (cellStr === "LUNCH") return;

    const owner = subjects.find(sub => 
      slotExistsInCell(sub.theory_slot, cellStr) || slotExistsInCell(sub.lab_slot, cellStr)
    );

    if (owner) {
      todayClasses.push({
        timeStr: TIMES[cIndex],
        slot: cellStr,
        subject: owner
      });
    }
  });

  return todayClasses;
};

// Calculates if a class is happening right now, or what is coming next
export const getNextClassInfo = (todayClasses, dateObj = new Date()) => {
  if (todayClasses.length === 0) return { status: 'FREE_DAY' };

  const currentTotalMinutes = dateObj.getHours() * 60 + dateObj.getMinutes();

  for (let i = 0; i < todayClasses.length; i++) {
    const cls = todayClasses[i];
    const [startStr, endStr] = cls.timeStr.split(" - ");
    
    const [startH, startM] = startStr.split(":").map(Number);
    const [endH, endM] = endStr.split(":").map(Number);
    
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    // We are currently sitting in this class
    if (currentTotalMinutes >= startMins && currentTotalMinutes <= endMins) {
      return { status: 'CURRENT', classInfo: cls, minutesLeft: endMins - currentTotalMinutes };
    }

    // This class is in the future
    if (currentTotalMinutes < startMins) {
      return { status: 'NEXT', classInfo: cls, minutesUntil: startMins - currentTotalMinutes };
    }
  }

  // If we loop through everything and find nothing in the future, the day is over
  return { status: 'DONE' };
};