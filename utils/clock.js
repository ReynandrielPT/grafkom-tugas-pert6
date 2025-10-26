(function () {
  function part(list, t, c, tag) {
    list.push({ transform: t, color: c, tag: tag || null });
  }

  function addClock(parts, center, size) {
    const s = size || 1.0;
    const [cx, cy, cz] = center;
    const C = translate(cx, cy, cz);

    // Colors
    const rimCol = vec4(0.88, 0.9, 0.94, 1);
    const innerRimCol = vec4(0.82, 0.84, 0.88, 1);
    const faceCol = vec4(0.985, 0.99, 1.0, 1);
    const tickCol = vec4(0.12, 0.13, 0.15, 1);
    const minorTickCol = vec4(0.38, 0.4, 0.45, 1);
    const handCol = vec4(0.1, 0.11, 0.12, 1);
    const secondCol = vec4(0.1, 0.12, 0.14, 1);

    // Dimensions (round wall clock)
    const R = 1.35 * s; // overall radius
    const rimT = 0.18 * s; // rim thickness (radial)
    const bodyD = 0.5 * s; // overall depth
    const faceT = 0.05 * s; // face plate thickness
    const frontZ = bodyD / 2 - faceT / 2;

    // Helper to add a circular ring made of N tangent blocks
    function addRing(radius, thickness, depth, z, segments, color) {
      const N = Math.max(8, Math.floor(segments));
      for (let i = 0; i < N; i++) {
        const deg = (i * 360) / N;
        const arc = (2 * Math.PI * radius) / N;
        const Rz = rotateZ(deg);
        const T = translate(0, radius, z);
        const S = scale(arc * 1.03, thickness, depth);
        part(parts, mult(C, mult(Rz, mult(T, S))), color, "clockRimSeg");
      }
    }
    // Helper to add a filled disc via rotated spokes
    function addDisc(radius, depth, z, segments, color, tag) {
      const N = Math.max(8, Math.floor(segments));
      for (let i = 0; i < N; i++) {
        const deg = (i * 360) / N;
        const spokeW = (2 * Math.PI * radius) / N;
        const Rz = rotateZ(deg);
        const T = translate(0, radius / 2, z);
        const S = scale(spokeW * 1.03, radius, depth);
        part(parts, mult(C, mult(Rz, mult(T, S))), color, tag || null);
      }
    }

    // Outer bezel rim (slightly proud of face)
    addRing(R, rimT, bodyD, 0, 64, rimCol);
    // Inner rim (step)
    addRing(
      R - rimT * 0.7,
      rimT * 0.35,
      bodyD * 0.8,
      rimT * 0.05,
      64,
      innerRimCol
    );

    // Face disc recessed slightly behind inner rim
    const faceR = R - rimT - 0.04 * s;
    addDisc(faceR, faceT, frontZ - 0.005 * s, 72, faceCol, "clockFace");

    // Hour ticks (12) — thicker at 12/3/6/9
    const tickL = 0.16 * R;
    const tickW = 0.06 * rimT;
    const tickD = 0.06 * s;
    const tickR = faceR - tickL / 2 - 0.02 * s;
    for (let i = 0; i < 12; i++) {
      const deg = i * 30;
      const bold = i % 3 === 0 ? 1.5 : 1.0; // bold at 12,3,6,9
      const Rz = rotateZ(deg);
      const T = translate(0, tickR, frontZ + faceT / 2 + tickD / 2);
      const S = scale(tickW * bold, tickL, tickD);
      part(parts, mult(C, mult(Rz, mult(T, S))), tickCol, "clockTick");
    }

    // Minute ticks (lighter, smaller; skip where hour ticks sit)
    const mTickL = 0.075 * R;
    const mTickW = 0.5 * tickW;
    const mTickD = 0.05 * s;
    const mTickR = faceR - mTickL / 2 - 0.02 * s;
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const deg = i * 6;
      const Rz = rotateZ(deg);
      const T = translate(0, mTickR, frontZ + faceT / 2 + mTickD / 2);
      const S = scale(mTickW, mTickL, mTickD);
      part(
        parts,
        mult(C, mult(Rz, mult(T, S))),
        minorTickCol,
        "clockMinuteTick"
      );
    }

    // Extra face details: chapter ring, inner shadow ring, subtle bezel highlight, and screws
    // Chapter ring (thin ring inside ticks)
    const chapterRingR = faceR * 0.88;
    const chapterRingT = 0.03 * R;
    const chapterRingD = 0.02 * s;
    addRing(
      chapterRingR,
      chapterRingT,
      chapterRingD,
      frontZ + faceT / 2 - chapterRingD / 2,
      72,
      vec4(0.94, 0.95, 0.98, 1)
    );

    // Inner shadow ring near the inner edge of the face
    const innerShadowR = faceR * 0.96;
    const innerShadowT = 0.015 * R;
    const innerShadowD = 0.015 * s;
    addRing(
      innerShadowR,
      innerShadowT,
      innerShadowD,
      frontZ + faceT / 2 - innerShadowD,
      72,
      vec4(0.85, 0.87, 0.9, 1)
    );

    // Bezel highlight ring slightly above the face to hint at glass reflection
    const glassHiliteR = faceR + 0.015 * R;
    const glassHiliteT = 0.012 * R;
    const glassHiliteD = 0.012 * s;
    addRing(
      glassHiliteR,
      glassHiliteT,
      glassHiliteD,
      frontZ + faceT / 2 + glassHiliteD * 0.4,
      72,
      vec4(1.0, 1.0, 1.0, 1)
    );

    // Decorative screw heads on bezel at 45°, 135°, 225°, 315°
    const screwCol = vec4(0.7, 0.72, 0.76, 1);
    const screwR = R - rimT * 0.45;
    const screwW = 0.06 * R;
    const screwD = 0.04 * s;
    const screwZ = frontZ + faceT / 2 + screwD / 2 + 0.001 * s;
    const screwAngles = [45, 135, 225, 315];
    for (let i = 0; i < screwAngles.length; i++) {
      const deg = screwAngles[i];
      const Rz2 = rotateZ(deg);
      const T2 = translate(0, screwR, screwZ);
      const S2 = scale(screwW, screwW, screwD);
      part(parts, mult(C, mult(Rz2, mult(T2, S2))), screwCol, "clockScrew");
    }

    // Hands (neutral orientation pointing up at 12)
    const handDepth = 0.06 * s;
    const hubZ = frontZ + faceT / 2 + handDepth / 2 + 0.001 * s;
    const pivot = [cx + 0, cy + 0, cz + hubZ];

    // Add numeric labels at 12, 3, 6, 9 positions
    // Seven-segment style block digits built from rectangular segments
    const DIGITS = {
      0: ["a", "b", "c", "d", "e", "f"],
      1: ["b", "c"],
      2: ["a", "b", "g", "e", "d"],
      3: ["a", "b", "g", "c", "d"],
      4: ["f", "g", "b", "c"],
      5: ["a", "f", "g", "c", "d"],
      6: ["a", "f", "g", "e", "c", "d"],
      7: ["a", "b", "c"],
      8: ["a", "b", "c", "d", "e", "f", "g"],
      9: ["a", "b", "c", "d", "f", "g"],
    };

    function addDigitSegments(Mbase, digit, W, H, segT, depth, color) {
      const on = DIGITS[digit] || [];
      const z = 0; // depth handled by Mbase translate
      // Horizontal segments: a (top), g (middle), d (bottom)
      const HSeg = [
        { k: "a", x: 0, y: H / 2 - segT / 2, w: W, h: segT },
        { k: "g", x: 0, y: 0, w: W, h: segT },
        { k: "d", x: 0, y: -H / 2 + segT / 2, w: W, h: segT },
      ];
      // Vertical half-height segments
      const vH = H / 2 - segT; // each vertical half segment height
      const VSeg = [
        { k: "f", x: -W / 2 + segT / 2, y: H / 4, w: segT, h: vH },
        { k: "b", x: +W / 2 - segT / 2, y: H / 4, w: segT, h: vH },
        { k: "e", x: -W / 2 + segT / 2, y: -H / 4, w: segT, h: vH },
        { k: "c", x: +W / 2 - segT / 2, y: -H / 4, w: segT, h: vH },
      ];
      const allSegs = HSeg.concat(VSeg);
      for (let i = 0; i < allSegs.length; i++) {
        const sdef = allSegs[i];
        if (on.indexOf(sdef.k) === -1) continue;
        const T = translate(sdef.x, sdef.y, 0);
        const S = scale(sdef.w, sdef.h, depth);
        part(parts, mult(Mbase, mult(T, S)), color, "clockNumber");
      }
    }

    function addNumberAt(angleDeg, text) {
      // Base transform at given clock angle, placed on face, but oriented upright
      const numDepth = 0.05 * s;
      const z = frontZ + faceT / 2 + numDepth / 2 + 0.001 * s;
      const numR = faceR - tickL - 0.05 * R;
      const Maround = mult(
        C,
        mult(rotateZ(angleDeg), mult(translate(0, numR, z), rotateZ(-angleDeg)))
      );
      const charH = 0.16 * R;
      const charW = 0.11 * R;
      const segT = 0.09 * charH; // thickness of segments
      const gap = 0.08 * charW;
      // Compute starting x offset to center the string
      const totalW = text.length * charW + (text.length - 1) * gap;
      let x0 = -totalW / 2 + charW / 2;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        // Kerning: nudge the '1' in "12" slightly left for nicer spacing
        let dx = 0;
        if (text === "12" && i === 0) {
          dx = -0.2 * charW; // slight left shift
        }
        const Mch = mult(Maround, translate(x0 + i * (charW + gap) + dx, 0, 0));
        addDigitSegments(Mch, ch, charW, charH, segT, numDepth, tickCol);
      }
    }

    // Place numerals
    addNumberAt(0, "12"); // top
    addNumberAt(-90, "3"); // right
    addNumberAt(180, "6"); // bottom
    addNumberAt(90, "9"); // left
    // Hour hand (slightly shorter and wider)
    const hrLen = 0.55 * faceR;
    const hrW = 0.14 * rimT;
    let hourHand = mult(
      translate(0, hrLen / 2, hubZ),
      scale(hrW, hrLen, handDepth)
    );
    hourHand = mult(C, hourHand);
    part(parts, hourHand, handCol, "clockHandHour");
    parts[parts.length - 1].pivot = pivot;
    // Hour hand tip (narrower extension)
    let hourTip = mult(
      translate(0, hrLen + 0.08 * faceR, hubZ),
      scale(hrW * 0.6, 0.16 * faceR, handDepth)
    );
    hourTip = mult(C, hourTip);
    part(parts, hourTip, handCol, "clockHandHour");
    parts[parts.length - 1].pivot = pivot;

    // Minute hand (longer, slimmer)
    const mnLen = 0.78 * faceR;
    const mnW = 0.11 * rimT;
    let minuteHand = mult(
      translate(0, mnLen / 2, hubZ),
      scale(mnW, mnLen, handDepth)
    );
    minuteHand = mult(C, minuteHand);
    part(parts, minuteHand, handCol, "clockHandMinute");
    parts[parts.length - 1].pivot = pivot;
    // Minute tip
    let minuteTip = mult(
      translate(0, mnLen + 0.08 * faceR, hubZ),
      scale(mnW * 0.6, 0.16 * faceR, handDepth)
    );
    minuteTip = mult(C, minuteTip);
    part(parts, minuteTip, handCol, "clockHandMinute");
    parts[parts.length - 1].pivot = pivot;

    // Second hand (thin, with counterweight)
    const scLen = 0.86 * faceR;
    const scW = 0.06 * rimT;
    let secondHand = mult(
      translate(0, scLen / 2, hubZ),
      scale(scW, scLen, handDepth)
    );
    secondHand = mult(C, secondHand);
    part(parts, secondHand, secondCol, "clockHandSecond");
    parts[parts.length - 1].pivot = pivot;
    // Counterweight
    let secondTail = mult(
      translate(0, -0.18 * faceR, hubZ),
      scale(scW * 1.2, 0.22 * faceR, handDepth)
    );
    secondTail = mult(C, secondTail);
    part(parts, secondTail, secondCol, "clockHandSecond");
    parts[parts.length - 1].pivot = pivot;

    // Hub cap
    const hubR = 0.12 * R;
    addDisc(
      hubR,
      handDepth * 0.9,
      hubZ + handDepth / 2,
      36,
      tickCol,
      "clockHub"
    );
  }

  function createClockModel(opts) {
    const parts = [];
    const wallCol = vec4(0.92, 0.93, 0.96, 1);
    part(
      parts,
      mult(translate(0, 0, -1.4), scale(12, 7, 0.2)),
      wallCol,
      "wall"
    );
    addClock(parts, [0, 1.25, -0.9], 1.4);
    return parts;
  }

  window.createClockModel = createClockModel;
})();
