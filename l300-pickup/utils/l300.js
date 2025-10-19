(function () {
  function part(list, t, c, tag) {
    list.push({ transform: t, color: c, tag: tag || null });
  }

  // Helpers
  function wheel(parts, center, radius, width, tireCol, rimCol, tagPrefix) {
    const [cx, cy, cz] = center;
    const r = radius,
      w = width;
    const N = 28; // smoother tire
    const segT = r * 0.16;
    const segW = r * 0.18;
    const C = translate(cx, cy, cz);
    // Tire ring (oriented blocks around Z)
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 360.0;
      const T = mult(
        C,
        mult(rotateZ(a), mult(translate(0, r, 0), scale(w, segT, segW)))
      );
      parts.push({
        transform: T,
        color: tireCol,
        tag: (tagPrefix || "wheel") + ":tire",
        pivot: [cx, cy, cz],
        orientAxis: "Z",
      });
    }
    // Rim disc
    const N2 = 18;
    const rr = r * 0.55;
    const rimT = r * 0.1;
    const rimW = r * 0.14;
    for (let i = 0; i < N2; i++) {
      const a = (i / N2) * 360.0;
      const T = mult(
        C,
        mult(rotateZ(a), mult(translate(0, rr, 0), scale(w * 0.8, rimT, rimW)))
      );
      parts.push({
        transform: T,
        color: rimCol,
        tag: (tagPrefix || "wheel") + ":rim",
        pivot: [cx, cy, cz],
        orientAxis: "Z",
      });
    }
    // Spokes
    const S = 5;
    const spokeLen = r * 0.7;
    const spokeTh = r * 0.08;
    const spokeWd = w * 0.7;
    for (let i = 0; i < S; i++) {
      const a = (i / S) * 360.0;
      const T = mult(
        C,
        mult(
          rotateZ(a),
          mult(
            translate(0, spokeLen * 0.5, 0),
            scale(spokeWd, spokeLen, spokeTh)
          )
        )
      );
      parts.push({
        transform: T,
        color: rimCol,
        tag: (tagPrefix || "wheel") + ":spoke",
        pivot: [cx, cy, cz],
        orientAxis: "Z",
      });
    }
  }

  function createL300Model(opts) {
    const parts = [];
    const bodyCol = vec4(0.12, 0.14, 0.2, 1);
    const trimCol = vec4(0.08, 0.08, 0.08, 1);
    const glassCol = vec4(0.6, 0.7, 0.85, 0.35);
    const lightCol = vec4(0.9, 0.9, 0.6, 1);
    const t = (opts && opts.time) || 0;

    // Body proportions approximating Mitsubishi L300 (boxy cab-over)
    // Chassis frame
    part(
      parts,
      mult(translate(0, -0.6, 0), scale(6.2, 0.3, 2.2)),
      trimCol,
      "chassis"
    );

    // Cab box (front)
    part(
      parts,
      mult(translate(1.4, 0.4, 0), scale(2.4, 1.6, 2.0)),
      bodyCol,
      "cab"
    );
    // Windshield (slanted a bit)
    part(
      parts,
      mult(translate(2.4, 0.9, 0), mult(rotateZ(-12), scale(0.1, 1.0, 1.8))),
      glassCol,
      "windshield"
    );
    // Side windows
    part(
      parts,
      mult(translate(1.0, 0.95, 1.01), scale(1.4, 0.9, 0.05)),
      glassCol,
      "windowR"
    );
    part(
      parts,
      mult(translate(1.0, 0.95, -1.01), scale(1.4, 0.9, 0.05)),
      glassCol,
      "windowL"
    );
    // Doors hint
    part(
      parts,
      mult(translate(0.6, 0.2, 0), scale(0.05, 1.2, 2.0)),
      trimCol,
      "doorLine"
    );

    // Grille + headlights
    part(
      parts,
      mult(translate(2.65, 0.35, 0), scale(0.1, 0.9, 1.4)),
      trimCol,
      "grille"
    );
    part(
      parts,
      mult(translate(2.7, 0.6, 0.75), scale(0.06, 0.35, 0.35)),
      lightCol,
      "headlightR"
    );
    part(
      parts,
      mult(translate(2.7, 0.6, -0.75), scale(0.06, 0.35, 0.35)),
      lightCol,
      "headlightL"
    );
    // Bumper
    part(
      parts,
      mult(translate(2.75, -0.1, 0), scale(0.2, 0.25, 2.2)),
      trimCol,
      "bumperFront"
    );

    // Mirrors
    part(
      parts,
      mult(translate(1.7, 0.95, 1.2), scale(0.15, 0.15, 0.4)),
      trimCol,
      "mirrorR"
    );
    part(
      parts,
      mult(translate(1.7, 0.95, -1.2), scale(0.15, 0.15, 0.4)),
      trimCol,
      "mirrorL"
    );

    // Bed (flatbed with low side walls)
    part(
      parts,
      mult(translate(-1.6, 0.1, 0), scale(3.6, 0.3, 2.1)),
      bodyCol,
      "bedFloor"
    );
    part(
      parts,
      mult(translate(-3.4, 0.55, 0), scale(0.3, 0.9, 2.1)),
      bodyCol,
      "bedRear"
    );
    part(
      parts,
      mult(translate(-1.6, 0.8, 1.1), scale(3.6, 0.8, 0.2)),
      bodyCol,
      "bedRight"
    );
    part(
      parts,
      mult(translate(-1.6, 0.8, -1.1), scale(3.6, 0.8, 0.2)),
      bodyCol,
      "bedLeft"
    );

    // Wheels (approx positions)
    const tireCol = vec4(0.06, 0.06, 0.06, 1),
      rimCol = vec4(0.75, 0.76, 0.78, 1);
    const r = 0.55,
      w = 0.35;
    wheel(parts, [1.5, -1.0, 1.1], r, w, tireCol, rimCol, "wheelFR");
    wheel(parts, [1.5, -1.0, -1.1], r, w, tireCol, rimCol, "wheelFL");
    wheel(parts, [-2.4, -1.0, 1.1], r, w, tireCol, rimCol, "wheelRR");
    wheel(parts, [-2.4, -1.0, -1.1], r, w, tireCol, rimCol, "wheelRL");

    // Slight bounce animation suggestion (optional)
    const bounce = Math.sin(t * 2) * 0.02;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].tag && parts[i].tag.startsWith("wheel")) continue;
      parts[i].transform = mult(translate(0, bounce, 0), parts[i].transform);
    }

    return parts;
  }

  // Environment: moving road with lane dashes and roadside boxes
  function createL300Environment(opts) {
    const parts = [];
    const off = (opts && opts.offsetX) || 0; // motion offset along +X (environment moves -off)
    const roadCol = vec4(0.1, 0.1, 0.12, 1);
    const dashCol = vec4(0.95, 0.95, 0.95, 1);
    const sideCol = vec4(0.18, 0.22, 0.18, 1);

    // Ground strips (grass) on both sides
    part(
      parts,
      mult(translate(0, -1.35, 3.5), scale(60, 0.1, 4.0)),
      sideCol,
      "env:grassR"
    );
    part(
      parts,
      mult(translate(0, -1.35, -3.5), scale(60, 0.1, 4.0)),
      sideCol,
      "env:grassL"
    );
    // Road base centered at Z=0
    part(
      parts,
      mult(translate(0, -1.3, 0), scale(60, 0.1, 3.0)),
      roadCol,
      "env:road"
    );

    // Lane dashes (center)
    const spacing = 6.0,
      dashLen = 2.0; // world units
    const start = -30.0,
      end = 30.0;
    const phase = ((off % spacing) + spacing) % spacing; // wrap 0..spacing
    for (let x = start; x < end; x += spacing) {
      const px = x - phase + dashLen * 0.5;
      part(
        parts,
        mult(translate(px, -1.2, 0), scale(dashLen, 0.06, 0.2)),
        dashCol,
        "env:dash"
      );
    }

    // Roadside boxes (buildings/trees) moving past
    const sideSpacing = 12.0;
    const sideStart = -36.0;
    const sideEnd = 36.0;
    for (let x = sideStart; x < sideEnd; x += sideSpacing) {
      const px = x - phase * 2.0; // different phase to vary pacing
      // Right side
      part(
        parts,
        mult(translate(px, -0.3, 4.8), scale(1.6, 1.6, 1.6)),
        sideCol,
        "env:boxR"
      );
      // Left side
      part(
        parts,
        mult(translate(px + 3.0, -0.2, -4.8), scale(1.2, 2.2, 1.2)),
        sideCol,
        "env:boxL"
      );
    }

    return parts;
  }

  window.createL300Model = createL300Model;
  window.createL300Environment = createL300Environment;
})();
