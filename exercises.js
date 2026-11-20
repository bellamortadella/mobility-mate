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
const swapAB = (p) => Object.fromEntries(Object.keys(p).map((k) => [k, p[SWAP[k] || k]]));
// Straight arms: put each elbow halfway between shoulder (neck) and hand.
const straightArms = (p) => ({ ...p,
  eA: [(p.neck[0] + p.hA[0]) / 2, (p.neck[1] + p.hA[1]) / 2],
  eB: [(p.neck[0] + p.hB[0]) / 2, (p.neck[1] + p.hB[1]) / 2] });
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

// ---- Batch 2 poses ----
const JUMP_TWIST = {
  head: [121, 38], neck: [120, 58], mid: [120, 84], hip: [122, 112],
  eA: [132, 62], hA: [112, 66], eB: [96, 58], hB: [84, 68],
  kA: [140, 144], fA: [142, 182], kB: [124, 146], fB: [126, 182],
};
const JUMP_AIR = { ...shift(FRONT, 0, -14), eA: [146, 40], hA: [136, 46], eB: [94, 40], hB: [104, 46] };

// Straight arms at an angle (0 = straight up, 90 = straight forward), side view.
const armsAngle = (deg) => {
  const r = (deg * Math.PI) / 180, L = 46, sx = Math.sin(r), sy = -Math.cos(r);
  const [nx, ny] = STAND.neck;
  return { ...STAND,
    eA: [nx + sx * L / 2, ny + sy * L / 2], hA: [nx + sx * L, ny + sy * L],
    eB: [nx - 3 + sx * L / 2, ny + 2 + sy * L / 2], hB: [nx - 3 + sx * L, ny + 2 + sy * L] };
};
// One full circle forward (up → front → down → back → up), then one full circle back.
const CIRCLE_FWD = [0, 45, 90, 135, 180, 225, 270, 315].map(armsAngle);
const CIRCLE_BACK = [0, -45, -90, -135, -180, -225, -270, -315].map(armsAngle);

const AURA_SIDE = straightArms({
  head: [116, 32], neck: [120, 52], mid: [121, 80], hip: [120, 108],
  eA: [146, 48], hA: [172, 42], eB: [100, 32], hB: [82, 14],
  kA: [134, 146], fA: [144, 182], kB: [108, 146], fB: [98, 182],
});
const AURA_MID = straightArms({
  head: [122, 44], neck: [120, 64], mid: [120, 90], hip: [120, 116],
  eA: [0, 0], hA: [150, 114], eB: [0, 0], hB: [90, 114],
  kA: [138, 150], fA: [146, 182], kB: [104, 150], fB: [96, 182],
});

// Reverse lunge, side view: near leg in front, far arm reaching overhead.
const LUNGE_SIDE = {
  head: [121, 66], neck: [118, 86], mid: [117, 112], hip: [116, 138],
  eA: [124, 112], hA: [134, 132], eB: [124, 60], hB: [132, 36],
  kA: [150, 140], fA: [150, 182], kB: [100, 176], fB: [64, 180],
};
const TOES = { ...shift(STAND, 0, -6), fA: [124, 182], fB: [118, 182],
  eA: [136, 62], hA: [160, 66], eB: [132, 64], hB: [156, 68] };
const TOE_SQUAT = {
  head: [132, 78], neck: [127, 96], mid: [118, 122], hip: [106, 146],
  eA: [148, 104], hA: [172, 104], eB: [144, 106], hB: [168, 106],
  kA: [150, 134], fA: [132, 182], kB: [144, 138], fB: [126, 182],
};

const WGS_DOWN = {
  head: [172, 104], neck: [156, 112], mid: [138, 124], hip: [118, 140],
  eA: [150, 146], hA: [148, 180], eB: [154, 146], hB: [152, 180],
  kA: [154, 146], fA: [162, 182], kB: [86, 162], fB: [54, 182],
};
const WGS_REACH = { ...WGS_DOWN, head: [166, 96], neck: [152, 108], eA: [154, 82], hA: [156, 54] };

// ---- Batch 3 poses ----
const ROCK_MID = {
  head: [120, 80], neck: [120, 100], mid: [120, 126], hip: [120, 152],
  eA: [142, 120], hA: [122, 112], eB: [98, 120], hB: [118, 112],
  kA: [160, 140], fA: [150, 182], kB: [80, 140], fB: [90, 182],
};
const ROCK_SIDE = {
  head: [134, 82], neck: [133, 102], mid: [134, 128], hip: [136, 154],
  eA: [156, 122], hA: [136, 114], eB: [112, 122], hB: [132, 114],
  kA: [168, 144], fA: [150, 182], kB: [100, 154], fB: [90, 182],
};

// Deer pose, front view: front leg bent across in front, back leg bent out behind; hands behind head.
const DEER_TALL = {
  head: [120, 98], neck: [120, 118], mid: [120, 146], hip: [120, 172],
  eA: [146, 100], hA: [127, 94], eB: [94, 100], hB: [113, 94],
  kA: [162, 170], fA: [128, 182], kB: [84, 176], fB: [52, 166],
};
const DEER_FOLD = { ...DEER_TALL,
  head: [148, 128], neck: [140, 140], mid: [130, 157],
  eA: [166, 130], hA: [154, 120], eB: [128, 118], hB: [142, 116] };

const LONG_SIT = {
  head: [104, 104], neck: [98, 124], mid: [100, 150], hip: [104, 172],
  eA: [92, 152], hA: [88, 182], eB: [96, 152], hB: [92, 182],
  kA: [146, 174], fA: [190, 178], kB: [142, 174], fB: [186, 178],
};
const BENT_SIT = { ...LONG_SIT, hip: [104, 176], kA: [140, 144], fA: [166, 182], kB: [136, 144], fB: [162, 182] };
const TABLETOP = {
  head: [76, 112], neck: [92, 124], mid: [116, 128], hip: [140, 132],
  eA: [88, 154], hA: [86, 182], eB: [92, 154], hB: [90, 182],
  kA: [172, 130], fA: [176, 182], kB: [168, 130], fB: [172, 182],
};

// ---- Around the worlds: wide stance, hands behind head, torso circles ----
const WIDE_LEGS = { kA: [146, 144], fA: [164, 182], kB: [94, 144], fB: [76, 182] };
const ATW_FOLD = { head: [120, 134], neck: [120, 120], mid: [120, 108], hip: [120, 104],
  eA: [148, 116], hA: [128, 132], eB: [92, 116], hB: [112, 132], ...WIDE_LEGS };
const ATW_LOW = { head: [162, 124], neck: [150, 112], mid: [134, 104], hip: [116, 104],
  eA: [176, 122], hA: [156, 128], eB: [148, 96], hB: [166, 116], ...WIDE_LEGS };
const ATW_SIDE = { head: [154, 46], neck: [142, 58], mid: [126, 78], hip: [114, 104],
  eA: [166, 64], hA: [156, 50], eB: [128, 32], hB: [146, 38], ...WIDE_LEGS };
const ATW_UP = { head: [119, 28], neck: [120, 48], mid: [122, 76], hip: [120, 104],
  eA: [148, 34], hA: [128, 22], eB: [92, 34], hB: [112, 22], ...WIDE_LEGS };

// ---- Batch 4 poses ----
// Golf arms: wide stance; one arm long and angled up to the side, the other bent with hand at the shoulder.
const GOLF_ARMS = {
  head: [124, 32], neck: [121, 52], mid: [120, 80], hip: [118, 108],
  eA: [150, 44], hA: [180, 34], eB: [96, 60], hB: [110, 48],
  kA: [140, 146], fA: [158, 182], kB: [100, 146], fB: [82, 182],
};
// Swinging low through the middle between sides.
const GOLF_MID = {
  head: [120, 32], neck: [120, 52], mid: [120, 80], hip: [120, 108],
  eA: [132, 80], hA: [126, 106], eB: [108, 80], hB: [114, 106],
  kA: [140, 146], fA: [158, 182], kB: [100, 146], fB: [82, 182],
};

// March slaps, side view: knee up, opposite hand slaps it.
const MARCH = { ...STAND,
  eA: [112, 78], hA: [104, 100], eB: [134, 76], hB: [144, 98],
  kA: [146, 100], fA: [150, 138] };

// Ballet squat (plié): wide, turned-out stance. Arms rounded out to the sides
// in the squat, reaching overhead as you rise.
const PLIE_UP = { ...FRONT,
  eA: [131, 28], hA: [140, 6], eB: [109, 28], hB: [100, 6],
  kA: [138, 144], fA: [152, 182], kB: [102, 144], fB: [88, 182] };
const PLIE_DOWN = { ...shift(FRONT, 0, 28),
  eA: [150, 94], hA: [174, 102], eB: [90, 94], hB: [66, 102],
  kA: [162, 150], fA: [152, 182], kB: [78, 150], fB: [88, 182] };

// Trunk twists: wide athletic stance, elbows out at chest height, hands in front of the chest.
const TWIST_LEGS = { hip: [120, 112], kA: [146, 150], fA: [156, 182], kB: [94, 150], fB: [84, 182] };
const TWIST_MID = { head: [120, 38], neck: [120, 58], mid: [120, 85], ...TWIST_LEGS,
  eA: [150, 82], hA: [128, 72], eB: [90, 82], hB: [112, 72] };
const TWIST_TURN = { head: [125, 38], neck: [121, 58], mid: [120, 85], ...TWIST_LEGS,
  eA: [148, 56], hA: [138, 44], eB: [112, 76], hB: [140, 66] };

// Standing side bend: top arm reaches over, bottom hand slides down the leg.
const SIDE_BEND = { ...FRONT,
  head: [150, 44], neck: [140, 58], mid: [127, 82], hip: [117, 106],
  eA: [150, 84], hA: [151, 110], eB: [128, 32], hB: [154, 16] };

// ---- Couch moves ----
// Seated fold & reach: sit on the couch edge, wide stance, fold to the floor, then one arm to the sky.
const COUCH_LEGS = { hip: [120, 122], kA: [158, 124], fA: [166, 184], kB: [82, 124], fB: [74, 184] };
const COUCH_FOLD = { ...COUCH_LEGS, head: [120, 162], neck: [120, 146], mid: [120, 134],
  eA: [132, 164], hA: [128, 184], eB: [108, 164], hB: [112, 184] };
const COUCH_REACH = { ...COUCH_LEGS, head: [138, 128], neck: [126, 136], mid: [122, 130],
  eA: [132, 104], hA: [139, 70], eB: [118, 160], hB: [112, 184] };

// Seated cat-cow, side view: hands behind head, round forward then open tall.
const COUCH_SEAT = { hip: [104, 128], kA: [140, 130], fA: [146, 184], kB: [136, 132], fB: [142, 184] };
const COUCH_ROUND = { ...COUCH_SEAT, mid: [122, 104], neck: [140, 104], head: [150, 120],
  eA: [154, 128], hA: [146, 110], eB: [150, 130], hB: [142, 112] };
const COUCH_OPEN = { ...COUCH_SEAT, mid: [102, 100], neck: [106, 72], head: [112, 52],
  eA: [86, 62], hA: [104, 46], eB: [90, 64], hB: [106, 48] };

// Couch-arm side bend: lying sideways over the armrest, hands behind head.
// The upper body keeps its shape and just rotates about the hip, so it stays side-on.
const ARM_LIE = { hip: [112, 112], kA: [72, 104], fA: [30, 108], kB: [80, 128], fB: [56, 116] };
const ARM_DRAPE = { ...ARM_LIE, mid: [138, 118], neck: [160, 132], head: [172, 148],
  eA: [182, 126], hA: [180, 146], eB: [150, 156], hB: [166, 160] };
const rotateUpper = (p, deg) => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), [ox, oy] = p.hip, r = { ...p };
  for (const k of ["mid", "neck", "head", "eA", "hA", "eB", "hB"]) {
    const x = p[k][0] - ox, y = p[k][1] - oy;
    r[k] = [ox + x * c + y * s, oy - x * s + y * c];
  }
  return r;
};
const ARM_UP = rotateUpper(ARM_DRAPE, 62);
ARM_UP.mid = [ARM_UP.mid[0] + 4, ARM_UP.mid[1] + 4];

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
  { id: "jump-twists", name: "Jump with Torso Rotations", front: true,
    cue: "Small hops. Hips twist one way, arms the other.",
    poses: [JUMP_TWIST, JUMP_AIR, mirror(JUMP_TWIST), JUMP_AIR], pass: [1, 3] },
  { id: "arm-circles", name: "Arm Circles", front: false,
    cue: "Big, straight-arm circles. Forward, then reverse.",
    poses: [...CIRCLE_FWD, ...CIRCLE_BACK],
    pass: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15], stepMs: 380, arcArms: true },
  { id: "aura-farmers", name: "Aura Farmers", front: true,
    cue: "Wide stance. Sweep the arms high, low through the middle, high the other side.",
    poses: [AURA_SIDE, AURA_MID, mirror(AURA_SIDE), AURA_MID], pass: [1, 3], arcArms: true },
  { id: "reverse-lunge-side-bend", name: "Reverse Lunge with Side Bend", front: false,
    cue: "Step back, lower the knee, reach over toward the front leg.",
    poses: [STAND, LUNGE_SIDE, STAND, swapAB(LUNGE_SIDE)] },
  { id: "heel-raised-squats", name: "Heel Raised Squats", front: false,
    cue: "Stay high on the balls of your feet the whole time.",
    poses: [TOES, TOE_SQUAT] },
  { id: "worlds-greatest-stretch", name: "World's Greatest Stretch", front: false,
    cue: "Deep lunge, hand inside the foot, rotate and reach to the sky.",
    poses: [WGS_DOWN, WGS_REACH] },
  { id: "deep-squat-rocks", name: "Deep Squat Rocks", front: true,
    cue: "Prayer hands, elbows in. Rock your weight side to side.",
    poses: [ROCK_SIDE, ROCK_MID, mirror(ROCK_SIDE), ROCK_MID], pass: [1, 3] },
  { id: "active-deer-pose", name: "Active Deer Pose", front: true, sided: true,
    cue: "Hands behind head. Sit tall, then fold over the front leg.",
    poses: [DEER_TALL, DEER_FOLD] },
  { id: "tabletop-core", name: "Tabletop + Core", front: false,
    cue: "Long sit, bend the knees, drive the hips up. Flow back down.",
    poses: [LONG_SIT, BENT_SIT, TABLETOP, BENT_SIT], pass: [1, 3] },
  { id: "around-the-worlds", name: "Around the Worlds", front: true,
    cue: "Wide stance, hands behind head. Circle the torso one way, then the other.",
    // From upright: circle down through the fold and back up, pause at the top, then circle the other way.
    poses: [ATW_UP, ATW_SIDE, ATW_LOW, ATW_FOLD, mirror(ATW_LOW), mirror(ATW_SIDE),
            ATW_UP, mirror(ATW_SIDE), mirror(ATW_LOW), ATW_FOLD, ATW_LOW, ATW_SIDE],
    pass: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11], stepMs: 600 },
  { id: "golf-arms", name: "Golf Arms", front: true,
    cue: "Wide stance. One arm long and high, swing low through the middle, swap sides.",
    poses: [GOLF_ARMS, GOLF_MID, mirror(GOLF_ARMS), GOLF_MID], pass: [1, 3], arcArms: true },
  { id: "march-slaps", name: "March Slaps", front: false,
    cue: "March tall. Slap each knee with the opposite hand.",
    poses: [MARCH, STAND, swapAB(MARCH), STAND], pass: [1, 3], stepMs: 450 },
  { id: "ballet-squats", name: "Ballet Squats", front: true,
    cue: "Toes out, knees wide. Sink with arms out, rise and reach overhead.",
    poses: [PLIE_UP, PLIE_DOWN], arcArms: true },
  { id: "trunk-rotations", name: "Trunk Rotations", front: true,
    cue: "Knees soft, elbows up. Twist side to side through the middle.",
    poses: [TWIST_TURN, TWIST_MID, mirror(TWIST_TURN), TWIST_MID], pass: [1, 3], stepMs: 700 },
  { id: "side-bends", name: "Side Bends", front: true,
    cue: "Reach up and over. Slide the other hand down your leg.",
    poses: [SIDE_BEND, FRONT, mirror(SIDE_BEND), FRONT], pass: [1, 3] },
  { id: "seated-fold-reach", name: "Seated Fold & Reach", front: true, prop: "couch-front",
    cue: "Sit on the edge, feet wide. Fold to the floor, then reach one arm to the sky.",
    poses: [COUCH_FOLD, COUCH_REACH, COUCH_FOLD, mirror(COUCH_REACH)], arcArms: true },
  { id: "seated-cat-cow", name: "Seated Cat-Cow", front: false, prop: "couch-side",
    cue: "Hands behind head. Round forward, elbows in. Open up tall, elbows wide.",
    poses: [COUCH_ROUND, COUCH_OPEN] },
  { id: "couch-arm-side-bend", name: "Couch-Arm Side Bend", front: true, sided: true, prop: "couch-arm",
    cue: "Lie sideways over the armrest. Drape down into the stretch, then side-crunch up.",
    poses: [ARM_DRAPE, ARM_UP] },
];

// Pose used on the "done" screen.
const CELEBRATE = [
  { ...STAND, eA: [142, 44], hA: [162, 26], eB: [98, 44], hB: [78, 26] },
  { ...STAND,
    head: [120, 18], neck: [120, 38], mid: [120, 66], hip: [120, 94],
    eA: [144, 30], hA: [164, 10], eB: [96, 30], hB: [76, 10],
    kA: [128, 130], fA: [124, 168], kB: [112, 130], fB: [116, 168] },
];
