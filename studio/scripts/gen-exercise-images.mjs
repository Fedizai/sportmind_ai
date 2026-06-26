import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'exercises');
mkdirSync(OUT_DIR, { recursive: true });

const STROKE = '#94a3b8';
const ACCENT = '#3b82f6';
const BG = '#0d1117';
const BORDER = '#1e293b';
const W = 10; // limb stroke width

// ---- primitives ----------------------------------------------------------
const seg = (points, color = STROKE, width = W) => {
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const headC = ([x, y], color = STROKE) =>
  `<circle cx="${x}" cy="${y}" r="20" fill="none" stroke="${color}" stroke-width="9"/>`;
const ell = ([cx, cy, rx, ry]) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${ACCENT}" opacity="0.22" filter="url(#blur)"/>`;
const rect = (x, y, w, h, opts = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${opts.rx ?? 4}" fill="none" stroke="${opts.color ?? STROKE}" stroke-width="${opts.width ?? 6}" opacity="${opts.opacity ?? 0.6}"/>`;
const line = (p1, p2, color = ACCENT, width = 3, dash = '') =>
  `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;

// ---- equipment badges (40x40, placed bottom-right) ------------------------
const EQUIP_ICONS = {
  barbell: `<line x1="6" y1="20" x2="34" y2="20"/><rect x="1" y="13" width="7" height="14" rx="1"/><rect x="32" y="13" width="7" height="14" rx="1"/>`,
  dumbbell: `<line x1="12" y1="20" x2="28" y2="20"/><rect x="6" y="13" width="7" height="14" rx="1"/><rect x="27" y="13" width="7" height="14" rx="1"/>`,
  cable: `<rect x="14" y="2" width="12" height="6" rx="1"/><line x1="20" y1="8" x2="20" y2="34"/>`,
  machine: `<rect x="4" y="4" width="20" height="28" rx="2"/><circle cx="30" cy="30" r="6"/>`,
  weightplate: `<circle cx="20" cy="20" r="14"/><circle cx="20" cy="20" r="4"/>`,
  abwheel: `<circle cx="20" cy="20" r="12"/><line x1="2" y1="20" x2="8" y2="20"/><line x1="32" y1="20" x2="38" y2="20"/>`,
  trapbar: `<polygon points="20,4 34,12 34,28 20,36 6,28 6,12"/>`,
  kettlebell: `<circle cx="20" cy="24" r="12"/><path d="M12,14 a8,8 0 0 1 16,0"/>`,
  bodyweight: `<circle cx="20" cy="8" r="5"/><line x1="20" y1="13" x2="20" y2="26"/><line x1="20" y1="17" x2="12" y2="24"/><line x1="20" y1="17" x2="28" y2="24"/><line x1="20" y1="26" x2="13" y2="36"/><line x1="20" y1="26" x2="27" y2="36"/>`,
};

const EQUIP_MAP = {
  Barbell: 'barbell',
  Dumbbell: 'dumbbell',
  Bodyweight: 'bodyweight',
  Cable: 'cable',
  Machine: 'machine',
  'Dumbbell or Machine': 'dumbbell',
  'Barbell or Dumbbell': 'barbell',
  'Barbell or EZ Bar': 'barbell',
  'Bodyweight or Weight Plate': 'weightplate',
  'Ab Wheel': 'abwheel',
  'Barbell or Bodyweight': 'barbell',
  'Bodyweight or Barbell': 'barbell',
  'Bodyweight or Machine': 'machine',
  'Dumbbell or Trap Bar': 'trapbar',
  Kettlebell: 'kettlebell',
  'Bodyweight or GHD Machine': 'machine',
  'Barbell or Machine': 'barbell',
};

function equipBadge(equipment) {
  const key = EQUIP_MAP[equipment] || 'bodyweight';
  return `<g transform="translate(344,344)" stroke="${ACCENT}" stroke-width="3" fill="none">${EQUIP_ICONS[key]}</g>`;
}

// ---- generic figure renderer ----------------------------------------------
// fig: { head, torso:[a,b], armL, armR, legL, legR } each (besides head) an array of [x,y] points
function figure(fig) {
  let out = '';
  if (fig.torso) out += seg(fig.torso, STROKE, 12);
  if (fig.legL) out += seg(fig.legL);
  if (fig.legR) out += seg(fig.legR);
  if (fig.armL) out += seg(fig.armL);
  if (fig.armR) out += seg(fig.armR);
  if (fig.head) out += headC(fig.head);
  return out;
}

// ---- pose library -----------------------------------------------------------
const POSES = {
  // lying on a bench, arms pressing straight up (bench press family)
  lying_press: (eq, opt = {}) => {
    const angle = opt.angle || 0;
    const benchX = 90, benchY = 250, benchW = 210, benchH = 18;
    const fig = {
      head: [140, 215],
      torso: [[152, 233], [285, 250]],
      legL: [[285, 250], [312, 290], [298, 335]],
      legR: [[285, 250], [318, 296], [310, 342]],
      armL: [[155, 230], [160, 180], [168, 135]],
      armR: [[155, 234], [165, 184], [180, 140]],
    };
    let extra = `<g transform="rotate(${angle} 200 250)">` + rect(benchX, benchY, benchW, benchH, { color: STROKE, width: 6, opacity: 0.5 }) + figure(fig);
    if (eq === 'dumbbell') {
      extra += `<circle cx="172" cy="135" r="14" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
      extra += `<circle cx="180" cy="140" r="14" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
    } else {
      extra += line([130, 137], [222, 137], ACCENT, 6);
      extra += rect(122, 122, 14, 30, { color: ACCENT, width: 4, opacity: 1 });
      extra += rect(216, 122, 14, 30, { color: ACCENT, width: 4, opacity: 1 });
    }
    extra += '</g>';
    return { svg: extra, highlight: [210, 215, 60, 40] };
  },

  // lying on bench, arms wide in arc (fly)
  fly_lying: (eq) => {
    const fig = {
      head: [140, 215],
      torso: [[152, 233], [285, 250]],
      legL: [[285, 250], [312, 290], [298, 335]],
      legR: [[285, 250], [318, 296], [310, 342]],
      armL: [[155, 230], [125, 195], [110, 150]],
      armR: [[155, 234], [195, 195], [210, 150]],
    };
    let extra = rect(90, 250, 210, 18, { color: STROKE, width: 6, opacity: 0.5 }) + figure(fig);
    if (eq === 'cable') {
      extra += line([110, 150], [70, 30], ACCENT, 3, '6,6') + rect(60, 14, 24, 10, { color: ACCENT, width: 3, opacity: 1 });
      extra += line([210, 150], [250, 30], ACCENT, 3, '6,6') + rect(238, 14, 24, 10, { color: ACCENT, width: 3, opacity: 1 });
    } else {
      extra += `<circle cx="110" cy="150" r="14" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
      extra += `<circle cx="210" cy="150" r="14" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
    }
    return { svg: extra, highlight: [195, 220, 65, 45] };
  },

  // push-up / plank with bent arms
  pushup: (eq) => {
    const fig = {
      head: [105, 185],
      torso: [[140, 195], [300, 230]],
      armL: [[145, 195], [135, 250], [145, 300]],
      legL: [[300, 230], [340, 260], [375, 295]],
      legR: [[300, 230], [345, 270], [385, 300]],
    };
    let extra = figure(fig);
    extra += line([60, 305], [395, 305], STROKE, 4);
    return { svg: extra, highlight: [200, 220, 70, 35] };
  },

  // dip between bars
  dip: (eq) => {
    const fig = {
      head: [200, 120],
      torso: [[200, 150], [200, 260]],
      armL: [[180, 162], [163, 212], [158, 180]],
      armR: [[220, 162], [237, 212], [242, 180]],
      legL: [[200, 260], [188, 312], [182, 362]],
      legR: [[200, 260], [212, 312], [222, 358]],
    };
    let extra = line([160, 145], [160, 305], STROKE, 6);
    extra += line([240, 145], [240, 305], STROKE, 6);
    extra += line([160, 178], [180, 178], STROKE, 6);
    extra += line([220, 178], [240, 178], STROKE, 6);
    extra += figure(fig);
    return { svg: extra, highlight: [200, 200, 50, 50] };
  },

  // standing, arms overhead pressing
  overhead_press: (eq) => {
    const fig = {
      head: [200, 70],
      torso: [[200, 100], [200, 230]],
      legL: [[200, 230], [185, 300], [180, 370]],
      legR: [[200, 230], [215, 300], [220, 370]],
      armL: [[178, 112], [162, 70], [167, 30]],
      armR: [[222, 112], [238, 70], [233, 30]],
    };
    let extra = figure(fig);
    if (eq === 'dumbbell') {
      extra += `<circle cx="167" cy="30" r="14" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
      extra += `<circle cx="233" cy="30" r="14" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
    } else {
      extra += line([150, 28], [250, 28], ACCENT, 6);
      extra += rect(142, 14, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
      extra += rect(244, 14, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
    }
    return { svg: extra, highlight: [200, 110, 58, 38] };
  },

  // arms raised: lateral / front / upright row variants
  raise_arms: (eq, opt = {}) => {
    const torsoTop = opt.bent ? [215, 110] : [200, 100];
    const torsoBottom = opt.bent ? [240, 200] : [200, 230];
    const fig = {
      head: opt.bent ? [195, 90] : [200, 70],
      torso: [torsoTop, torsoBottom],
      legL: opt.bent ? [[240, 200], [225, 290], [215, 365]] : [[200, 230], [185, 300], [180, 370]],
      legR: opt.bent ? [[240, 200], [255, 290], [260, 365]] : [[200, 230], [215, 300], [220, 370]],
    };
    if (opt.dir === 'up') {
      // upright row / high pull: hands travel up along torso to chin
      fig.armL = [[180, 130], [186, 172], [196, 112]];
      fig.armR = [[220, 130], [214, 172], [204, 112]];
    } else if (opt.dir === 'front') {
      fig.armL = [[200, 122], [238, 102], [276, 92]];
      fig.armR = [[200, 122], [238, 110], [276, 100]];
    } else {
      // side (lateral raise / rear delt fly)
      const sx = opt.bent ? 230 : 200;
      const sy = opt.bent ? 130 : 122;
      fig.armL = [[sx - 22, sy], [sx - 70, sy], [sx - 108, sy]];
      fig.armR = [[sx + 22, sy], [sx + 70, sy + 4], [sx + 108, sy + 4]];
    }
    let extra = figure(fig);
    if (opt.dir === 'up') {
      extra += line([170, 110], [230, 110], ACCENT, 6);
      extra += rect(160, 96, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
      extra += rect(226, 96, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
    } else {
      const hands = opt.dir === 'front'
        ? [[276, 92], [276, 100]]
        : [[200 - 108, opt.bent ? 130 : 122], [200 + 108, opt.bent ? 134 : 126]];
      for (const h of hands) extra += `<circle cx="${h[0]}" cy="${h[1]}" r="13" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
    }
    const highlight = opt.bent ? [225, 150, 60, 45] : [200, 115, 58, 40];
    return { svg: extra, highlight };
  },

  // face pull
  face_pull: (eq) => {
    const fig = {
      head: [200, 70],
      torso: [[200, 100], [200, 230]],
      legL: [[200, 230], [185, 300], [180, 370]],
      legR: [[200, 230], [215, 300], [220, 370]],
      armL: [[178, 122], [142, 112], [120, 92]],
      armR: [[222, 122], [258, 112], [280, 92]],
    };
    let extra = figure(fig);
    extra += line([120, 92], [200, 22], ACCENT, 3, '6,6');
    extra += line([280, 92], [200, 22], ACCENT, 3, '6,6');
    extra += rect(176, 8, 48, 12, { color: ACCENT, width: 3, opacity: 1 });
    return { svg: extra, highlight: [200, 120, 60, 40] };
  },

  // standing curl — forearm curls toward chest
  curl_arm: (eq, opt = {}) => {
    const headY = opt.seated ? 95 : 70;
    const fig = {
      head: [200, headY],
      torso: [[200, headY + 30], [200, headY + 160]],
      legL: [[200, headY + 160], [185, headY + 230], [180, headY + 300]],
      legR: [[200, headY + 160], [215, headY + 230], [220, headY + 300]],
      armL: [[178, headY + 60], [172, headY + 130], [192, headY + 80]],
      armR: [[222, headY + 60], [228, headY + 130], [208, headY + 80]],
    };
    let extra = figure(fig);
    const hL = [192, headY + 80], hR = [208, headY + 80];
    if (eq === 'barbell') {
      extra += line([hL[0] - 14, hL[1]], [hR[0] + 14, hR[1]], ACCENT, 6);
      extra += rect(hL[0] - 28, hL[1] - 14, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
      extra += rect(hR[0] + 14, hR[1] - 14, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
    } else if (eq === 'cable') {
      extra += line(hL, [hL[0] - 10, hL[1] + 120], ACCENT, 3, '6,6');
      extra += line(hR, [hR[0] + 10, hR[1] + 120], ACCENT, 3, '6,6');
    } else {
      extra += `<circle cx="${hL[0]}" cy="${hL[1]}" r="13" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
      extra += `<circle cx="${hR[0]}" cy="${hR[1]}" r="13" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
    }
    const highlight = opt.forearm ? [200, headY + 110, 65, 55] : [200, headY + 95, 65, 60];
    return { svg: extra, highlight };
  },

  // pull-up / hanging leg raise
  pullup: (eq, opt = {}) => {
    const fig = {
      head: [200, 170],
      torso: [[200, 195], [200, 290]],
      armL: [[165, 40], [150, 110], [180, 150]],
      armR: [[235, 40], [250, 110], [220, 150]],
    };
    if (opt.legsUp) {
      fig.legL = [[200, 290], [240, 270], [280, 255]];
      fig.legR = [[200, 290], [245, 280], [285, 270]];
    } else {
      fig.legL = [[200, 290], [195, 335], [190, 380]];
      fig.legR = [[200, 290], [205, 335], [210, 380]];
    }
    let extra = line([130, 40], [270, 40], STROKE, 6);
    extra += figure(fig);
    const highlight = opt.legsUp ? [240, 270, 60, 35] : [200, 180, 58, 60];
    return { svg: extra, highlight };
  },

  // seated, pulling cable/bar toward torso (lat pulldown / seated row)
  pulldown_seated: (eq, opt = {}) => {
    const fig = {
      head: [200, 175],
      torso: [[200, 200], [200, 300]],
      legL: [[200, 300], [180, 340], [160, 360]],
      legR: [[200, 300], [185, 350], [165, 370]],
      armL: [[182, 212], [152, 250], [160, 290]],
      armR: [[218, 212], [248, 250], [240, 290]],
    };
    let extra = rect(170, 300, 60, 15, { color: STROKE, width: 6, opacity: 0.5 });
    extra += figure(fig);
    if (opt.horizontal) {
      extra += line([200, 290], [200, 245], ACCENT, 3, '6,6');
      extra += rect(188, 230, 24, 12, { color: ACCENT, width: 3, opacity: 1 });
      extra += line([140, 290], [260, 290], ACCENT, 5);
    } else {
      extra += line([200, 290], [200, 22], ACCENT, 3, '6,6');
      extra += line([140, 290], [260, 290], ACCENT, 5);
    }
    return { svg: extra, highlight: [205, 230, 65, 55] };
  },

  // hip-hinge: deadlift family
  hinge_lift: (eq, opt = {}) => {
    const sumo = opt.variant === 'sumo';
    const goodMorning = opt.variant === 'goodmorning';
    const rackPull = opt.variant === 'rackpull';
    const rdl = opt.variant === 'rdl';
    const handY = rackPull ? 230 : (rdl ? 250 : 270);
    const fig = {
      head: [195, 90],
      torso: [[210, 120], [230, 200]],
      legL: sumo ? [[230, 200], [195, 290], [160, 370]] : [[230, 200], [225, 290], [200, 370]],
      legR: sumo ? [[230, 200], [265, 290], [300, 370]] : [[230, 200], [255, 295], [255, 365]],
    };
    let extra = '';
    if (goodMorning) {
      fig.armL = [[218, 140], [195, 138], [172, 136]];
      fig.armR = [[218, 144], [241, 142], [264, 140]];
      extra += line([172, 136], [264, 140], ACCENT, 6);
      extra += rect(160, 122, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
      extra += rect(262, 124, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
    } else {
      fig.armL = [[218, 140], [195, 210], [180, handY]];
      fig.armR = [[218, 144], [200, 215], [185, handY + 5]];
      extra += line([150, handY + 2], [225, handY + 7], ACCENT, 6);
      extra += rect(138, handY - 12, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
      extra += rect(222, handY - 8, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
    }
    extra += figure(fig);
    return { svg: extra, highlight: [220, 215, 65, 75] };
  },

  // bent over row family
  row_bent: (eq, opt = {}) => {
    const fig = {
      head: [195, 90],
      torso: [[210, 120], [230, 200]],
      legL: [[230, 200], [225, 290], [205, 365]],
      legR: [[230, 200], [255, 295], [255, 365]],
      armL: [[218, 140], [192, 178], [185, 158]],
      armR: [[218, 144], [200, 184], [196, 162]],
    };
    let extra = figure(fig);
    if (eq === 'bodyweight') {
      extra += line([90, 100], [310, 100], STROKE, 6);
      extra += line([185, 158], [185, 100], ACCENT, 4);
      extra += line([196, 162], [196, 100], ACCENT, 4);
    } else if (eq === 'cable') {
      extra += line([190, 160], [60, 200], ACCENT, 3, '6,6');
      extra += rect(40, 192, 24, 12, { color: ACCENT, width: 3, opacity: 1 });
    } else if (eq === 'dumbbell') {
      extra += `<circle cx="190" cy="160" r="13" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
    } else {
      extra += line([175, 159], [206, 162], ACCENT, 6);
      extra += rect(164, 145, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
      extra += rect(204, 149, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
    }
    return { svg: extra, highlight: [210, 165, 65, 60] };
  },

  // overhead/lying triceps extension (skull crusher)
  triceps_overhead: (eq, opt = {}) => {
    let extra, highlight;
    if (opt.lying) {
      const fig = {
        head: [140, 215],
        torso: [[152, 233], [285, 250]],
        legL: [[285, 250], [312, 290], [298, 335]],
        legR: [[285, 250], [318, 296], [310, 342]],
        armL: [[155, 230], [165, 195], [140, 175]],
        armR: [[155, 234], [168, 200], [145, 182]],
      };
      extra = rect(90, 250, 210, 18, { color: STROKE, width: 6, opacity: 0.5 }) + figure(fig);
      extra += line([120, 172], [165, 180], ACCENT, 6);
      extra += rect(108, 158, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
      highlight = [165, 195, 55, 40];
    } else {
      const fig = {
        head: [200, 70],
        torso: [[200, 100], [200, 230]],
        legL: [[200, 230], [185, 300], [180, 370]],
        legR: [[200, 230], [215, 300], [220, 370]],
        armL: [[190, 110], [180, 60], [210, 95]],
        armR: [[210, 110], [200, 65], [222, 100]],
      };
      extra = figure(fig);
      extra += `<circle cx="216" cy="98" r="14" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
      highlight = [205, 90, 50, 45];
    }
    return { svg: extra, highlight };
  },

  // triceps pushdown
  triceps_pushdown: (eq) => {
    const fig = {
      head: [200, 70],
      torso: [[200, 100], [200, 230]],
      legL: [[200, 230], [185, 300], [180, 370]],
      legR: [[200, 230], [215, 300], [220, 370]],
      armL: [[182, 130], [178, 180], [184, 232]],
      armR: [[218, 130], [222, 180], [216, 232]],
    };
    let extra = figure(fig);
    extra += line([200, 130], [200, 22], ACCENT, 3, '6,6');
    extra += rect(188, 8, 24, 12, { color: ACCENT, width: 3, opacity: 1 });
    extra += line([178, 230], [222, 232], ACCENT, 5);
    return { svg: extra, highlight: [200, 195, 50, 50] };
  },

  // kickback (triceps or glute, arm/leg extends backward)
  kickback: (eq, opt = {}) => {
    if (opt.limb === 'leg') {
      const fig = {
        head: [180, 80],
        torso: [[190, 110], [205, 210]],
        legL: [[205, 210], [200, 290], [195, 370]],
        legR: [[205, 210], [245, 255], [285, 285]],
        armL: [[195, 140], [175, 175], [160, 195]],
        armR: [[215, 140], [230, 165], [240, 185]],
      };
      let extra = figure(fig);
      extra += line([285, 285], [320, 370], ACCENT, 3, '6,6');
      return { svg: extra, highlight: [215, 235, 60, 50] };
    }
    const fig = {
      head: [185, 100],
      torso: [[195, 130], [210, 210]],
      legL: [[210, 210], [200, 290], [195, 370]],
      legR: [[210, 210], [225, 290], [225, 370]],
      armL: [[205, 145], [240, 155], [280, 158]],
      armR: [[205, 150], [240, 160], [280, 163]],
    };
    let extra = figure(fig);
    extra += `<circle cx="280" cy="160" r="13" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
    return { svg: extra, highlight: [248, 158, 55, 40] };
  },

  // core work on floor: crunch, leg raise, bicycle, v-up, russian twist
  core_floor: (eq, opt = {}) => {
    let fig, extra = '';
    const variant = opt.variant || 'crunch';
    if (variant === 'legraise') {
      fig = {
        head: [160, 285],
        torso: [[190, 290], [280, 300]],
        armL: [[190, 290], [160, 270], [155, 260]],
        legL: [[280, 300], [292, 220], [296, 145]],
        legR: [[280, 300], [298, 222], [302, 150]],
      };
    } else if (variant === 'vup') {
      fig = {
        head: [165, 230],
        torso: [[195, 270], [275, 300]],
        armL: [[195, 270], [175, 240], [165, 225]],
        legL: [[275, 300], [288, 230], [296, 155]],
        legR: [[275, 300], [294, 232], [302, 160]],
      };
    } else if (variant === 'twist') {
      fig = {
        head: [175, 235],
        torso: [[200, 270], [255, 295]],
        armL: [[200, 270], [165, 285], [140, 295]],
        legL: [[255, 295], [285, 290], [315, 308]],
        legR: [[255, 295], [290, 300], [318, 320]],
      };
      extra += `<circle cx="140" cy="295" r="13" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
    } else if (variant === 'bicycle') {
      fig = {
        head: [165, 280],
        torso: [[195, 290], [280, 300]],
        armL: [[195, 290], [165, 268], [158, 258]],
        legL: [[280, 300], [295, 230], [310, 165]],
        legR: [[280, 300], [305, 260], [330, 280]],
      };
    } else {
      // crunch
      fig = {
        head: [160, 280],
        torso: [[190, 290], [280, 300]],
        armL: [[190, 290], [160, 268], [152, 258]],
        legL: [[280, 300], [300, 250], [262, 240]],
        legR: [[280, 300], [305, 255], [268, 248]],
      };
    }
    extra += line([60, 320], [380, 320], STROKE, 4) + figure(fig);
    return { svg: extra, highlight: [225, 280, 60, 32] };
  },

  // plank / ab wheel rollout
  plank: (eq, opt = {}) => {
    const extendArms = opt.extended;
    const handX = extendArms ? 90 : 165;
    const fig = {
      head: [140, 255],
      torso: [[170, 262], [290, 280]],
      armL: [[170, 262], [167, 305], [handX, 318]],
      legL: [[290, 280], [330, 300], [370, 312]],
    };
    let extra = line([60, 320], [395, 320], STROKE, 4) + figure(fig);
    if (extendArms) {
      extra += `<circle cx="${handX}" cy="318" r="16" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
    }
    return { svg: extra, highlight: [225, 270, 70, 28] };
  },

  // squat family
  squat: (eq, opt = {}) => {
    const sissy = opt.sissy;
    const front = opt.front;
    const headPos = sissy ? [215, 95] : [200, 80];
    const fig = {
      head: headPos,
      torso: [headPos, sissy ? [225, 215] : [200, 220]],
      legL: sissy ? [[225, 215], [185, 260], [170, 340]] : [[200, 220], [150, 280], [165, 365]],
      legR: sissy ? [[225, 215], [255, 270], [250, 340]] : [[200, 220], [250, 280], [235, 365]],
    };
    let extra = '';
    if (eq !== 'bodyweight') {
      const barY = front ? 150 : 115;
      fig.armL = [[190, 122], [180, barY]];
      fig.armR = [[210, 122], [220, barY]];
      extra += line([170, barY], [230, barY], ACCENT, 6);
      extra += rect(158, barY - 14, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
      extra += rect(228, barY - 14, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
    } else {
      fig.armL = [[188, 130], [183, 200]];
      fig.armR = [[212, 130], [217, 200]];
    }
    extra += figure(fig);
    return { svg: extra, highlight: [200, 295, 58, 55] };
  },

  // seated leg machine: press or extension
  leg_machine: (eq, opt = {}) => {
    let fig, extra, highlight;
    if (opt.seatType === 'press') {
      fig = {
        head: [150, 220],
        torso: [[170, 235], [205, 270]],
        armL: [[170, 235], [150, 260], [160, 285]],
        legL: [[205, 270], [265, 260], [325, 230]],
        legR: [[205, 270], [270, 268], [330, 245]],
      };
      extra = rect(120, 250, 60, 80, { color: STROKE, width: 6, opacity: 0.5 });
      extra += line([330, 200], [330, 270], ACCENT, 6);
      extra += figure(fig);
      highlight = [255, 250, 60, 40];
    } else {
      fig = {
        head: [200, 170],
        torso: [[200, 195], [200, 245]],
        armL: [[200, 200], [175, 230], [170, 260]],
        armR: [[200, 200], [225, 230], [230, 260]],
        legL: [[200, 245], [200, 290], [260, 270]],
      };
      extra = rect(160, 230, 80, 30, { color: STROKE, width: 6, opacity: 0.5 });
      extra += figure(fig);
      extra += line([255, 245], [255, 295], ACCENT, 6);
      highlight = [220, 265, 55, 40];
    }
    return { svg: extra, highlight };
  },

  // split-stance lunge
  lunge_split: (eq, opt = {}) => {
    const fig = {
      head: [190, 80],
      torso: [[195, 110], [200, 220]],
      legL: [[200, 220], [170, 290], [160, 360]],
      legR: [[200, 220], [250, 300], [290, 370]],
      armL: [[185, 130], [185, 210]],
      armR: [[215, 130], [215, 210]],
    };
    let extra = '';
    if (opt.elevated) {
      extra += rect(265, 350, 50, 20, { color: STROKE, width: 5, opacity: 0.5 });
      fig.legR = [[200, 220], [250, 290], [290, 355]];
    }
    if (opt.stepUp) {
      extra += rect(120, 330, 70, 35, { color: STROKE, width: 5, opacity: 0.5 });
      fig.legL = [[200, 220], [170, 280], [160, 330]];
    }
    extra += figure(fig);
    if (eq === 'dumbbell') {
      extra += `<circle cx="185" cy="210" r="13" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
      extra += `<circle cx="215" cy="210" r="13" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
    }
    return { svg: extra, highlight: [185, 270, 55, 60] };
  },

  // farmer's carry / shrug
  carry_shrug: (eq, opt = {}) => {
    const headY = opt.shrug ? 60 : 70;
    const fig = {
      head: [200, headY],
      torso: [[200, headY + 30], [200, headY + 160]],
      armL: [[180, headY + 50], [177, headY + 160]],
      armR: [[220, headY + 50], [223, headY + 160]],
    };
    if (opt.carry) {
      fig.legL = [[200, headY + 160], [180, headY + 230], [160, headY + 300]];
      fig.legR = [[200, headY + 160], [220, headY + 230], [250, headY + 290]];
    } else {
      fig.legL = [[200, headY + 160], [185, headY + 230], [180, headY + 300]];
      fig.legR = [[200, headY + 160], [215, headY + 230], [220, headY + 300]];
    }
    let extra = figure(fig);
    const hL = [177, headY + 160], hR = [223, headY + 160];
    if (eq === 'trapbar') {
      extra += `<g transform="translate(${hL[0] - 18},${hL[1] - 8})" stroke="${ACCENT}" stroke-width="3" fill="none"><polygon points="20,4 34,12 34,28 20,36 6,28 6,12"/></g>`;
    } else if (eq === 'barbell') {
      extra += line([hL[0] - 14, hL[1]], [hR[0] + 14, hR[1]], ACCENT, 6);
      extra += rect(hL[0] - 28, hL[1] - 14, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
      extra += rect(hR[0] + 14, hR[1] - 14, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
    } else {
      extra += `<circle cx="${hL[0]}" cy="${hL[1]}" r="13" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
      extra += `<circle cx="${hR[0]}" cy="${hR[1]}" r="13" fill="none" stroke="${ACCENT}" stroke-width="4"/>`;
    }
    const highlight = opt.shrug ? [200, headY + 35, 58, 35] : [200, headY + 35, 55, 30];
    return { svg: extra, highlight };
  },

  // hip thrust / glute bridge / frog pump
  hip_thrust: (eq, opt = {}) => {
    const low = opt.low;
    const frog = opt.frog;
    const hipY = low ? 280 : 260;
    const fig = {
      head: [110, 295],
      torso: [[135, 300], [240, hipY]],
      armL: [[135, 300], [110, 320]],
    };
    if (frog) {
      fig.legL = [[240, hipY], [280, 320], [240, 330]];
      fig.legR = [[240, hipY], [240, 325], [200, 330]];
    } else {
      fig.legL = [[240, hipY], [290, hipY + 50], [280, hipY + 60]];
      fig.legR = [[240, hipY], [285, hipY + 55], [275, hipY + 65]];
    }
    let extra = line([50, 320], [340, 320], STROKE, 4) + figure(fig);
    if (eq === 'barbell') {
      extra += line([225, hipY - 5], [255, hipY - 5], ACCENT, 6);
      extra += rect(214, hipY - 19, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
      extra += rect(254, hipY - 19, 14, 28, { color: ACCENT, width: 4, opacity: 1 });
    }
    return { svg: extra, highlight: [240, hipY + 5, 50, 40] };
  },

  // kettlebell swing
  kettlebell_swing: (eq) => {
    const fig = {
      head: [190, 90],
      torso: [[200, 120], [220, 210]],
      legL: [[220, 210], [210, 290], [200, 370]],
      legR: [[220, 210], [225, 290], [225, 370]],
      armL: [[210, 140], [195, 200], [180, 260]],
      armR: [[210, 145], [200, 205], [185, 265]],
    };
    let extra = figure(fig);
    extra += `<g transform="translate(168,262)" stroke="${ACCENT}" stroke-width="3" fill="none"><circle cx="20" cy="24" r="14"/><path d="M10,12 a10,10 0 0 1 20,0"/></g>`;
    return { svg: extra, highlight: [215, 220, 58, 65] };
  },

  // lying / seated leg curl, glute-ham raise, nordic curl
  leg_curl_lying: (eq, opt = {}) => {
    let fig, extra, highlight;
    if (opt.kneeling) {
      fig = {
        head: [140, 260],
        torso: [[170, 280], [220, 305]],
        armL: [[170, 280], [155, 270], [150, 280]],
        legL: [[220, 305], [240, 330], [240, 365]],
        legR: [[220, 305], [245, 330], [248, 365]],
      };
      extra = line([100, 365], [300, 365], STROKE, 4) + figure(fig);
      highlight = [200, 300, 60, 45];
    } else if (opt.lying) {
      fig = {
        head: [125, 222],
        torso: [[150, 240], [285, 260]],
        armL: [[155, 238], [165, 280], [180, 295]],
        legL: [[285, 260], [325, 260], [345, 205]],
      };
      extra = rect(90, 260, 210, 18, { color: STROKE, width: 6, opacity: 0.5 }) + figure(fig);
      extra += line([330, 215], [360, 215], ACCENT, 6);
      highlight = [325, 235, 55, 50];
    } else {
      fig = {
        head: [195, 175],
        torso: [[200, 200], [200, 250]],
        armL: [[200, 205], [225, 230], [235, 250]],
        legL: [[200, 250], [200, 290], [240, 320]],
      };
      extra = rect(160, 230, 80, 30, { color: STROKE, width: 6, opacity: 0.5 }) + figure(fig);
      extra += line([238, 290], [238, 330], ACCENT, 6);
      highlight = [215, 290, 55, 45];
    }
    return { svg: extra, highlight };
  },
};

// ---- exercise -> pose mapping --------------------------------------------
const MAP = {
  ex1:  ['lying_press', {}],
  ex2:  ['lying_press', {}],
  ex3:  ['lying_press', { angle: -15 }],
  ex4:  ['lying_press', { angle: 10 }],
  ex5:  ['pushup', {}],
  ex6:  ['fly_lying', {}],
  ex7:  ['fly_lying', {}],
  ex8:  ['dip', {}],
  ex9:  ['overhead_press', {}],
  ex10: ['overhead_press', {}],
  ex11: ['raise_arms', { dir: 'side' }],
  ex12: ['raise_arms', { dir: 'front' }],
  ex13: ['raise_arms', { dir: 'side', bent: true }],
  ex14: ['raise_arms', { dir: 'up' }],
  ex15: ['face_pull', {}],
  ex16: ['curl_arm', {}],
  ex17: ['curl_arm', {}],
  ex18: ['curl_arm', {}],
  ex19: ['curl_arm', { seated: true }],
  ex20: ['curl_arm', { seated: true }],
  ex21: ['curl_arm', {}],
  ex22: ['curl_arm', {}],
  ex23: ['pullup', {}],
  ex24: ['pulldown_seated', {}],
  ex25: ['hinge_lift', { variant: 'conventional' }],
  ex26: ['row_bent', {}],
  ex27: ['row_bent', {}],
  ex28: ['pulldown_seated', { horizontal: true }],
  ex29: ['row_bent', {}],
  ex30: ['row_bent', {}],
  ex31: ['dip', {}],
  ex32: ['triceps_overhead', { lying: true }],
  ex33: ['lying_press', {}],
  ex34: ['triceps_pushdown', {}],
  ex35: ['triceps_overhead', { lying: false }],
  ex36: ['kickback', { limb: 'arm' }],
  ex37: ['pushup', {}],
  ex38: ['core_floor', { variant: 'crunch' }],
  ex39: ['plank', { extended: false }],
  ex40: ['core_floor', { variant: 'legraise' }],
  ex41: ['core_floor', { variant: 'bicycle' }],
  ex42: ['core_floor', { variant: 'twist' }],
  ex43: ['pullup', { legsUp: true }],
  ex44: ['core_floor', { variant: 'vup' }],
  ex45: ['plank', { extended: true }],
  ex46: ['squat', {}],
  ex47: ['leg_machine', { seatType: 'press' }],
  ex48: ['lunge_split', {}],
  ex49: ['lunge_split', { elevated: true }],
  ex50: ['lunge_split', { stepUp: true }],
  ex51: ['leg_machine', { seatType: 'extension' }],
  ex52: ['squat', { front: true }],
  ex53: ['squat', { sissy: true }],
  ex54: ['curl_arm', { seated: true, forearm: true }],
  ex55: ['curl_arm', { seated: true, forearm: true }],
  ex56: ['curl_arm', { forearm: true }],
  ex57: ['curl_arm', { forearm: true }],
  ex58: ['carry_shrug', { carry: true }],
  ex59: ['curl_arm', { forearm: true }],
  ex60: ['pullup', {}],
  ex61: ['hip_thrust', {}],
  ex62: ['hip_thrust', { low: true }],
  ex63: ['hinge_lift', { variant: 'sumo' }],
  ex64: ['lunge_split', { elevated: true }],
  ex65: ['kickback', { limb: 'leg' }],
  ex66: ['lunge_split', { stepUp: true }],
  ex67: ['kettlebell_swing', {}],
  ex68: ['hip_thrust', { low: true, frog: true }],
  ex69: ['hinge_lift', { variant: 'rdl' }],
  ex70: ['leg_curl_lying', { lying: true }],
  ex71: ['leg_curl_lying', { lying: false }],
  ex72: ['hinge_lift', { variant: 'goodmorning' }],
  ex73: ['leg_curl_lying', { kneeling: true }],
  ex74: ['kettlebell_swing', {}],
  ex75: ['leg_curl_lying', { kneeling: true, nordic: true }],
  ex76: ['carry_shrug', { shrug: true }],
  ex77: ['carry_shrug', { shrug: true }],
  ex78: ['raise_arms', { dir: 'up' }],
  ex79: ['face_pull', {}],
  ex80: ['hinge_lift', { variant: 'rackpull' }],
  ex81: ['carry_shrug', { carry: true }],
  ex82: ['raise_arms', { dir: 'up', explosive: true }],
};

// ---- exercise data (id, name, equipment) ----------------------------------
const EXERCISES = [
  ['ex1', 'Barbell Bench Press', 'Barbell'],
  ['ex2', 'Dumbbell Bench Press', 'Dumbbell'],
  ['ex3', 'Incline Bench Press', 'Barbell'],
  ['ex4', 'Decline Bench Press', 'Barbell'],
  ['ex5', 'Push-Ups', 'Bodyweight'],
  ['ex6', 'Chest Fly', 'Dumbbell or Machine'],
  ['ex7', 'Cable Crossover', 'Cable'],
  ['ex8', 'Chest Dips', 'Bodyweight'],
  ['ex9', 'Overhead Press', 'Barbell or Dumbbell'],
  ['ex10', 'Arnold Press', 'Dumbbell'],
  ['ex11', 'Lateral Raise', 'Dumbbell'],
  ['ex12', 'Front Raise', 'Dumbbell'],
  ['ex13', 'Rear Delt Fly', 'Dumbbell or Machine'],
  ['ex14', 'Upright Row', 'Barbell'],
  ['ex15', 'Face Pull', 'Cable'],
  ['ex16', 'Barbell Curl', 'Barbell'],
  ['ex17', 'Dumbbell Curl', 'Dumbbell'],
  ['ex18', 'Hammer Curl', 'Dumbbell'],
  ['ex19', 'Concentration Curl', 'Dumbbell'],
  ['ex20', 'Preacher Curl', 'Machine'],
  ['ex21', 'Cable Curl', 'Cable'],
  ['ex22', 'Zottman Curl', 'Dumbbell'],
  ['ex23', 'Pull-Ups', 'Bodyweight'],
  ['ex24', 'Lat Pulldown', 'Machine'],
  ['ex25', 'Deadlift', 'Barbell'],
  ['ex26', 'Bent-Over Row', 'Barbell'],
  ['ex27', 'T-Bar Row', 'Barbell or Machine'],
  ['ex28', 'Seated Cable Row', 'Cable'],
  ['ex29', 'Inverted Row', 'Bodyweight'],
  ['ex30', 'Single-Arm Dumbbell Row', 'Dumbbell'],
  ['ex31', 'Triceps Dips', 'Bodyweight'],
  ['ex32', 'Skull Crushers', 'Barbell or EZ Bar'],
  ['ex33', 'Close-Grip Bench Press', 'Barbell'],
  ['ex34', 'Triceps Pushdown', 'Cable'],
  ['ex35', 'Overhead Triceps Extension', 'Dumbbell'],
  ['ex36', 'Triceps Kickbacks', 'Dumbbell'],
  ['ex37', 'Diamond Push-Ups', 'Bodyweight'],
  ['ex38', 'Crunches', 'Bodyweight'],
  ['ex39', 'Plank', 'Bodyweight'],
  ['ex40', 'Leg Raises', 'Bodyweight'],
  ['ex41', 'Bicycle Crunch', 'Bodyweight'],
  ['ex42', 'Russian Twists', 'Bodyweight or Weight Plate'],
  ['ex43', 'Hanging Leg Raises', 'Bodyweight'],
  ['ex44', 'V-Ups', 'Bodyweight'],
  ['ex45', 'Ab Wheel Rollout', 'Ab Wheel'],
  ['ex46', 'Squats', 'Barbell or Bodyweight'],
  ['ex47', 'Leg Press', 'Machine'],
  ['ex48', 'Walking Lunges', 'Dumbbell'],
  ['ex49', 'Bulgarian Split Squat', 'Dumbbell'],
  ['ex50', 'Step-Ups', 'Dumbbell'],
  ['ex51', 'Leg Extension', 'Machine'],
  ['ex52', 'Front Squat', 'Barbell'],
  ['ex53', 'Sissy Squat', 'Bodyweight or Machine'],
  ['ex54', 'Wrist Curls', 'Dumbbell'],
  ['ex55', 'Reverse Wrist Curls', 'Dumbbell'],
  ['ex56', 'Hammer Curl', 'Dumbbell'],
  ['ex57', 'Zottman Curl', 'Dumbbell'],
  ['ex58', "Farmer's Walk", 'Dumbbell or Trap Bar'],
  ['ex59', 'Reverse Curl', 'Barbell'],
  ['ex60', 'Towel Pull-Ups', 'Bodyweight'],
  ['ex61', 'Hip Thrusts', 'Barbell'],
  ['ex62', 'Glute Bridges', 'Bodyweight or Barbell'],
  ['ex63', 'Sumo Deadlift', 'Barbell'],
  ['ex64', 'Bulgarian Split Squat', 'Dumbbell'],
  ['ex65', 'Cable Kickbacks', 'Cable'],
  ['ex66', 'Step-Ups', 'Dumbbell'],
  ['ex67', 'Kettlebell Swings', 'Kettlebell'],
  ['ex68', 'Frog Pumps', 'Bodyweight'],
  ['ex69', 'Romanian Deadlifts', 'Barbell or Dumbbell'],
  ['ex70', 'Lying Leg Curl', 'Machine'],
  ['ex71', 'Seated Leg Curl', 'Machine'],
  ['ex72', 'Good Mornings', 'Barbell'],
  ['ex73', 'Glute-Ham Raise', 'Bodyweight or GHD Machine'],
  ['ex74', 'Kettlebell Swings', 'Kettlebell'],
  ['ex75', 'Nordic Curl', 'Bodyweight'],
  ['ex76', 'Barbell Shrugs', 'Barbell'],
  ['ex77', 'Dumbbell Shrugs', 'Dumbbell'],
  ['ex78', 'Upright Rows', 'Barbell'],
  ['ex79', 'Face Pulls', 'Cable'],
  ['ex80', 'Rack Pulls', 'Barbell'],
  ['ex81', "Farmer's Carry", 'Dumbbell or Trap Bar'],
  ['ex82', 'Barbell High Pull', 'Barbell'],
];

// ---- render ----------------------------------------------------------------
function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
}

function render(id, name, equipment) {
  const [poseKey, opt] = MAP[id];
  const eqKey = EQUIP_MAP[equipment] || 'bodyweight';
  const { svg: svg2, highlight: hl2 } = POSES[poseKey](eqKey, opt);
  return `<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="16"/>
    </filter>
  </defs>
  <rect width="400" height="400" rx="16" fill="${BG}"/>
  <rect x="1" y="1" width="398" height="398" rx="15" fill="none" stroke="${BORDER}" stroke-width="2"/>
  ${ell(hl2)}
  ${svg2}
  ${equipBadge(equipment)}
  <text x="20" y="378" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" font-weight="600" fill="#64748b">${escapeXml(name)}</text>
</svg>`;
}

for (const [id, name, equipment] of EXERCISES) {
  const svg = render(id, name, equipment);
  writeFileSync(path.join(OUT_DIR, `${id}.svg`), svg, 'utf-8');
}

console.log(`Generated ${EXERCISES.length} exercise SVGs in ${OUT_DIR}`);
