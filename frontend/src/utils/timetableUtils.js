export const DAYS = ["MON", "TUES", "WEDNES", "THURS", "FRI"];
export const TIMES = [
  "08:00 - 08:50", "09:00 - 09:50", "10:00 - 10:50", "11:00 - 11:50", "12:00 - 12:50",
  "LUNCH",
  "14:00 - 14:50", "15:00 - 15:50", "16:00 - 16:50", "17:00 - 17:50", "18:00 - 18:50"
];

export const MASTER_GRID = [
  ["A1/L1", "F1/L2", "D1/L3", "TB1/L4", "TG1/L5", "LUNCH", "A2/L31", "F2/L32", "D2/L33", "TB2/L34", "TG2/L35"], 
  ["B1/L7", "G1/L8", "E1/L9", "TC1/L10", "TAA1/L11", "LUNCH", "B2/L37", "G2/L38", "E2/L39", "TC2/L40", "TAA2/L41"], 
  ["C1/L13", "A1/L14", "F1/L15", "L16", "L17", "LUNCH", "C2/L43", "A2/L44", "F2/L45", "TD2/L46", "TBB2/L47"], 
  ["D1/L19", "B1/L20", "G1/L21", "TE1/L22", "TCC1/L23", "LUNCH", "D2/L49", "B2/L50", "G2/L51", "TE2/L52", "TCC2/L53"], 
  ["E1/L25", "C1/L26", "TA1/L27", "TF1/L28", "TD1/L29", "LUNCH", "E2/L55", "C2/L56", "TA2/L57", "TF2/L58", "TDD2/L59"], 
];

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