// Exercise library.
// Each exercise has a list of poses. The stick figure flows through them in order
// and loops back to the first (2 poses = back and forth).
// Canvas is 240 x 200, ground at y = 184.
//   side view (front: false): facing right, far arm/leg drawn faded.
//   front view (front: true): facing the viewer, both arms/legs solid.
// Joints:  head, neck, mid (middle of spine), hip,
//          eA/hA = elbow/hand A,  eB/hB = elbow/hand B,
//          kA/fA = knee/foot A,   kB/fB = knee/foot B.
// In front view, A = the limb on the viewer's right.

const shift = (p, dx, dy) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, [v[0] + dx, v[1] + dy]]));
// Mirror left/right AND swap A/B, so each limb stays on its own side when animating.
const SWAP = { eA: "eB", hA: "hB", kA: "kB", fA: "fB", eB: "eA", hB: "hA", kB: "kA", fB: "fA" };
const mirror = (p) => Object.fromEntries(Object.keys(p).map((k) => {
  const src = p[SWAP[k] || k];
  return [k, [240 - src[0], src[1]]];
}));

const STAND = {
  head: [120, 30], neck: [120, 50], mid: [120, 78], hip: [120, 106],
  eA: [124, 78], hA: [127, 104], eB: [116, 78], hB: [113, 104],
  kA: [122, 144], fA: [123, 182], kB: [118, 144], fB: [117, 182],
};
const FRONT = {
  head: [120, 30], neck: [120, 50], mid: [120, 78], hip: [120, 106],
  eA: [134, 78], hA: [138, 104], eB: [106, 78], hB: [102, 104],
  kA: [128, 144], fA: [130, 182], kB: [112, 144], fB: [110, 182],
};

// ---- Poses ----
const BOUNCE_DOWN = {
  head: [120, 38], neck: [120, 58], mid: [120, 84], hip: [120, 112],
  eA: [134, 84], hA: [138, 108], eB: [106, 84], hB: [102, 108],
  kA: [132, 146], fA: [130, 182], kB: [108, 146], fB: [110, 182],
};

const WAVE_UP = { ...STAND, head: [121, 32], neck: [120, 52], mid: [118, 79],
  eA: [130, 30], hA: [122, 12], eB: [110, 30], hB: [118, 12] };
const WAVE_MID = {
  head: [160, 86], neck: [146, 80], mid: [130, 88], hip: [116, 104],
  eA: [160, 100], hA: [170, 122], eB: [156, 102], hB: [166, 124],
  kA: [126, 143], fA: [121, 182], kB: [122, 143], fB: [117, 182],
};
const WAVE_FOLD = {
  head: [160, 142], neck: [152, 120], mid: [136, 100], hip: [112, 100],
  eA: [136, 90], hA: [124, 64], eB: [140, 94], hB: [130, 68],
  kA: [126, 142], fA: [120, 182], kB: [122, 142], fB: [116, 182],
};

const VSWING = { ...STAND, eA: [128, 30], hA: [134, 8], eB: [108, 74], hB: [96, 94] };
const VSWING_2 = { ...STAND, eA: [108, 74], hA: [96, 94], eB: [128, 30], hB: [134, 8] };

const DEAD_ARM = { ...FRONT, head: [126, 31],
  eA: [136, 76], hA: [106, 60], eB: [104, 82], hB: [128, 104],
  kA: [128, 145], kB: [112, 145] };

// Arms straight out to the sides, passed through on the way between wraps.
const ARMS_OUT = { ...FRONT, eA: [148, 52], hA: [176, 54], eB: [92, 52], hB: [64, 54],
  kA: [128, 145], kB: [112, 145] };

const HORSE = {
  head: [120, 54], neck: [120, 74], mid: [120, 100], hip: [120, 128],
  eA: [140, 104], hA: [134, 122], eB: [100, 104], hB: [106, 122],
  kA: [156, 134], fA: [164, 182], kB: [84, 134], fB: [76, 182],
};
const HORSE_LOW = { ...shift(HORSE, 0, 4), fA: HORSE.fA, fB: HORSE.fB };

const DOWN_DOG = {
  head: [80, 154], neck: [86, 136], mid: [106, 112], hip: [132, 88],
  eA: [74, 160], hA: [64, 182], eB: [78, 160], hB: [68, 182],
  kA: [160, 134], fA: [188, 182], kB: [156, 134], fB: [184, 182],
};
const UP_DOG = {
  head: [74, 86], neck: [82, 106], mid: [108, 128], hip: [140, 142],
  eA: [80, 144], hA: [78, 182], eB: [84, 144], hB: [82, 182],
  kA: [170, 162], fA: [200, 180], kB: [166, 162], fB: [196, 180],
};

const SQUAT_FRONT = {
  head: [120, 80], neck: [120, 100], mid: [120, 126], hip: [120, 152],
  eA: [140, 118], hA: [124, 114], eB: [100, 118], hB: [116, 114],
  kA: [160, 140], fA: [150, 182], kB: [80, 140], fB: [90, 182],
};
const SQUAT_REACH = { ...SQUAT_FRONT,
  head: [114, 86], neck: [124, 102], mid: [122, 128], hip: [120, 152],
  eA: [134, 156], hA: [132, 180], eB: [114, 74], hB: [110, 46] };
const KNEE_TAP = {
  head: [126, 86], neck: [124, 106], mid: [122, 132], hip: [122, 158],
  eA: [142, 120], hA: [146, 106], eB: [94, 112], hB: [62, 122],
  kA: [162, 146], fA: [152, 182], kB: [118, 180], fB: [72, 180],
};

const STRADDLE_C = {
  head: [120, 102], neck: [120, 122], mid: [120, 148], hip: [120, 174],
  eA: [140, 150], hA: [156, 174], eB: [100, 150], hB: [84, 174],
  kA: [160, 178], fA: [204, 180], kB: [80, 178], fB: [36, 180],
};
const STRADDLE_R = { ...STRADDLE_C,
  head: [160, 128], neck: [148, 136], mid: [132, 154],
  eA: [164, 156], hA: [174, 178], eB: [140, 106], hB: [174, 98] };

const NINETY = {
  head: [120, 104], neck: [120, 124], mid: [120, 150], hip: [120, 176],
  eA: [138, 152], hA: [150, 180], eB: [102, 152], hB: [90, 180],
  kA: [146, 140], fA: [164, 180], kB: [94, 140], fB: [76, 180],
};

const NINETY_R = { ...NINETY, kA: [168, 168], kB: [110, 166] };

const CRAB_SIT = {
  head: [110, 112], neck: [118, 132], mid: [128, 156], hip: [140, 176],
  eA: [104, 156], hA: [94, 182], eB: [108, 156], hB: [98, 182],
  kA: [168, 146], fA: [190, 182], kB: [164, 146], fB: [186, 182],
};
const CRAB_UP = {
  head: [92, 114], neck: [104, 126], mid: [128, 128], hip: [150, 130],
  eA: [100, 154], hA: [96, 182], eB: [104, 154], hB: [100, 182],
  kA: [182, 130], fA: [186, 182], kB: [178, 130], fB: [182, 182],
};

const COSSACK = {
  head: [144, 78], neck: [146, 98], mid: [148, 124], hip: [150, 148],
  eA: [160, 112], hA: [150, 124], eB: [136, 112], hB: [146, 124],
  kA: [180, 140], fA: [170, 182], kB: [110, 162], fB: [66, 180],
};

const EXERCISES = [
  { id: "body-bounces", name: "Body Bounces", front: true,
    cue: "Stay loose. Small, springy hops.",
    poses: [BOUNCE_DOWN, shift(FRONT, 0, -12)] },
  { id: "neck-circles", name: "Neck Circles", front: true,
    cue: "Slow circles. Let the head be heavy.",
    poses: [{ ...FRONT, head: [131, 34] }, { ...FRONT, head: [120, 38] }, { ...FRONT, head: [109, 34] }, { ...FRONT, head: [120, 25] }] },
  { id: "body-waves", name: "Body Waves", front: false,
    cue: "Arms up, then roll down. Hands go forward, down and behind you.",
    poses: [WAVE_UP, WAVE_MID, WAVE_FOLD, WAVE_MID], pass: [1, 3] },
  { id: "vertical-arm-swings", name: "Vertical Arm Swings", front: false,
    cue: "One arm forward and up, the other back. Swap.",
    poses: [VSWING, VSWING_2] },
  { id: "dead-arm-swings", name: "Dead Arm Swings", front: true,
    cue: "Rotate the torso and let the arms swing like ropes.",
    poses: [DEAD_ARM, ARMS_OUT, mirror(DEAD_ARM), ARMS_OUT], pass: [1, 3] },
  { id: "horse-stance", name: "Horse Stance", front: true,
    cue: "Wide stance, sit low, chest proud.",
    poses: [HORSE, HORSE_LOW] },
  { id: "down-up-dogs", name: "Down / Up Dogs", front: false,
    cue: "Push the hips high, then sweep through to open the chest.",
    poses: [DOWN_DOG, UP_DOG] },
  { id: "deep-squat-reach", name: "Deep Squat Reach", front: true,
    cue: "One hand down, the other to the sky. Follow it with your eyes.",
    poses: [SQUAT_FRONT, SQUAT_REACH, SQUAT_FRONT, mirror(SQUAT_REACH)] },
  { id: "deep-squat-knee-taps", name: "Deep Squat Knee Taps", front: true,
    cue: "Drop one knee to the middle, open the chest. Alternate.",
    poses: [SQUAT_FRONT, KNEE_TAP, SQUAT_FRONT, mirror(KNEE_TAP)] },
  { id: "straddle", name: "Straddle", front: true,
    cue: "Legs stay wide. Side bend over one leg, then the other.",
    poses: [STRADDLE_C, STRADDLE_R, STRADDLE_C, mirror(STRADDLE_R)] },
  { id: "ninety-ninety", name: "90/90", front: true,
    cue: "Sit tall. Rotate both knees side to side.",
    poses: [NINETY, NINETY_R, NINETY, mirror(NINETY_R)] },
  { id: "crab-pose", name: "Crab Pose", front: false,
    cue: "Hands behind you, drive the hips up.",
    poses: [CRAB_SIT, CRAB_UP] },
  { id: "cossack", name: "Cossack", front: true,
    cue: "Shift side to side. Straight leg, toes up.",
    poses: [COSSACK, mirror(COSSACK)] },
];

// Pose used on the "done" screen.
const CELEBRATE = [
  { ...STAND, eA: [142, 44], hA: [162, 26], eB: [98, 44], hB: [78, 26] },
  { ...STAND,
    head: [120, 18], neck: [120, 38], mid: [120, 66], hip: [120, 94],
    eA: [144, 30], hA: [164, 10], eB: [96, 30], hB: [76, 10],
    kA: [128, 130], fA: [124, 168], kB: [112, 130], fB: [116, 168] },
];
