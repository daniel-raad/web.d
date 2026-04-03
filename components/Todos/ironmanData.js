// 21-Week Ironman 70.3 Training Plan
// Phases: Base Building (1-6), Build Phase (7-14), Peak Phase (15-18), Taper (19-21)

const S = "Swim", B = "Bike", R = "Run", C = "Core", ST = "Strength", F = "Flexibility", AR = "Active Recovery", REST = "Rest"

export const PHASES = [
  { name: "Base Building", weeks: [1, 6], color: "#22c55e" },
  { name: "Build Phase", weeks: [7, 14], color: "#f59e0b" },
  { name: "Peak Phase", weeks: [15, 18], color: "#ef4444" },
  { name: "Taper", weeks: [19, 21], color: "#8b5cf6" },
]

export const WEEKS = [
  // ===== PHASE 1: BASE BUILDING (Weeks 1-6) =====
  {
    week: 1, phase: "Base Building", title: "Foundation + Half Marathon", hours: 6.0,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "1500m", z: "Z2", workout: "Warm-up: 300m easy (200m freestyle + 4x25m build). Main: 8x100m Z2 steady. Cool-down: 300m easy choice", sets: "8x100m", rest: "15s", purpose: "Aerobic capacity building. Long strokes, bilateral breathing every 3rd stroke" },
        { d: C, dur: "15 min", z: "-", workout: "Planks: 3x30s standard + 2x10 single-arm reaches. Side Planks: 2x20s each side + 10 hip dips. Dead Bugs: 2x10 each side, 3s holds", sets: "3 sets each", rest: "30s", purpose: "Anti-extension strength for swim body position" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "45 min", z: "Z2", workout: "Warm-up: 10min easy + 3x1min builds. Main: 30min steady Z2. Cool-down: 5min easy", sets: "1x30min", rest: "-", purpose: "Aerobic base development. Target: 85-95 RPM, smooth pedal stroke" },
        { d: ST, dur: "30 min", z: "-", workout: "Goblet Squats: 3x12-15. Walking Lunges: 3x10 each leg. Push-ups: 3x8-15. Bent Rows: 3x12-15", sets: "3 sets each", rest: "60-90s", purpose: "Foundation strength patterns. Perfect form over weight/reps" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "30 min", z: "Z2", workout: "Warm-up: 10min easy + 4x15s strides. Main: 15min steady Z2. Cool-down: 5min walk/easy jog", sets: "1x15min", rest: "-", purpose: "Movement pattern establishment. Midfoot landing, 180 steps/min cadence" },
        { d: F, dur: "15 min", z: "-", workout: "Hip Flexor Stretch: 2x30s each leg. Hamstring Stretch: 2x30s each leg. Calf Stretch: 2x30s each leg. IT Band: 2x30s each side", sets: "2 sets each", rest: "-", purpose: "Mobility maintenance for tri-specific positions" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "1800m", z: "Z2", workout: "Warm-up: 400m easy (300m free + 4x25m drill). Main: 6x200m Z2 steady. Cool-down: 200m easy", sets: "6x200m", rest: "30s", purpose: "Volume progression with technique focus. Practice sighting every 6 strokes" },
      ]},
      { day: "Friday", sessions: [
        { d: REST, dur: "-", z: "-", workout: "Complete physical and mental rest", sets: "-", rest: "-", purpose: "Recovery and adaptation. Light meal prep and hydration focus" },
      ]},
      { day: "Saturday", sessions: [
        { d: R, dur: "20 min", z: "Z1-Z2", workout: "Pre-race shakeout: 10min easy jog + 4x15s strides. 5min walk. Dynamic stretches", sets: "4x15s strides", rest: "45s easy", purpose: "Pre-race activation. Loosen legs, stay fresh for tomorrow's half marathon" },
      ]},
      { day: "Sunday", sessions: [
        { d: "RACE", dur: "Half Marathon (21km)", z: "Race", workout: "Half marathon race. Warm-up: 10min easy jog + dynamic stretches. Race: 21km. Cool-down: 10min walk + stretching", sets: "-", rest: "-", purpose: "Half marathon race. Conservative first 10km, build through second half. Practice pacing and nutrition strategy for Ironman" },
      ]},
    ],
  },
  {
    week: 2, phase: "Base Building", title: "Consistency Building", hours: 6.5,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "1600m", z: "Z2", workout: "Warm-up: 400m easy (300m free + 4x25m build). Main: 6x150m Z2 build pace. Cool-down: 300m easy", sets: "6x150m", rest: "20s", purpose: "Volume increase with pace variation. Last 50m slightly faster" },
        { d: C, dur: "15 min", z: "-", workout: "Planks: 3x35s + single-arm/leg variations. Side Planks: 2x25s each + 12 hip dips. Dead Bugs: 2x12 each side. Bird Dogs: 2x10 each side, 3s holds", sets: "3 sets each", rest: "30s", purpose: "Progression from Week 1. Add complexity while maintaining form" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "50 min", z: "Z2-Z3", workout: "Warm-up: 10min easy + 3x1min builds. Main: 3x5min Z3 efforts. Cool-down: 5min easy", sets: "3x5min", rest: "5min Z2", purpose: "Lactate threshold introduction. Z3 should feel comfortably hard" },
        { d: ST, dur: "30 min", z: "-", workout: "Goblet Squats: 3x15 (add 5-10lbs if easy). Reverse Lunges: 3x12 each leg. Push-ups: 3x10-18. Single-arm Rows: 3x12 each arm", sets: "3 sets each", rest: "60-90s", purpose: "Strength progression. Increase reps or resistance from Week 1" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "35 min", z: "Z2", workout: "Warm-up: 10min easy + 6x15s strides. Main: 20min steady Z2. Cool-down: 5min walk", sets: "4x30s", rest: "90s easy jog", purpose: "Stride development. 30s strides at mile pace effort" },
        { d: F, dur: "15 min", z: "-", workout: "Dynamic Flow: 5min moving stretches. Static Holds: Hip flexors, hamstrings, calves, glutes. Foam Rolling: IT band, quads, calves", sets: "2x30s each", rest: "-", purpose: "Enhanced mobility work. Add dynamic component before static stretching" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "1900m", z: "Z2-Z3", workout: "Warm-up: 400m easy + 4x50m build. Main: 5x200m Z2-Z3 progression. Cool-down: 300m easy", sets: "5x200m", rest: "30s", purpose: "Intensity introduction. Each 200m slightly faster. Final 200m comfortably hard" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "30 min", z: "Z1", workout: "Easy walk or 1000m easy swim", sets: "-", rest: "-", purpose: "Promote recovery while maintaining movement. HR under 60% max" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "75 min", z: "Z2", workout: "Warm-up: 15min easy + 3x2min builds. Main: 55min progressive (start Z2, finish strong Z2). Cool-down: 5min easy", sets: "1x55min", rest: "-", purpose: "Endurance building with negative split practice" },
        { d: R, dur: "15 min", z: "Z2", workout: "Brick workout off bike, steady effort", sets: "1x15min", rest: "-", purpose: "Brick adaptation. Quick foot turnover despite heavy legs" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "50 min", z: "Z2", workout: "Warm-up: 10min easy. Main: 35min steady Z2. Cool-down: 5min walk", sets: "1x35min", rest: "-", purpose: "Long run progression. Practice race nutrition every 20min" },
      ]},
    ],
  },
  {
    week: 3, phase: "Base Building", title: "Endurance Development", hours: 7.0,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "1700m", z: "Z2", workout: "Warm-up: 400m easy + 6x25m drill. Main: 8x125m Z2 descending. Cool-down: 300m easy", sets: "8x125m", rest: "20s", purpose: "Distance per stroke focus. Fewer strokes while maintaining pace" },
        { d: C, dur: "20 min", z: "-", workout: "Plank Series: 4x40s various positions. Side Plank: 2x30s + 15 hip dips. Dead Bug/Bird Dog: 3x10 combo. Russian Twists: 3x20 total", sets: "4 sets each", rest: "30s", purpose: "Extended core endurance. Deep core fatigue by end" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "55 min", z: "Z2-Z3", workout: "Warm-up: 10min easy + 4x1min builds. Main: 4x4min Z3 efforts. Cool-down: 7min easy", sets: "4x4min", rest: "3min Z2", purpose: "Lactate threshold development. Z3 at race pace intensity" },
        { d: ST, dur: "30 min", z: "-", workout: "Bulgarian Split Squats: 3x10 each leg. Single-leg RDL: 3x8 each leg. Pike Push-ups: 3x8-12. Plank Rows: 3x12 each arm", sets: "3 sets each", rest: "60-90s", purpose: "Unilateral strength and stability. Critical for triathlon" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "40 min", z: "Z2", workout: "Warm-up: 12min easy + 6x20s hill strides. Main: 23min steady Z2. Cool-down: 5min walk", sets: "6x20s", rest: "Walk back down", purpose: "Hill stride power development. Run uphill at 5K effort" },
        { d: F, dur: "20 min", z: "-", workout: "Dynamic: 8min full-body flow. Static: 12min focused problem areas. Meditation: Final 5min relaxation", sets: "-", rest: "-", purpose: "Extended mobility session. Include mental relaxation" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "2000m", z: "Z2-Z3", workout: "Warm-up: 500m easy + 6x50m build. Main: 4x300m Z2-Z3 negative split. Cool-down: 200m easy", sets: "4x300m", rest: "45s", purpose: "Pacing discipline. First 100m Z2, middle Z2-Z3, final Z3" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "20 min", z: "Z1", workout: "Easy walk, gentle yoga, or complete rest", sets: "-", rest: "-", purpose: "Recovery priority. Light movement if feeling good, rest if tired" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "80 min", z: "Z2-Z3", workout: "Warm-up: 15min easy + 3x2min builds. Main: 60min with 10min Z3 block (minute 25-35). Cool-down: 5min easy", sets: "1x10min", rest: "-", purpose: "Tempo endurance with race pace practice" },
        { d: R, dur: "20 min", z: "Z2", workout: "Brick workout progression off bike", sets: "1x20min", rest: "-", purpose: "Extended brick practice. First 5min will feel awkward" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "55 min", z: "Z2", workout: "Warm-up: 15min easy + 4x15s strides. Main: 35min steady aerobic. Cool-down: 5min walk", sets: "1x35min", rest: "-", purpose: "Long run extension. Practice race nutrition every 20min" },
      ]},
    ],
  },
  {
    week: 4, phase: "Base Building", title: "Consolidation", hours: 7.5,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "1800m", z: "Z2", workout: "Warm-up: 400m easy + 6x50m drill/swim. Main: 6x200m Z2 even pace. Cool-down: 200m easy", sets: "6x200m", rest: "25s", purpose: "Pace consistency training. All 200m within 5-second range" },
        { d: C, dur: "20 min", z: "-", workout: "Advanced Plank: 3x45s + variations. Turkish Get-up: 2x5 each side. Hollow Body: 3x20s + rocks. Bear Crawl: 3x10 steps forward/back", sets: "3 sets each", rest: "45s", purpose: "Functional core strength. Quality over speed" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "60 min", z: "Z2-Z3", workout: "Warm-up: 12min easy + 3x2min builds. Main: 5x3min Z3 efforts. Cool-down: 8min easy", sets: "5x3min", rest: "2min Z2", purpose: "Lactate clearance training. Consistent power/HR each effort" },
        { d: ST, dur: "30 min", z: "-", workout: "Front Squats: 3x8-12. Step-ups: 3x10 each leg. Diamond Push-ups: 3x6-10. Bent-over Y-raises: 3x15 light weight", sets: "3 sets each", rest: "90s", purpose: "Strength progression and postural muscles" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "45 min", z: "Z2", workout: "Warm-up: 15min easy + 8x15s strides. Main: 25min steady Z2. Cool-down: 5min walk", sets: "8x15s", rest: "45s easy jog", purpose: "Stride frequency and form at mile pace effort" },
        { d: F, dur: "20 min", z: "-", workout: "Yoga Flow: 10min vinyasa sequence. Targeted Stretching: 10min tri-specific. Relaxation: 5min breathing/meditation", sets: "-", rest: "-", purpose: "Enhanced flexibility and stress management" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "2100m", z: "Z2-Z3", workout: "Warm-up: 500m easy + 8x25m build. Main: 3x400m Z2-Z3 progression. Cool-down: 200m easy", sets: "3x400m", rest: "60s", purpose: "Distance progression with pace development. Practice open water sighting" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "30 min", z: "Z1", workout: "Easy swim (1000m) or gentle walk", sets: "-", rest: "-", purpose: "Active recovery choice. Easy swim helps with feel for water" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "90 min", z: "Z2", workout: "Warm-up: 15min easy + 3x3min builds. Main: 65min steady aerobic effort. Cool-down: 10min easy", sets: "1x65min", rest: "-", purpose: "Longest bike session yet. Practice race nutrition every 20min" },
        { d: R, dur: "20 min", z: "Z2", workout: "Brick workout off bike", sets: "1x20min", rest: "-", purpose: "Brick adaptation development. Quick steps off bike" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "60 min", z: "Z2", workout: "Warm-up: 15min easy + 6x15s strides. Main: 40min steady long run. Cool-down: 5min walk", sets: "1x40min", rest: "-", purpose: "First long run milestone. Practice race fueling every 20min" },
      ]},
    ],
  },
  {
    week: 5, phase: "Base Building", title: "Volume Increase", hours: 8.0,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "2200m", z: "Z2-Z3", workout: "Warm-up: 600m easy + 8x25m build. Main: 5x200m Z3 steady. Cool-down: 600m easy", sets: "5x200m", rest: "30s", purpose: "Volume increase with intensity. Z3 like 10K race pace" },
        { d: C, dur: "20 min", z: "-", workout: "Planks: 4x45s various positions. Side Planks: 3x30s each + hip dips. Dead Bugs: 3x12 each side. Mountain Climbers: 3x15 total", sets: "4 sets each", rest: "45s", purpose: "Enhanced core endurance with dynamic movements" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "105 min", z: "Z2", workout: "Warm-up: 15min easy + 4x2min builds. Main: 80min steady aerobic base. Cool-down: 10min easy", sets: "1x80min", rest: "-", purpose: "Extended aerobic base building. 85-95 RPM throughout" },
        { d: ST, dur: "35 min", z: "-", workout: "Squats: 4x12-15 (add weight if possible). Lunges: 3x12 each leg. Push-ups: 4x10-15. Rows: 4x12-15. Calf Raises: 3x20", sets: "4 sets each", rest: "90s", purpose: "Volume increase in strength. Perfect form with increased time under tension" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "65 min", z: "Z2", workout: "Warm-up: 20min easy + 6x15s strides. Main: 40min aerobic base. Cool-down: 5min walk", sets: "1x40min", rest: "-", purpose: "Extended aerobic base building. Conversational throughout" },
        { d: F, dur: "20 min", z: "-", workout: "Hip Flexors: 3x45s each leg. Hamstrings: 3x45s each leg. Calves: 3x45s each leg. Thoracic Spine: 2x60s", sets: "3 sets each", rest: "-", purpose: "Extended flexibility. Longer holds for deeper tissue changes" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "2000m", z: "Z2-Z3", workout: "Warm-up: 500m easy + 6x50m build. Main: 6x200m Z2 steady. Cool-down: 300m easy", sets: "6x200m", rest: "30s", purpose: "Volume consolidation. Consistent pace and stroke count" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "30 min", z: "Z1", workout: "Easy walk or 1200m easy swim", sets: "-", rest: "-", purpose: "Recovery with movement. Choose based on how body feels" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "95 min", z: "Z2", workout: "Warm-up: 15min easy + 3x3min builds. Main: 70min steady aerobic. Cool-down: 10min easy", sets: "1x70min", rest: "-", purpose: "Progressive endurance building. Practice race position and nutrition" },
        { d: R, dur: "25 min", z: "Z2", workout: "Brick workout off bike", sets: "1x25min", rest: "-", purpose: "Extended brick practice. Maintain form despite heavy legs" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "70 min", z: "Z2", workout: "Warm-up: 20min easy + 6x15s strides. Main: 45min long run. Cool-down: 5min walk", sets: "1x45min", rest: "-", purpose: "Long run progression. Practice race nutrition every 20min" },
      ]},
    ],
  },
  {
    week: 6, phase: "Base Building", title: "Peak Base Building", hours: 8.5,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "2300m", z: "Z2-Z3", workout: "Warm-up: 600m easy + 8x25m drill. Main: 4x300m Z3 steady. Cool-down: 500m easy", sets: "4x300m", rest: "45s", purpose: "Distance + intensity combination. Z3 at race pace" },
        { d: C, dur: "25 min", z: "-", workout: "Extended Plank Series: 5x45s. Side Plank Complex: 3x30s + movements. Dead Bug Progressions: 3x12 each. Stability Ball Work: 3x15", sets: "5 sets each", rest: "45s", purpose: "Peak base phase core strength" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "2 hours", z: "Z2-Z3", workout: "Warm-up: 20min easy + 4x3min builds. Main: 90min with 3x10min Z3 efforts. Cool-down: 10min easy", sets: "3x10min", rest: "5min Z2", purpose: "Extended tempo work. Z3 at race pace" },
        { d: ST, dur: "35 min", z: "-", workout: "Enhanced Squats: 4x10-12 (heavier load). Single-leg Work: 3x10 each leg. Upper Body Complex: 4x12-15. Core Integration: 3x12 each side", sets: "4 sets each", rest: "2min", purpose: "Enhanced strength training. Focus on power development" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "70 min", z: "Z2-Z3", workout: "Warm-up: 20min easy + 6x15s strides. Main: 45min with 15min tempo Z3. Cool-down: 5min walk", sets: "1x15min", rest: "-", purpose: "Tempo run development. 15min Z3 at race pace" },
        { d: F, dur: "25 min", z: "-", workout: "Extended Flow: 15min dynamic yoga. Deep Stretching: 10min problem areas. Foam Rolling: Focus on IT band, calves", sets: "-", rest: "-", purpose: "Enhanced flexibility work. Longer sessions for deeper tissue changes" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "2200m", z: "Z2-Z3", workout: "Warm-up: 600m easy + 6x50m build. Main: 5x250m Z2-Z3 progression. Cool-down: 350m easy", sets: "5x250m", rest: "40s", purpose: "Progressive pace development. Final one at race pace" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "30 min", z: "Z1", workout: "Easy swim or complete rest", sets: "-", rest: "-", purpose: "Recovery priority. Choose based on cumulative fatigue" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "105 min", z: "Z2", workout: "Warm-up: 15min easy + 3x3min builds. Main: 80min progressive effort. Cool-down: 10min easy", sets: "1x80min", rest: "-", purpose: "Progressive endurance ride. Start Z2, finish strong Z2" },
        { d: R, dur: "25 min", z: "Z2-Z3", workout: "Brick workout progression", sets: "1x25min", rest: "-", purpose: "Quality brick practice. Can build to Z3 in final 10min" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "75 min", z: "Z2", workout: "Warm-up: 20min easy + 6x15s strides. Main: 50min long run. Cool-down: 5min walk", sets: "1x50min", rest: "-", purpose: "Peak base phase long run. Practice race nutrition timing" },
      ]},
    ],
  },
  // ===== PHASE 2: BUILD PHASE (Weeks 7-14) =====
  {
    week: 7, phase: "Build Phase", title: "Intensity Introduction", hours: 9.5,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "2200m", z: "Z3", workout: "Warm-up: 600m easy + 8x25m build. Main: 5x300m Z3 steady. Cool-down: 350m easy", sets: "5x300m", rest: "45s", purpose: "Lactate threshold swimming. Z3 like 10K race pace" },
        { d: C, dur: "25 min", z: "-", workout: "Plank Complex: 4x45s various positions. Pallof Press: 3x12 each side. Single-leg Glute Bridge: 3x12 each. Mountain Climbers: 3x20 total", sets: "4 sets each", rest: "45s", purpose: "Advanced core stability with anti-rotation focus" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "80 min", z: "Z2-Z4", workout: "Warm-up: 15min easy + 4x2min builds. Main: 6x4min Z3-Z4 intervals. Cool-down: 10min easy", sets: "6x4min", rest: "3min Z2", purpose: "VO2 max development. 90-95% of threshold power/HR" },
        { d: ST, dur: "40 min", z: "-", workout: "Back Squats: 4x6-8 (heavier load). Romanian Deadlifts: 3x8-10. Push-up to T: 3x8 each side. Lat Pulldowns/Pull-ups: 3x6-12. Single-leg Calf Raises: 3x15 each", sets: "4 sets each", rest: "2min", purpose: "Power-focused strength. Heavier loads with fewer reps" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "55 min", z: "Z3", workout: "Warm-up: 15min easy + 6x15s strides. Main: 20min tempo Z3 block. Cool-down: 20min easy", sets: "1x20min", rest: "-", purpose: "Lactate threshold running. 20min at race pace effort" },
        { d: F, dur: "25 min", z: "-", workout: "Advanced Flow: 15min dynamic yoga. Deep Stretching: 10min intense holds. Foam Rolling: Focus on IT band, calves", sets: "-", rest: "-", purpose: "Enhanced recovery. Longer holds for deeper tissue changes" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "2500m", z: "Z2-Z3", workout: "Warm-up: 600m easy + 6x50m build/drill. Main: 4x400m Z2-Z3 negative split. Cool-down: 300m easy", sets: "4x400m", rest: "60s", purpose: "Race pace development. First 200m Z2, second 200m Z3" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "30 min", z: "Z1", workout: "Easy swim (1200m) focus on technique", sets: "-", rest: "-", purpose: "Recovery with skill maintenance. Easy pace, perfect technique" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "2.5 hours", z: "Z2-Z3", workout: "Warm-up: 20min easy + 4x3min builds. Main: 2hr with 4x8min Z3 efforts. Cool-down: 10min easy", sets: "4x8min", rest: "7min Z2", purpose: "Race pace endurance. Practice all race day nutrition" },
        { d: R, dur: "30 min", z: "Z2-Z3", workout: "Brick workout progression off bike", sets: "1x30min", rest: "-", purpose: "Extended brick. First 10min Z2, then can build to Z3" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "80 min", z: "Z2", workout: "Warm-up: 20min easy + 6x15s strides. Main: 55min long aerobic run. Cool-down: 5min walk", sets: "1x55min", rest: "-", purpose: "Long run build with patience. Practice race fueling every 15-20min" },
      ]},
    ],
  },
  {
    week: 8, phase: "Build Phase", title: "Lactate Threshold Focus", hours: 10.0,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "2400m", z: "Z3-Z4", workout: "Warm-up: 700m easy + 6x50m build/fast. Main: 6x250m Z3-Z4 steady. Cool-down: 350m easy", sets: "6x250m", rest: "30s", purpose: "VO2 max swimming. Z4 hard but sustainable for 250m" },
        { d: C, dur: "25 min", z: "-", workout: "Loaded Planks: 4x30s with weight. Side Plank Reaches: 3x10 each side. V-sits: 3x15 pulses. Dead Bug + Band: 3x10 each with resistance", sets: "4 sets each", rest: "45s", purpose: "Strength-endurance fusion with external resistance" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "90 min", z: "Z2-Z4", workout: "Warm-up: 20min easy + 4x3min builds. Main: 5x5min Z4 intervals. Cool-down: 15min easy", sets: "5x5min", rest: "4min Z2", purpose: "Classic VO2 max intervals. Z4 at 90-95% of 20min test power" },
        { d: ST, dur: "40 min", z: "-", workout: "Deadlifts: 4x5 (focus on power). Bulgarian Split Squats: 3x8 each + weight. Handstand Progressions: 3x30s holds. Farmer Carries: 3x40m heavy. Band Pull-aparts: 3x20", sets: "4 sets each", rest: "2-3min", purpose: "Power development. Heavier loads, explosive intent" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "60 min", z: "Z3-Z4", workout: "Warm-up: 20min easy + 6x15s strides. Main: 8x3min Z4 intervals. Cool-down: 15min easy", sets: "8x3min", rest: "90s jog", purpose: "Classic lactate threshold intervals. Z4 at 5K-10K race pace" },
        { d: F, dur: "25 min", z: "-", workout: "Advanced Yoga: 20min power flow. Deep Tissue: 10min with tools. Relaxation: 5min meditation", sets: "-", rest: "-", purpose: "Enhanced recovery with challenging yoga poses" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "2600m", z: "Z2-Z3", workout: "Warm-up: 700m easy + 6x50m descending. Main: 3x500m Z2-Z3 build throughout. Cool-down: 300m easy", sets: "3x500m", rest: "75s", purpose: "Distance + pace combination. Final 500m at race pace" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "30 min", z: "Z1", workout: "Easy swim with massage recommended", sets: "-", rest: "-", purpose: "Professional recovery. Schedule massage or deep tissue work" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "2.75 hours", z: "Z2-Z3", workout: "Warm-up: 20min easy + 4x3min builds. Main: 2.25hr with 3x12min Z3 blocks. Cool-down: 10min easy", sets: "3x12min", rest: "8min Z2", purpose: "Race simulation volume. Practice all race nutrition and position" },
        { d: R, dur: "35 min", z: "Z2-Z3", workout: "Brick workout off bike", sets: "1x35min", rest: "-", purpose: "Quality brick. Can build to Z3 in final 15min" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "85 min", z: "Z2", workout: "Warm-up: 20min easy + 6x15s strides. Main: 60min with 2x10min tempo inserts. Cool-down: 5min walk", sets: "2x10min", rest: "5min easy", purpose: "Long run with race pace practice. Teaches pacing discipline during fatigue" },
      ]},
    ],
  },
  {
    week: 9, phase: "Build Phase", title: "Sprint Triathlon Week", hours: 10.5,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "2500m", z: "Z3-Z4", workout: "Warm-up: 700m easy + 8x25m fast. Main: 8x200m Z3-Z4 steady. Cool-down: 300m easy", sets: "8x200m", rest: "20s", purpose: "VO2 max swimming. Z4 at 1500m race pace" },
        { d: C, dur: "30 min", z: "-", workout: "Advanced Core Work: 5x45s weighted planks. Rotational Power: 4x10 each side. Stability Challenges: 3x45s holds. Integration: 3x12 complex moves", sets: "5 sets each", rest: "60s", purpose: "Peak core strength development" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "95 min", z: "Z2-Z4", workout: "Warm-up: 20min easy + 4x3min builds. Main: 8x3min Z4 intervals. Cool-down: 15min easy", sets: "8x3min", rest: "3min", purpose: "Classic VO2 max bike intervals. Z4 at 90-95% of 20min power" },
        { d: ST, dur: "40 min", z: "-", workout: "Explosive Squats: 4x6 (focus on speed). Single-leg Power: 3x6 each leg. Plyometric Push-ups: 3x6-8. Olympic Lift Variations: 4x5. Power Endurance: 3x30s", sets: "4 sets each", rest: "3min", purpose: "Explosive strength. Speed and power development" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "65 min", z: "Z2-Z3", workout: "Warm-up: 20min easy + 8x15s strides. Main: 40min with 25min tempo Z3. Cool-down: 5min walk", sets: "1x25min", rest: "-", purpose: "Extended tempo run. 25min Z3 at race pace" },
        { d: F, dur: "30 min", z: "-", workout: "Extended Flow: 20min advanced yoga. Deep Tissue: 10min intensive. Meditation: 5min stress management", sets: "-", rest: "-", purpose: "Enhanced flexibility. Longer, more challenging poses" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "2700m", z: "Z2-Z3", workout: "Warm-up: 800m easy + 6x50m build. Main: 4x400m Z2-Z3 race pace. Cool-down: 300m easy", sets: "4x400m", rest: "60s", purpose: "Race pace consolidation. Practice open water sighting and drafting" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "30 min", z: "Z1", workout: "Easy movement or complete rest", sets: "-", rest: "-", purpose: "Recovery priority. Complete rest if needed" },
      ]},
      { day: "Saturday", sessions: [
        { d: R, dur: "20 min", z: "Z1-Z2", workout: "Pre-race shakeout: 10min easy jog + 4x15s strides. 5min walk. Dynamic stretches", sets: "4x15s strides", rest: "45s easy", purpose: "Pre-race activation. Loosen legs, stay fresh for tomorrow's sprint triathlon" },
      ]},
      { day: "Sunday", sessions: [
        { d: "RACE", dur: "Sprint Triathlon", z: "Race", workout: "750m swim, 20km bike, 5km run. Race as a build-up event for Ironman 70.3", sets: "-", rest: "-", purpose: "Sprint triathlon race. Practice transitions, pacing, and race-day execution. Treat as Ironman dress rehearsal" },
      ]},
    ],
  },
  {
    week: 10, phase: "Build Phase", title: "Recovery Week", hours: 9.0,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "2000m", z: "Z2", workout: "Warm-up: 500m easy + 6x25m drill. Main: 6x200m Z2 smooth. Cool-down: 300m easy", sets: "6x200m", rest: "30s", purpose: "Recovery week. Focus on technique and feel for water" },
        { d: C, dur: "20 min", z: "-", workout: "Light Planks: 3x30s. Gentle Stretching: 10min. Activation: 2x10 glute bridges", sets: "3 sets each", rest: "-", purpose: "Light core work. Maintain patterns without fatigue" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "60 min", z: "Z2", workout: "Warm-up: 15min easy + 3x2min builds. Main: 35min easy aerobic. Cool-down: 10min easy", sets: "1x35min", rest: "-", purpose: "Easy aerobic riding. Smooth pedal stroke and comfortable position" },
        { d: ST, dur: "30 min", z: "-", workout: "Bodyweight Squats: 3x10. Light Lunges: 2x8 each leg. Easy Push-ups: 3x8. Gentle Stretching: 10min", sets: "3 sets each", rest: "60s", purpose: "Reduced intensity. Maintain movement patterns with light loads" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "45 min", z: "Z2", workout: "Warm-up: 15min easy + 4x15s strides. Main: 25min easy running. Cool-down: 5min walk", sets: "1x25min", rest: "-", purpose: "Easy running. Comfortable pace, perfect form" },
        { d: F, dur: "25 min", z: "-", workout: "Recovery Stretching: 20min gentle. Relaxation: 5min breathing", sets: "-", rest: "-", purpose: "Enhanced recovery stretching. Focus on problem areas" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "1800m", z: "Z2", workout: "Warm-up: 400m easy + 4x50m drill. Main: 5x200m Z2 technique. Cool-down: 200m easy", sets: "5x200m", rest: "45s", purpose: "Technique focus. Count strokes, work on efficiency" },
      ]},
      { day: "Friday", sessions: [
        { d: REST, dur: "-", z: "-", workout: "Full rest day", sets: "-", rest: "-", purpose: "Complete recovery. Sleep, nutrition, stress management" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "90 min", z: "Z2", workout: "Warm-up: 15min easy + 3x3min builds. Main: 65min easy endurance. Cool-down: 10min easy", sets: "1x65min", rest: "-", purpose: "Easy endurance ride. Comfortable pace, practice nutrition" },
        { d: R, dur: "20 min", z: "Z2", workout: "Easy brick workout", sets: "1x20min", rest: "-", purpose: "Easy brick practice. Smooth transition without intensity" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "60 min", z: "Z2", workout: "Warm-up: 15min easy + 4x15s strides. Main: 40min recovery long run. Cool-down: 5min walk", sets: "1x40min", rest: "-", purpose: "Recovery long run. Should feel refreshed after" },
      ]},
    ],
  },
  {
    week: 11, phase: "Build Phase", title: "Lactate Threshold Focus", hours: 11.0,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "2600m", z: "Z3", workout: "Warm-up: 700m easy + 8x25m build. Main: 4x400m Z3 race pace. Cool-down: 300m easy", sets: "4x400m", rest: "60s", purpose: "Extended race pace swimming. Pacing discipline" },
        { d: C, dur: "30 min", z: "-", workout: "Strength Maintenance: 4x45s planks. Power Development: 3x12 rotational. Stability: 3x30s challenges. Integration: 3x10 complex", sets: "4 sets each", rest: "60s", purpose: "Core strength maintenance with power focus" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "3.25 hours", z: "Z2-Z3", workout: "Warm-up: 25min easy + 4x5min builds. Main: 2.75hr with 3x15min Z3 blocks. Cool-down: 15min easy", sets: "3x15min", rest: "10min Z2", purpose: "Extended race pace blocks at race intensity" },
        { d: ST, dur: "40 min", z: "-", workout: "Power Development: 4x6-8 heavy. Unilateral Work: 3x8 each side. Core Integration: 3x12 each. Postural Strength: 3x15", sets: "4 sets each", rest: "2-3min", purpose: "Power development. Heavy loads with explosive intent" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "70 min", z: "Z2-Z3", workout: "Warm-up: 20min easy + 8x15s strides. Main: 45min with 30min tempo. Cool-down: 5min walk", sets: "1x30min", rest: "-", purpose: "Extended tempo run. 30min Z3 at race pace" },
        { d: F, dur: "30 min", z: "-", workout: "Mobility Work: 20min targeted. Deep Tissue: 10min foam rolling. Relaxation: 5min meditation", sets: "-", rest: "-", purpose: "Enhanced mobility work for increased training load" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "2800m", z: "Z2-Z3", workout: "Warm-up: 800m easy + 6x50m build. Main: 3x500m Z2-Z3 progression. Cool-down: 400m easy", sets: "3x500m", rest: "75s", purpose: "Distance progression. Each 500m faster, final one at race pace" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "30 min", z: "Z1", workout: "Easy swim or gentle movement", sets: "-", rest: "-", purpose: "Recovery with movement" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "120 min", z: "Z2-Z3", workout: "Warm-up: 20min easy + 4x3min builds. Main: 90min progressive effort. Cool-down: 10min easy", sets: "1x90min", rest: "-", purpose: "Progressive endurance ride. Practice race position and nutrition" },
        { d: R, dur: "40 min", z: "Z2-Z3", workout: "Brick workout at race pace", sets: "1x40min", rest: "-", purpose: "Quality brick at race pace rhythm off bike" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "95 min", z: "Z2", workout: "Warm-up: 25min easy + 6x15s strides. Main: 65min long endurance. Cool-down: 5min walk", sets: "1x65min", rest: "-", purpose: "Peak long run volume. Practice race nutrition every 15min" },
      ]},
    ],
  },
  {
    week: 12, phase: "Build Phase", title: "Race-Specific Intensity", hours: 11.5,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "2700m", z: "Z3-Z4", workout: "Warm-up: 700m easy + 8x25m fast. Main: 6x300m Z3-Z4 race pace. Cool-down: 200m easy", sets: "6x300m", rest: "45s", purpose: "Race-specific intensity. Z4 at race pace under pressure" },
        { d: C, dur: "30 min", z: "-", workout: "Core Power: 4x45s weighted planks. Rotational Power: 4x12 each side. Stability: 3x45s challenges. Integration: 3x12 complex", sets: "4 sets each", rest: "60s", purpose: "Peak core power development" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "3.5 hours", z: "Z2-Z3", workout: "Warm-up: 30min easy + 4x5min builds. Main: 3hr with 4x12min race pace. Cool-down: 15min easy", sets: "4x12min", rest: "8min Z2", purpose: "Extended race pace practice at race intensity" },
        { d: ST, dur: "40 min", z: "-", workout: "Strength Maintenance: 4x6-8. Power Focus: 3x6 explosive. Stability: 3x12 each side. Recovery: 10min stretching", sets: "4 sets each", rest: "2-3min", purpose: "Strength maintenance while managing fatigue" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "75 min", z: "Z3-Z4", workout: "Warm-up: 25min easy + 8x15s strides. Main: 45min with 10x2min Z4. Cool-down: 5min walk", sets: "10x2min", rest: "90s", purpose: "High-intensity intervals. Z4 at 5K race pace" },
        { d: F, dur: "30 min", z: "-", workout: "Recovery Stretching: 25min intensive. Relaxation: 5min meditation", sets: "-", rest: "-", purpose: "Enhanced recovery. Longer holds for deeper tissue work" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "2900m", z: "Z2-Z3", workout: "Warm-up: 800m easy + 6x50m build. Main: 4x450m Z2-Z3 race simulation. Cool-down: 250m easy", sets: "4x450m", rest: "60s", purpose: "Race simulation swimming. Practice race pace and pacing strategy" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "30 min", z: "Z1", workout: "Easy movement focus", sets: "-", rest: "-", purpose: "Recovery priority. Light movement or complete rest" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "130 min", z: "Z2-Z3", workout: "Warm-up: 20min easy + 4x3min builds. Main: 100min race simulation. Cool-down: 10min easy", sets: "1x100min", rest: "-", purpose: "Race simulation ride. Practice exact race pace, position, nutrition" },
        { d: R, dur: "40 min", z: "Z2-Z3", workout: "Quality brick workout", sets: "1x40min", rest: "-", purpose: "Quality brick at race pace. Smooth transition and race rhythm" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "100 min", z: "Z2", workout: "Warm-up: 25min easy + 6x15s strides. Main: 70min with race nutrition. Cool-down: 5min walk", sets: "1x70min", rest: "-", purpose: "Peak long run with race nutrition. Practice all race day fueling" },
      ]},
    ],
  },
  {
    week: 13, phase: "Build Phase", title: "Peak Build Volume", hours: 12.0,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "2800m", z: "Z3-Z4", workout: "Warm-up: 800m easy + 8x25m race pace. Main: 5x350m Z3-Z4 steady. Cool-down: 250m easy", sets: "5x350m", rest: "45s", purpose: "Peak swimming volume. Z4 at race pace" },
        { d: C, dur: "30 min", z: "-", workout: "Peak Core Strength: 5x45s weighted. Power Development: 4x12 rotational. Stability: 3x60s challenges. Integration: 3x15 complex", sets: "5 sets each", rest: "60s", purpose: "Peak core strength development" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "3.75 hours", z: "Z2-Z3", workout: "Warm-up: 30min easy + 4x5min builds. Main: 3.25hr with 5x10min race pace. Cool-down: 15min easy", sets: "5x10min", rest: "5min Z2", purpose: "Peak bike volume. Practice all race protocols" },
        { d: ST, dur: "40 min", z: "-", workout: "Final Strength Build: 4x6-8 heavy. Power Maintenance: 3x6 explosive. Stability: 3x12 each side. Recovery: 10min stretching", sets: "4 sets each", rest: "3min", purpose: "Final strength build phase. Peak loads with perfect form" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "80 min", z: "Z3-Z4", workout: "Warm-up: 25min easy + 8x15s strides. Main: 50min with 5x6min Z4. Cool-down: 5min walk", sets: "5x6min", rest: "2min", purpose: "Peak run intensity. Z4 at 10K race pace" },
        { d: F, dur: "30 min", z: "-", workout: "Mobility Maintenance: 25min intensive. Relaxation: 5min breathing", sets: "-", rest: "-", purpose: "Peak phase mobility maintenance" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "3000m", z: "Z2-Z3", workout: "Warm-up: 900m easy + 6x50m build. Main: 3x600m Z2-Z3 race pace. Cool-down: 300m easy", sets: "3x600m", rest: "90s", purpose: "Peak swim distance. Race pace over extended distance" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "45 min", z: "Z1-Z2", workout: "Easy swim or gentle movement", sets: "-", rest: "-", purpose: "Extended recovery. Choose based on cumulative fatigue" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "140 min", z: "Z2-Z3", workout: "Warm-up: 20min easy + 4x3min builds. Main: 110min peak endurance. Cool-down: 10min easy", sets: "1x110min", rest: "-", purpose: "Peak endurance ride. Practice race pace and all protocols" },
        { d: R, dur: "45 min", z: "Z2-Z3", workout: "Peak brick workout", sets: "1x45min", rest: "-", purpose: "Peak brick. Race pace rhythm and transition skills" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "105 min", z: "Z2", workout: "Warm-up: 25min easy + 6x15s strides. Main: 75min peak long run. Cool-down: 5min walk", sets: "1x75min", rest: "-", purpose: "Peak long run volume. Race nutrition every 15min" },
      ]},
    ],
  },
  {
    week: 14, phase: "Build Phase", title: "Recovery Week", hours: 10.0,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "2200m", z: "Z2", workout: "Warm-up: 600m easy + 6x25m drill. Main: 5x250m Z2 smooth. Cool-down: 350m easy", sets: "5x250m", rest: "40s", purpose: "Recovery week. Focus on technique and feel for water" },
        { d: C, dur: "25 min", z: "-", workout: "Recovery Core: 3x30s planks. Gentle Stretching: 15min. Activation: 2x10 bridges", sets: "3 sets each", rest: "-", purpose: "Light core work. Maintain patterns without fatigue" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "2.5 hours", z: "Z2", workout: "Warm-up: 20min easy + 3x3min builds. Main: 2hr reduced volume. Cool-down: 10min easy", sets: "1x2hr", rest: "-", purpose: "Reduced volume endurance. Comfortable pace" },
        { d: ST, dur: "30 min", z: "-", workout: "Light Strength: 3x8-10 bodyweight. Mobility: 15min stretching. Activation: 5min gentle", sets: "3 sets each", rest: "60s", purpose: "Light strength maintenance. Focus on movement quality" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "55 min", z: "Z2-Z3", workout: "Warm-up: 20min easy + 6x15s strides. Main: 30min easy tempo. Cool-down: 5min walk", sets: "1x30min", rest: "-", purpose: "Easy tempo run. Comfortable effort, no intensity pressure" },
        { d: F, dur: "25 min", z: "-", workout: "Recovery Stretching: 20min gentle. Relaxation: 5min breathing", sets: "-", rest: "-", purpose: "Enhanced recovery stretching" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "2000m", z: "Z2", workout: "Warm-up: 500m easy + 4x50m drill. Main: 4x300m Z2 technique. Cool-down: 200m easy", sets: "4x300m", rest: "60s", purpose: "Technique focus. Count strokes, work on efficiency" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "30 min", z: "Z1", workout: "Easy swim or complete rest", sets: "-", rest: "-", purpose: "Recovery priority. Choose based on how body feels" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "100 min", z: "Z2", workout: "Warm-up: 15min easy + 3x3min builds. Main: 75min easy ride. Cool-down: 10min easy", sets: "1x75min", rest: "-", purpose: "Easy endurance ride. Comfortable pace, practice nutrition" },
        { d: R, dur: "30 min", z: "Z2", workout: "Easy brick workout", sets: "1x30min", rest: "-", purpose: "Easy brick practice. Smooth transition" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "75 min", z: "Z2", workout: "Warm-up: 20min easy + 4x15s strides. Main: 50min recovery long run. Cool-down: 5min walk", sets: "1x50min", rest: "-", purpose: "Recovery long run. Should feel refreshed and strong" },
      ]},
    ],
  },
  // ===== PHASE 3: PEAK PHASE (Weeks 15-18) =====
  {
    week: 15, phase: "Peak Phase", title: "Race Simulation", hours: 12.5,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "2800m", z: "Z2-Z3", workout: "Warm-up: 600m easy + 8x25m race pace. Main: 1800m continuous race pace. Cool-down: 400m easy", sets: "1x1800m", rest: "-", purpose: "Race distance simulation. Continuous at race pace. Practice sighting every 6-8 strokes" },
        { d: C, dur: "30 min", z: "-", workout: "Weighted Planks: 4x45s with 25-45lbs. Single-arm Farmer Walks: 3x30m each. Hanging Knee Raises: 3x10-15. Stability Ball Rollouts: 3x12", sets: "4 sets each", rest: "60s", purpose: "Peak core strength development" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "110 min", z: "Z2-Z3", workout: "Warm-up: 20min easy + 4x5min builds. Main: 80min with 40min race pace block. Cool-down: 10min easy", sets: "1x40min", rest: "-", purpose: "Extended race pace practice. 40min at race intensity" },
        { d: ST, dur: "40 min", z: "-", workout: "Heavy Squats: 4x3-5 reps at 85-90% effort. Single-leg Deadlifts: 3x6 each leg. Weighted Push-ups: 3x6-8. Pull-ups/Lat Pulls: 4x5-8 heavy. Rotational Power: 3x8 each side", sets: "4 sets each", rest: "3min", purpose: "Peak power development. Heavy loads with full recovery" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "75 min", z: "Z2-Z3", workout: "Warm-up: 20min easy + 8x15s strides. Main: 50min with 30min race pace tempo. Cool-down: 5min walk", sets: "1x30min", rest: "-", purpose: "Extended race pace running. Practice exact race day fueling" },
        { d: F, dur: "30 min", z: "-", workout: "Deep Stretch Session: 25min intensive. Foam Rolling: 10min problem areas. Meditation: 5min stress management", sets: "-", rest: "-", purpose: "Peak phase recovery emphasis" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "3100m", z: "Z2-Z3", workout: "Warm-up: 800m easy + 8x50m build/fast. Main: 2000m race simulation. Cool-down: 300m easy", sets: "1x2000m", rest: "-", purpose: "Over-distance race pace. Builds confidence and pacing skills" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "30 min", z: "Z1", workout: "Easy swim with perfect technique focus", sets: "-", rest: "-", purpose: "Recovery with skill maintenance. HR under 60% max" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "4 hours", z: "Z2", workout: "Warm-up: 30min easy + 4x5min builds. Main: 3hr race pace + nutrition. Cool-down: 10min easy", sets: "1x3hr", rest: "-", purpose: "Race nutrition rehearsal. Practice exact race day timing and products" },
        { d: R, dur: "50 min", z: "Z2-Z3", workout: "Brick workout race pace simulation", sets: "1x50min", rest: "-", purpose: "Extended brick at race pace. Critical race day skill" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "110 min", z: "Z2", workout: "Warm-up: 25min easy + 8x15s strides. Main: 80min with race nutrition. Cool-down: 5min walk", sets: "1x80min", rest: "-", purpose: "Peak long run with race fueling. Mental toughness development" },
      ]},
    ],
  },
  {
    week: 16, phase: "Peak Phase", title: "Olympic Distance Triathlon Week", hours: 13.0,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "2500m", z: "Z2-Z3", workout: "Warm-up: 700m easy + 6x25m race pace. Main: 5x300m Z2-Z3 race pace. Cool-down: 300m easy", sets: "5x300m", rest: "45s", purpose: "Pre-race maintenance. Each 300m at race pace" },
        { d: C, dur: "25 min", z: "-", workout: "Maintenance Planks: 3x30s. Stability Work: 2x20s each side. Activation: 2x10 bridges. Gentle Stretching: 10min", sets: "3 sets each", rest: "45s", purpose: "Maintenance work only. Don't create fatigue" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "100 min", z: "Z2-Z3", workout: "Warm-up: 20min easy + 4x2min builds. Main: 70min with 4x8min race pace. Cool-down: 10min easy", sets: "4x8min", rest: "5min Z2", purpose: "Race pace sharpening at race intensity" },
        { d: ST, dur: "35 min", z: "-", workout: "Pre-race Strength: 3x8 bodyweight. Activation: 10min dynamic warm-up. Mobility: 15min stretching", sets: "3 sets each", rest: "60s", purpose: "Pre-race strength maintenance. Light loads, perfect form" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "65 min", z: "Z2-Z3", workout: "Warm-up: 20min easy + 6x15s strides. Main: 40min with 20min race pace. Cool-down: 5min walk", sets: "1x20min", rest: "-", purpose: "Race pace confidence builder. Controlled and sustainable" },
        { d: F, dur: "25 min", z: "-", workout: "Pre-race Mobility: 20min targeted. Relaxation: 5min breathing", sets: "-", rest: "-", purpose: "Pre-race mobility. Address tight spots. Include mental preparation" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "2000m", z: "Z2", workout: "Warm-up: 500m easy + 6x25m smooth. Main: 6x200m Z2 technique. Cool-down: 300m easy", sets: "6x200m", rest: "30s", purpose: "Technique refinement. Smooth and controlled" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "30 min", z: "Z1", workout: "Easy swim or gentle walk", sets: "-", rest: "-", purpose: "Complete recovery. Very easy movement or rest" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "60 min", z: "Z1-Z2", workout: "Warm-up: 20min easy + 3x1min builds. Main: 35min easy with openers. Cool-down: 5min easy", sets: "3x30s", rest: "2min easy", purpose: "Pre-race activation. Very easy with short leg speed efforts" },
        { d: R, dur: "20 min", z: "Z1-Z2", workout: "Easy run off bike with strides", sets: "3x10s", rest: "1min easy", purpose: "Final movement preparation" },
      ]},
      { day: "Sunday", sessions: [
        { d: "RACE", dur: "Olympic Triathlon", z: "Race", workout: "1.5km swim, 40km bike, 10km run", sets: "-", rest: "-", purpose: "Execute race plan. Pace conservatively, finish strong" },
      ]},
    ],
  },
  {
    week: 17, phase: "Peak Phase", title: "Post-Race Recovery", hours: 11.0,
    days: [
      { day: "Monday", sessions: [
        { d: REST, dur: "-", z: "-", workout: "Complete rest post-race", sets: "-", rest: "-", purpose: "Full recovery. Focus on hydration, nutrition, sleep" },
      ]},
      { day: "Tuesday", sessions: [
        { d: AR, dur: "30 min", z: "Z1", workout: "Easy walk or gentle swim", sets: "-", rest: "-", purpose: "Very light movement to promote recovery. HR under 60% max" },
      ]},
      { day: "Wednesday", sessions: [
        { d: S, dur: "1500m", z: "Z1-Z2", workout: "Warm-up: 400m easy + 4x25m smooth. Main: 8x100m Z1-Z2 easy. Cool-down: 300m easy", sets: "8x100m", rest: "30s", purpose: "Return to training gradually. Focus on feel for water" },
        { d: F, dur: "30 min", z: "-", workout: "Recovery Stretching: 25min gentle. Relaxation: 5min breathing", sets: "-", rest: "-", purpose: "Enhanced recovery stretching. Post-race muscle tension" },
      ]},
      { day: "Thursday", sessions: [
        { d: B, dur: "60 min", z: "Z1-Z2", workout: "Warm-up: 15min easy + 3x1min builds. Main: 40min easy recovery. Cool-down: 5min easy", sets: "1x40min", rest: "-", purpose: "Easy recovery ride. Comfortable pace, smooth pedal stroke" },
      ]},
      { day: "Friday", sessions: [
        { d: R, dur: "40 min", z: "Z1-Z2", workout: "Warm-up: 15min easy + 4x15s strides. Main: 20min easy recovery. Cool-down: 5min walk", sets: "1x20min", rest: "-", purpose: "Easy recovery run. Form and comfortable pace" },
      ]},
      { day: "Saturday", sessions: [
        { d: S, dur: "2000m", z: "Z2", workout: "Warm-up: 500m easy + 6x25m drill. Main: 6x200m Z2 smooth. Cool-down: 300m easy", sets: "6x200m", rest: "45s", purpose: "Progressive return to training. Z2 comfortable and controlled" },
        { d: C, dur: "20 min", z: "-", workout: "Light Core Work: 3x20s planks. Gentle Stretching: 10min. Activation: 2x8 bridges", sets: "3 sets each", rest: "-", purpose: "Light core activation. Maintain patterns without fatigue" },
      ]},
      { day: "Sunday", sessions: [
        { d: B, dur: "90 min", z: "Z2", workout: "Warm-up: 15min easy + 3x2min builds. Main: 65min progressive return. Cool-down: 10min easy", sets: "1x65min", rest: "-", purpose: "Progressive return to training. Should feel stronger as ride progresses" },
        { d: R, dur: "25 min", z: "Z2", workout: "Easy brick off bike", sets: "1x25min", rest: "-", purpose: "Easy brick practice. Smooth transition, comfortable pace" },
      ]},
    ],
  },
  {
    week: 18, phase: "Peak Phase", title: "Final Peak", hours: 13.5,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "3000m", z: "Z2-Z3", workout: "Warm-up: 800m easy + 8x25m race pace. Main: 1900m race simulation. Cool-down: 300m easy", sets: "1x1900m", rest: "-", purpose: "Final race simulation. Continuous swim at race pace" },
        { d: C, dur: "30 min", z: "-", workout: "Peak Core Strength: 4x45s weighted. Power Development: 3x12 rotational. Stability: 3x45s challenges. Integration: 3x12 complex", sets: "4 sets each", rest: "60s", purpose: "Peak core strength development" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "120 min", z: "Z2-Z3", workout: "Warm-up: 20min easy + 4x3min builds. Main: 90min with 45min race pace. Cool-down: 10min easy", sets: "1x45min", rest: "-", purpose: "Final race pace practice. 45min block at race intensity" },
        { d: ST, dur: "40 min", z: "-", workout: "Final Strength Session: 4x6-8 heavy. Power Maintenance: 3x6 explosive. Stability: 3x12 each side. Recovery: 10min stretching", sets: "4 sets each", rest: "3min", purpose: "Final strength session. Peak loads with perfect form" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "85 min", z: "Z2-Z3", workout: "Warm-up: 20min easy + 8x15s strides. Main: 60min with 40min race pace. Cool-down: 5min walk", sets: "1x40min", rest: "-", purpose: "Final race pace tempo. Practice race fueling" },
        { d: F, dur: "30 min", z: "-", workout: "Peak Mobility: 25min intensive. Relaxation: 5min meditation", sets: "-", rest: "-", purpose: "Peak mobility work. Address final tight spots" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "3300m", z: "Z2-Z3", workout: "Warm-up: 900m easy + 8x50m build. Main: 2100m race pace. Cool-down: 300m easy", sets: "1x2100m", rest: "-", purpose: "Final race pace swim. Over-distance for confidence" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "45 min", z: "Z1-Z2", workout: "Easy swim with technique focus", sets: "-", rest: "-", purpose: "Extended recovery. Feel for water and perfect technique" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "4.5 hours", z: "Z2", workout: "Warm-up: 30min easy + 4x5min builds. Main: 3.75hr with full race nutrition. Cool-down: 15min easy", sets: "1x3.75hr", rest: "-", purpose: "Final race nutrition rehearsal. Exact race day timing and products" },
        { d: R, dur: "55 min", z: "Z2-Z3", workout: "Race pace simulation brick", sets: "1x55min", rest: "-", purpose: "Final race pace brick. Practice transition and race rhythm" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "115 min", z: "Z2", workout: "Warm-up: 25min easy + 6x15s strides. Main: 85min with race nutrition. Cool-down: 5min walk", sets: "1x85min", rest: "-", purpose: "Peak long run with race nutrition. Final practice of all fueling" },
      ]},
    ],
  },
  // ===== PHASE 4: TAPER (Weeks 19-21) =====
  {
    week: 19, phase: "Taper", title: "60% Volume Reduction", hours: 8.5,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "1500m", z: "Z2-Z3", workout: "Warm-up: 400m easy + 4x25m race pace. Main: 5x150m Z2-Z3 smooth. Cool-down: 200m easy", sets: "5x150m", rest: "30s", purpose: "Pre-race sharpening. Each 150m at race pace" },
        { d: C, dur: "15 min", z: "-", workout: "Light Planks: 2x20s. Glute Activation: 2x10. Gentle Stretching: 8min", sets: "2 sets each", rest: "-", purpose: "Light activation only. Don't create fatigue" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "75 min", z: "Z2-Z3", workout: "Warm-up: 15min easy + 3x2min builds. Main: 50min with 20min race pace. Cool-down: 10min easy", sets: "1x20min", rest: "-", purpose: "Race pace sharpening. 20min at race intensity" },
        { d: ST, dur: "25 min", z: "-", workout: "Bodyweight Squats: 2x8. Light Lunges: 2x6 each leg. Easy Push-ups: 2x6. Gentle Stretching: 10min", sets: "2 sets each", rest: "60s", purpose: "Sharpening. Very light loads, perfect form" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "40 min", z: "Z2-Z3", workout: "Warm-up: 15min easy + 4x15s strides. Main: 20min race pace block. Cool-down: 5min walk", sets: "1x20min", rest: "-", purpose: "Race pace confidence. Controlled and sustainable" },
        { d: F, dur: "20 min", z: "-", workout: "Pre-race Mobility: 15min targeted. Relaxation: 5min breathing", sets: "-", rest: "-", purpose: "Pre-race mobility. Address tight spots. Mental preparation" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "1400m", z: "Z2-Z3", workout: "Warm-up: 300m easy + 4x25m smooth. Main: 6x150m Z2-Z3 race feel. Cool-down: 200m easy", sets: "6x150m", rest: "20s", purpose: "Race feel development. Each 150m should feel like race pace" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "20 min", z: "Z1", workout: "Easy movement or complete rest", sets: "-", rest: "-", purpose: "Recovery priority. Very light or complete rest" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "2.5 hours", z: "Z2", workout: "Warm-up: 15min easy + 3x3min builds. Main: 2hr final long ride. Cool-down: 15min easy", sets: "1x2hr", rest: "-", purpose: "Final long ride with race nutrition. Comfortable pace" },
        { d: R, dur: "30 min", z: "Z2-Z3", workout: "Final brick practice", sets: "1x30min", rest: "-", purpose: "Final brick. Smooth transition and race rhythm" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "60 min", z: "Z2", workout: "Warm-up: 15min easy + 4x15s strides. Main: 40min final long run. Cool-down: 5min walk", sets: "1x40min", rest: "-", purpose: "Final long run before race week. Should feel strong and confident" },
      ]},
    ],
  },
  {
    week: 20, phase: "Taper", title: "40% Volume Reduction", hours: 6.0,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "1200m", z: "Z2-Z3", workout: "Warm-up: 300m easy + 4x25m build. Main: 4x150m Z2-Z3 race pace. Cool-down: 150m easy", sets: "4x150m", rest: "30s", purpose: "Final race pace practice. Smooth and controlled" },
        { d: C, dur: "15 min", z: "-", workout: "Light Planks: 2x15s. Activation: 5min gentle movement. Stretching: 5min", sets: "2 sets each", rest: "-", purpose: "Final preparation. Keep core activated, no fatigue" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "60 min", z: "Z2-Z3", workout: "Warm-up: 15min easy + 3x1min builds. Main: 35min with short race pace efforts. Cool-down: 10min easy", sets: "3x3min", rest: "3min easy", purpose: "Short race pace efforts. Focus on leg turnover and feel" },
        { d: ST, dur: "20 min", z: "-", workout: "Activation Only: 2x5 bodyweight squats. Arm Circles: 2x10 each direction. Gentle Stretching: 10min", sets: "2 sets each", rest: "-", purpose: "Pure activation. Movement preparation without fatigue" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "35 min", z: "Z2-Z3", workout: "Warm-up: 15min easy + 4x15s strides. Main: 15min with short race pace efforts. Cool-down: 5min walk", sets: "3x2min", rest: "2min easy", purpose: "Short race pace efforts. Focus on leg speed and rhythm" },
        { d: F, dur: "15 min", z: "-", workout: "Final Preparations: 10min gentle stretching. Relaxation: 5min breathing", sets: "-", rest: "-", purpose: "Final preparations. Address tight spots. Mental focus" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "1000m", z: "Z2-Z3", workout: "Warm-up: 200m easy + 4x25m smooth. Main: 4x150m Z2-Z3 race feel. Cool-down: 100m easy", sets: "4x150m", rest: "20s", purpose: "Final swim preparation. Should feel smooth" },
      ]},
      { day: "Friday", sessions: [
        { d: AR, dur: "20 min", z: "Z1", workout: "Easy swim or complete rest", sets: "-", rest: "-", purpose: "Recovery before race week" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "90 min", z: "Z1-Z2", workout: "Warm-up: 15min easy + 3x30s builds. Main: 65min easy with short openers. Cool-down: 10min easy", sets: "3x20s", rest: "2min easy", purpose: "Easy ride with short openers. Very easy pace" },
        { d: R, dur: "20 min", z: "Z1-Z2", workout: "Easy run off bike with strides", sets: "3x10s", rest: "1min easy", purpose: "Final movement preparation. Easy pace, smooth strides" },
      ]},
      { day: "Sunday", sessions: [
        { d: R, dur: "45 min", z: "Z1-Z2", workout: "Warm-up: 15min easy + 4x10s strides. Main: 25min final easy run. Cool-down: 5min walk", sets: "1x25min", rest: "-", purpose: "Final easy run before race week. Should feel fresh and confident" },
      ]},
    ],
  },
  {
    week: 21, phase: "Taper", title: "Race Week", hours: 4.5,
    days: [
      { day: "Monday", sessions: [
        { d: S, dur: "1200m", z: "Z2-Z3", workout: "Warm-up: 300m easy + 4x25m build. Main: 4x150m Z2-Z3 smooth. Cool-down: 150m easy", sets: "4x150m", rest: "20s", purpose: "Maintain feel for water. Smooth, controlled pace" },
        { d: C, dur: "10 min", z: "-", workout: "Light Planks: 2x20s. Glute Activation: 2x10. Gentle Stretching: 5min", sets: "2 sets each", rest: "-", purpose: "Activation only. Keep core engaged, don't fatigue" },
      ]},
      { day: "Tuesday", sessions: [
        { d: B, dur: "45 min", z: "Z2-Z3", workout: "Warm-up: 15min easy + 3x1min builds. Main: 3x2min Z3 openers. Cool-down: 10min easy", sets: "3x2min", rest: "2min easy", purpose: "Leg turnover and race pace feel. Short efforts for sharpness" },
        { d: ST, dur: "15 min", z: "-", workout: "Bodyweight Squats: 2x8. Arm Circles: 2x10 each direction. Leg Swings: 2x10 each leg. Gentle Stretching: 5min", sets: "2 sets each", rest: "-", purpose: "Pure activation. Movement preparation for race day" },
      ]},
      { day: "Wednesday", sessions: [
        { d: R, dur: "30 min", z: "Z2", workout: "Warm-up: 15min easy + 4x15s strides. Main: 10min steady Z2. Cool-down: 5min walk", sets: "4x15s", rest: "45s easy", purpose: "Maintain leg speed and running rhythm" },
        { d: F, dur: "15 min", z: "-", workout: "Gentle Yoga: 10min easy flow. Targeted Stretching: 5min problem areas", sets: "-", rest: "-", purpose: "Light mobility. Address tight spots. Relaxation and mental preparation" },
      ]},
      { day: "Thursday", sessions: [
        { d: S, dur: "1000m", z: "Z2-Z3", workout: "Warm-up: 200m easy + 4x25m build. Main: 4x100m Z2-Z3 race feel. Cool-down: 100m easy", sets: "4x100m", rest: "15s", purpose: "Final swim preparation. Race pace and sighting. Smooth and confident" },
      ]},
      { day: "Friday", sessions: [
        { d: REST, dur: "-", z: "-", workout: "Complete rest day", sets: "-", rest: "-", purpose: "Full recovery. Focus on hydration, nutrition, mental preparation" },
      ]},
      { day: "Saturday", sessions: [
        { d: B, dur: "30 min", z: "Z1-Z2", workout: "Warm-up: 15min easy. Main: 3x10s leg speed. Cool-down: 10min easy", sets: "3x10s", rest: "2min easy", purpose: "Pre-race activation. Very easy with short leg speed efforts" },
        { d: R, dur: "15 min", z: "Z1-Z2", workout: "Easy run off bike with 3x10s strides", sets: "3x10s", rest: "1min easy", purpose: "Final movement preparation. Easy pace, smooth strides" },
      ]},
      { day: "Sunday", sessions: [
        { d: "RACE", dur: "IRONMAN 70.3", z: "Race", workout: "1.9km swim, 90km bike, 21.1km run", sets: "-", rest: "-", purpose: "Execute race plan. Trust your training. Pace conservatively early, finish strong" },
      ]},
    ],
  },
]

// Discipline display info
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function getCurrentWeek(startDate) {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000))
  return Math.max(1, Math.min(21, diff + 1))
}

export function getWeekWithDates(weekNum, startDate, checked = {}) {
  const weekData = WEEKS.find(w => w.week === weekNum)
  if (!weekData) return null

  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const weekStart = new Date(start)
  weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7)

  const days = weekData.days.map((day, di) => {
    const dayDate = new Date(weekStart)
    dayDate.setDate(dayDate.getDate() + di)
    return {
      ...day,
      day: WEEKDAYS[dayDate.getDay()],
      date: dayDate.toISOString().split("T")[0],
      sessions: day.sessions.map((session, si) => ({
        ...session,
        checked: !!checked[`w${weekNum}-d${di}-s${si}`],
      })),
    }
  })

  const totalSessions = days.reduce((sum, d) => sum + d.sessions.length, 0)
  const completedSessions = days.reduce((sum, d) => sum + d.sessions.filter(s => s.checked).length, 0)

  return {
    week: weekData.week,
    phase: weekData.phase,
    title: weekData.title,
    hours: weekData.hours,
    progress: `${completedSessions}/${totalSessions}`,
    days,
  }
}

export const DISCIPLINE_INFO = {
  [S]:    { label: "Swim",     icon: "🏊", color: "#3b82f6" },
  [B]:    { label: "Bike",     icon: "🚴", color: "#22c55e" },
  [R]:    { label: "Run",      icon: "🏃", color: "#f59e0b" },
  [C]:    { label: "Core",     icon: "💪", color: "#8b5cf6" },
  [ST]:   { label: "Strength", icon: "🏋️", color: "#ec4899" },
  [F]:    { label: "Flex",     icon: "🧘", color: "#06b6d4" },
  [AR]:   { label: "Recovery", icon: "🌿", color: "#10b981" },
  [REST]: { label: "Rest",     icon: "😴", color: "#6b7280" },
  "RACE": { label: "Race",     icon: "🏁", color: "#ef4444" },
}
