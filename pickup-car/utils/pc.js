(function () {
  function part(list, t, c, tag) {
    list.push({ transform: t, color: c, tag: tag || null });
  }

  // Simple circular fan made from small cubes arranged in a ring (disc proxy)
  function addCircularFan(
    parts,
    center,
    radius,
    segmentSize,
    segments,
    color,
    tag
  ) {
    const cx = center[0],
      cy = center[1],
      cz = center[2];
    const N = segments || 24;
    const sz = segmentSize || 0.06;
    const col = color || vec4(0.15, 0.18, 0.2, 1);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 2.0 * Math.PI;
      const y = cy + radius * Math.sin(a);
      const z = cz + radius * Math.cos(a);
      part(
        parts,
        mult(translate(cx, y, z), scale(sz, sz, sz)),
        col,
        tag || "fanCircle"
      );
    }
  }

  // Detailed CPU fan: hub + optional frame + multiple blades (oriented around Y/X)
  function addCpuFan(parts, center, size, options) {
    const s = size || 0.9; // overall scale
    const includeFrame = !options || options.includeFrame !== false;
    const orientYDeg =
      options && options.orientYDegrees ? options.orientYDegrees : 0;
    const orientXDeg =
      options && options.orientXDegrees ? options.orientXDegrees : 0;
    const hubCol = vec4(0.18, 0.18, 0.2, 1);
    const frameCol = vec4(0.12, 0.12, 0.14, 1);
    const bladeCol = vec4(0.2, 0.2, 0.22, 1);
    const cx = center[0],
      cy = center[1],
      cz = center[2];
    const C = translate(cx, cy, cz);
    const Oy = rotateY(orientYDeg);
    const Ox = rotateX(orientXDeg);
    const O = mult(Oy, Ox);

    // Hub (oriented)
    part(
      parts,
      mult(C, mult(O, scale(0.15 * s, 0.15 * s, 0.15 * s))),
      hubCol,
      "cpuFanHub"
    );

    // Frame (square ring) if included
    const half = 0.6 * s,
      thick = 0.06 * s,
      depth = 0.06 * s;
    if (includeFrame) {
      part(
        parts,
        mult(
          C,
          mult(O, mult(translate(0, half, 0), scale(2 * half, thick, depth)))
        ),
        frameCol,
        "cpuFanFrame"
      ); // top
      part(
        parts,
        mult(
          C,
          mult(O, mult(translate(0, -half, 0), scale(2 * half, thick, depth)))
        ),
        frameCol,
        "cpuFanFrame"
      ); // bottom
      part(
        parts,
        mult(
          C,
          mult(O, mult(translate(half, 0, 0), scale(thick, 2 * half, depth)))
        ),
        frameCol,
        "cpuFanFrame"
      ); // right
      part(
        parts,
        mult(
          C,
          mult(O, mult(translate(-half, 0, 0), scale(thick, 2 * half, depth)))
        ),
        frameCol,
        "cpuFanFrame"
      ); // left
    }

    // Blades around Z in local oriented space
    const N = 7;
    const bladeLen = 0.5 * s;
    const bladeW = 0.1 * s;
    const bladeD = 0.04 * s;
    const baseLocal = mult(
      translate(0, bladeLen * 0.5, 0),
      scale(bladeW, bladeLen, bladeD)
    );
    for (let i = 0; i < N; i++) {
      const rot = rotateZ((i / N) * 360.0);
      part(
        parts,
        mult(C, mult(O, mult(rot, baseLocal))),
        bladeCol,
        "cpuFanBlade"
      );
      const last = parts.length - 1;
      parts[last].pivot = [cx, cy, cz];
      parts[last].orientYDeg = orientYDeg;
      parts[last].orientXDeg = orientXDeg;
    }
  }

  function createPcModel(opts) {
    const parts = [];
    const caseCol = vec4(0.12, 0.12, 0.14, 1);
    const panelCol = vec4(0.08, 0.08, 0.1, 1);
    const glassCol = vec4(0.65, 0.75, 0.85, 0.2); // visual intent only
    const boardCol = vec4(0.1, 0.2, 0.12, 1);
    const gpuCol = vec4(0.1, 0.1, 0.12, 1);
    const ramCol = vec4(0.18, 0.18, 0.25, 1);
    const psuCol = vec4(0.08, 0.08, 0.09, 1);
    const ssdCol = vec4(0.2, 0.2, 0.24, 1);
    const coolerCol = vec4(0.22, 0.22, 0.26, 1);

    // Case built from panels (left side open at -Z)
    // Dim references: overall interior approx X:3.0, Y:3.0, Z:2.0, centered near y=0.5
    // Top (y ~ 2.0) and Bottom (y ~ -1.0)
    part(parts, mult(translate(0.0, 1.95, 0.0), scale(3.0, 0.1, 2.0)), caseCol);
    part(
      parts,
      mult(translate(0.0, -0.95, 0.0), scale(3.0, 0.1, 2.0)),
      caseCol
    );
    // Back panel (+X) and Front panel (-X)
    part(parts, mult(translate(1.6, 0.5, 0.0), scale(0.1, 2.9, 2.0)), caseCol);
    part(
      parts,
      mult(translate(-1.6, 0.5, 0.0), scale(0.1, 2.9, 1.95)),
      panelCol
    );
    // Right tempered glass (+Z); left side (-Z) open
    part(
      parts,
      mult(translate(0.0, 0.5, 1.05), scale(2.9, 2.9, 0.05)),
      glassCol,
      "glassRight"
    );

    // PSU shroud at bottom
    part(
      parts,
      mult(translate(0.2, -0.6, 0.0), scale(2.6, 0.5, 2.0)),
      panelCol
    );

    // Motherboard (ATX-like) mounted on inner side, visible through right glass
    // Thin board plane parallel to XY at z ~ 0.65
    part(
      parts,
      mult(translate(0.4, 0.8, 0.65), scale(1.6, 1.6, 0.06)),
      boardCol,
      "motherboard"
    );

    // CPU air cooler block on the motherboard near the back (towards +X)
    part(
      parts,
      mult(translate(0.95, 1.1, 0.8), scale(0.5, 0.6, 0.3)),
      coolerCol,
      "cpuCooler"
    );

    // RAM sticks beside CPU (4 sticks)
    const ramX0 = 0.35;
    const ramY = 0.95;
    const ramZ = 0.78;
    const ramW = 0.08;
    const ramH = 0.7;
    const ramT = 0.06;
    for (let k = 0; k < 4; k++) {
      part(
        parts,
        mult(translate(ramX0 + k * 0.1, ramY, ramZ), scale(ramW, ramH, ramT)),
        ramCol,
        "ram"
      );
    }

    // GPU card in PCIe area, spanning towards the front (lower Y), protruding towards glass (+Z)
    part(
      parts,
      mult(translate(-0.2, 0.5, 0.88), scale(1.9, 0.5, 0.25)),
      gpuCol,
      "gpu"
    );

    // PSU block inside the shroud (not very visible, but adds realism)
    part(
      parts,
      mult(translate(1.0, -0.75, -0.4), scale(0.9, 0.35, 0.8)),
      psuCol,
      "psu"
    );

    // Two SSDs on top of shroud near the front
    part(
      parts,
      mult(translate(-1.0, -0.35, 0.35), scale(0.35, 0.05, 0.25)),
      ssdCol,
      "ssd"
    );
    part(
      parts,
      mult(translate(-1.0, -0.35, -0.05), scale(0.35, 0.05, 0.25)),
      ssdCol,
      "ssd"
    );

    // Three front case fans stacked vertically, facing front (-90° Y), no frame
    // Front panel x ~ -1.6, slightly inside at -1.35
    const fx = -1.35,
      fz = 0.0;
    addCpuFan(parts, [fx, 1.4, fz], 0.8, {
      includeFrame: false,
      orientYDegrees: -90,
    });
    addCpuFan(parts, [fx, 0.6, fz], 0.8, {
      includeFrame: false,
      orientYDegrees: -90,
    });
    addCpuFan(parts, [fx, -0.2, fz], 0.8, {
      includeFrame: false,
      orientYDegrees: -90,
    });

    // Top case fans (inside the roof), facing up (-90° X), no frame
    // Top panel y ~ 1.95; place slightly below at y ~ 1.65
    addCpuFan(parts, [0.05, 1.65, fz], 0.8, {
      includeFrame: false,
      orientXDegrees: -90,
    });
    addCpuFan(parts, [-0.8, 1.65, fz], 0.8, {
      includeFrame: false,
      orientXDegrees: -90,
    });
    addCpuFan(parts, [0.9, 1.65, fz], 0.8, {
      includeFrame: false,
      orientXDegrees: -90,
    });

    // Rear case fan (inside the back), facing back (+90° Y), no frame
    addCpuFan(parts, [1.35, 1.0, 0.0], 0.8, {
      includeFrame: false,
      orientYDegrees: 90,
    });

    return parts;
  }

  window.createPcModel = createPcModel;
})();
