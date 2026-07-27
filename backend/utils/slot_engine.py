from datetime import datetime
import pytz

# All times are converted to 24-hour format for easy mathematical comparison.

THEORY_TIMES = [
    ("08:00", "08:50"), ("09:00", "09:50"), ("10:00", "10:50"), 
    ("11:00", "11:50"), ("12:00", "12:50"), 
    ("14:00", "14:50"), ("15:00", "15:50"), ("16:00", "16:50"), 
    ("17:00", "17:50"), ("18:00", "18:50"), ("19:01", "19:50")  
]

LAB_TIMES = [
    ("08:00", "08:50"), ("08:51", "09:40"), ("09:51", "10:40"), 
    ("10:41", "11:30"), ("11:40", "12:30"), ("12:31", "13:20"),
    ("14:00", "14:50"), ("14:51", "15:40"), ("15:51", "16:40"), 
    ("16:41", "17:30"), ("17:40", "18:30"), ("18:31", "19:20")
]

# The matrix maps the day to a tuple of (Theory Slots, Lab Slots)
DAY_MAP = {
    "Monday": (
        ["A1", "F1", "D1", "TB1", "TG1", "A2", "F2", "D2", "TB2", "TG2", "V3"],
        ["L1", "L2", "L3", "L4", "L5", "L6", "L31", "L32", "L33", "L34", "L35", "L36"]
    ),
    "Tuesday": (
        ["B1", "G1", "E1", "TC1", "TAA1", "B2", "G2", "E2", "TC2", "TAA2", "V4"],
        ["L7", "L8", "L9", "L10", "L11", "L12", "L37", "L38", "L39", "L40", "L41", "L42"]
    ),
    "Wednesday": (
        ["C1", "A1", "F1", "V1", "V2", "C2", "A2", "F2", "TD2", "TBB2", "V5"],
        ["L13", "L14", "L15", "L16", "L17", "L18", "L43", "L44", "L45", "L46", "L47", "L48"]
    ),
    "Thursday": (
        ["D1", "B1", "G1", "TE1", "TCC1", "D2", "B2", "G2", "TE2", "TCC2", "V6"],
        ["L19", "L20", "L21", "L22", "L23", "L24", "L49", "L50", "L51", "L52", "L53", "L54"]
    ),
    "Friday": (
        ["E1", "C1", "TA1", "TF1", "TD1", "E2", "C2", "TA2", "TF2", "TDD2", "V7"],
        ["L25", "L26", "L27", "L28", "L29", "L30", "L55", "L56", "L57", "L58", "L59", "L60"]
    ),
    "Saturday": ([], []),
    "Sunday": ([], [])
}

def get_current_active_slots():
    """
    Checks the current time in IST and returns a list of active FFCS slots.
    Because Theory and Lab times differ slightly, it might return ['F1', 'L3']
    """
    # Force the timezone to IST (Pimpri-Chinchwad/India) so it's immune to server timezone settings
    ist = pytz.timezone('Asia/Kolkata')
    now = datetime.now(ist)
    
    current_day = now.strftime("%A")
    current_time_str = now.strftime("%H:%M") 
    
    active_slots = []
    theory_slots_for_day, lab_slots_for_day = DAY_MAP.get(current_day, ([], []))
    
    # 1. Check if a Theory slot is happening right now
    for i, (start, end) in enumerate(THEORY_TIMES):
        if i < len(theory_slots_for_day) and start <= current_time_str <= end:
            active_slots.append(theory_slots_for_day[i])
            
    # 2. Check if a Lab slot is happening right now
    for i, (start, end) in enumerate(LAB_TIMES):
        if i < len(lab_slots_for_day) and start <= current_time_str <= end:
            active_slots.append(lab_slots_for_day[i])
            
    return active_slots

def check_user_status(subjects, active_slots):
    """
    Scans a user's database subjects against the currently active slots.
    """
    if not active_slots:
        return {"is_free": True, "message": "Free right now"}
        
    for sub in subjects:
        # Check Theory slots
        if sub.theory_slot:
            # We split by "+" just in case you ever save combined slots like "A1+TA1"
            sub_theory_list = sub.theory_slot.split("+") 
            for active in active_slots:
                if active in sub_theory_list:
                    return {
                        "is_free": False, 
                        "class_name": sub.name, 
                        "room": sub.room_number or "TBA",
                        "type": "Theory",
                        "slot": active
                    }
                    
        # Check Lab slots
        if sub.lab_slot:
            sub_lab_list = sub.lab_slot.split("+")
            for active in active_slots:
                if active in sub_lab_list:
                    return {
                        "is_free": False, 
                        "class_name": sub.name, 
                        "room": sub.room_number or "TBA",
                        "type": "Lab",
                        "slot": active
                    }
                    
    return {"is_free": True, "message": "Free right now"}