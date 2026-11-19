// Exercise library.
// Each exercise has two poses (start + end). The stick figure animates between them.
// Canvas is 240 x 200, ground at y = 184. Side view, facing right.
// Joints:  head, neck, mid (middle of spine), hip,
//          eA/hA = near elbow/hand,  eB/hB = far elbow/hand,
//          kA/fA = near knee/foot,   kB/fB = far knee/foot.
// PLACEHOLDERS — these will be replaced with Jordan's real exercises from screenshots.

const STAND = {
  head: [120, 30], neck: [120, 50], mid: [120, 78], hip: [120, 106],
  eA: [124, 78], hA: [127, 104], eB: [116, 78], hB: [113, 104],
  kA: [122, 144], fA: [123, 182], kB: [118, 144], fB: [117, 182],
};

const EXERCISES = [
  {
    id: "cat-cow",
    name: "Cat–Cow",
    sided: false,
    cue: "Move slowly. Round up, then let the belly drop.",
    poses: [
      { // cat
        head: [70, 130], neck: [88, 108], mid: [122, 86], hip: [156, 106],
        eA: [89, 144], hA: [89, 182], eB: [95, 144], hB: [95, 182],
        kA: [157, 180], fA: [202, 182], kB: [151, 180], fB: [196, 182],
      },
      { // cow
        head: [68, 90], neck: [88, 110], mid: [122, 126], hip: [156, 108],
        eA: [89, 145], hA: [89, 182], eB: [95, 145], hB: [95, 182],
        kA: [157, 180], fA: [202, 182], kB: [151, 180], fB: [196, 182],
      },
    ],
  },
  {
    id: "deep-squat",
    name: "Deep Squat",
    sided: false,
    cue: "Heels down, chest tall, knees track over toes.",
    poses: [
      { ...STAND, eA: [132, 80], hA: [150, 92], eB: [128, 82], hB: [146, 94] },
      {
        head: [136, 78], neck: [129, 96], mid: [118, 122], hip: [102, 148],
        eA: [150, 106], hA: [174, 104], eB: [146, 110], hB: [170, 108],
        kA: [148, 138], fA: [126, 182], kB: [142, 142], fB: [120, 182],
      },
    ],
  },
  {
    id: "hip-flexor",
    name: "Half-Kneeling Hip Flexor",
    sided: true,
    cue: "Squeeze the back glute, shift hips forward.",
    poses: [
      {
        head: [120, 62], neck: [120, 82], mid: [120, 106], hip: [120, 130],
        eA: [124, 106], hA: [127, 128], eB: [116, 106], hB: [113, 128],
        kA: [160, 130], fA: [160, 182], kB: [110, 180], fB: [66, 182],
      },
      {
        head: [127, 66], neck: [128, 88], mid: [130, 112], hip: [134, 138],
        eA: [140, 64], hA: [146, 40], eB: [136, 64], hB: [140, 40],
        kA: [168, 134], fA: [162, 182], kB: [106, 180], fB: [62, 182],
      },
    ],
  },
  {
    id: "forward-fold",
    name: "Standing Forward Fold",
    sided: false,
    cue: "Soft knees. Let your head hang heavy.",
    poses: [
      { ...STAND, eA: [122, 34], hA: [124, 10], eB: [118, 34], hB: [116, 10] },
      {
        head: [148, 160], neck: [146, 140], mid: [138, 114], hip: [118, 100],
        eA: [151, 158], hA: [152, 180], eB: [146, 158], hB: [145, 180],
        kA: [122, 142], fA: [123, 182], kB: [118, 142], fB: [117, 182],
      },
    ],
  },
];

// Pose used on the "done" screen.
const CELEBRATE = [
  { ...STAND, eA: [142, 44], hA: [162, 26], eB: [98, 44], hB: [78, 26] },
  { ...STAND,
    head: [120, 18], neck: [120, 38], mid: [120, 66], hip: [120, 94],
    eA: [144, 30], hA: [164, 10], eB: [96, 30], hB: [76, 10],
    kA: [128, 130], fA: [124, 168], kB: [112, 130], fB: [116, 168] },
];
