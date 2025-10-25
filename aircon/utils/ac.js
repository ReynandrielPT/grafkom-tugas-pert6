(function () {
  function part(list, t, c, tag) {
    list.push({ transform: t, color: c, tag: tag || null });
  }

  function addAirConditioner(parts, center, size) {
    const s = size || 1.0;
    const [cx, cy, cz] = center;
    const C = translate(cx, cy, cz);
    const cfg = (typeof window !== "undefined" && window.acConfig) || {};
    // Colors
    const bodyCol = vec4(0.95, 0.96, 0.98, 1);
    const fasciaCol = vec4(0.96, 0.97, 0.99, 1);
    const seamCol = vec4(0.78, 0.8, 0.83, 1);
    const recessCol = vec4(0.35, 0.37, 0.4, 1);
    const vaneCol = vec4(0.42, 0.44, 0.48, 1);
    const darkGrayCol = vec4(0.18, 0.2, 0.22, 1);
    const ledCol = vec4(0.25, 0.9, 0.55, 1);

    // Dimensions (indoor split-type), parameterized by config for fitting
    const bw = 3.4 * s * (cfg.bodyWScale ?? 1.0); // slightly longer base width
    const bh = 1.0 * s * (cfg.bodyHScale ?? 1.0); // height
    const bd = 0.7 * s * (cfg.bodyDScale ?? 1.0); // depth
    const panelT = 0.06 * s; // shell thickness

    // Back plate (against wall)
    part(
      parts,
      mult(
        C,
        mult(translate(0, 0, -bd / 2 + panelT / 2), scale(bw, bh, panelT))
      ),
      bodyCol
    );

    // Top/Bottom caps and side walls (outer shell)
    part(
      parts,
      mult(
        C,
        mult(translate(0, bh / 2.2 - panelT / 2, 0), scale(bw, panelT, bd))
      ),
      bodyCol
    );
    part(
      parts,
      mult(
        C,
        mult(translate(0, -bh / 2.4 + panelT / 2, 0), scale(bw, panelT, bd))
      ),
      bodyCol
    );
    part(
      parts,
      mult(
        C,
        mult(
          translate(-bw / 2 + panelT / 2, 0, 0),
          scale(panelT, bh - 3 * panelT, bd)
        )
      ),
      bodyCol
    );
    part(
      parts,
      mult(
        C,
        mult(
          translate(bw / 2 - panelT / 2, 0, 0),
          scale(panelT, bh - 3 * panelT, bd)
        )
      ),
      bodyCol
    );

    // Front fascia (slightly proud to fake curvature)
    const frontZ = bd / 2 - panelT / 2;
    // Lower fascia slightly and make it a bit taller so casing fits around the lowered outlet
    const fasciaYOffsetFrac = cfg.fasciaYOffsetFrac ?? 0.14;
    const fasciaHFrac = cfg.fasciaHFrac ?? 0.56;
    part(
      parts,
      mult(
        C,
        mult(
          translate(0, bh * fasciaYOffsetFrac, frontZ),
          scale(bw - 2 * panelT, bh * fasciaHFrac, panelT)
        )
      ),
      fasciaCol
    );
    // Subtle seam under fascia
    part(
      parts,
      mult(
        C,
        mult(
          translate(0, -bh * 0.05, frontZ + panelT * 0.2),
          scale(bw - 2 * panelT, 0.01 * s, 0.01 * s)
        )
      ),
      seamCol
    );

    // Bottom fascia lip/seam to suggest the lower cover edge
    part(
      parts,
      mult(
        C,
        mult(
          translate(0, -bh * 0.32, frontZ + panelT * 0.15),
          scale(bw - 2 * panelT, 0.008 * s, 0.012 * s)
        )
      ),
      seamCol
    );

    // Front edge bevel hints (left and right thin vertical strips)
    const bevelZ1 = frontZ + panelT * 0.15;
    const bevelZ2 = frontZ + panelT * 0.05;
    const bevelH = bh * 0.55;
    const bevelY = -bh * 0.05;
    // Left
    part(
      parts,
      mult(
        C,
        mult(
          translate(-bw / 2 + panelT, bevelY, bevelZ1),
          scale(0.01 * s, bevelH, 0.01 * s)
        )
      ),
      seamCol
    );
    part(
      parts,
      mult(
        C,
        mult(
          translate(-bw / 2 + panelT * 1.6, bevelY, bevelZ2),
          scale(0.01 * s, bevelH, 0.01 * s)
        )
      ),
      seamCol
    );
    // Right
    part(
      parts,
      mult(
        C,
        mult(
          translate(bw / 2 - panelT, bevelY, bevelZ1),
          scale(0.01 * s, bevelH, 0.01 * s)
        )
      ),
      seamCol
    );
    part(
      parts,
      mult(
        C,
        mult(
          translate(bw / 2 - panelT * 1.6, bevelY, bevelZ2),
          scale(0.01 * s, bevelH, 0.01 * s)
        )
      ),
      seamCol
    );

    // Top intake grille (on top face, near front edge)
    const grillSlats = Math.max(4, Math.floor(cfg.grillSlats ?? 12));
    for (let i = 0; i < grillSlats; i++) {
      const zOff = bd / 2 - panelT - i * 0.03 * s;
      part(
        parts,
        mult(
          C,
          mult(
            translate(0, bh / 2 - panelT, zOff),
            scale(bw * 0.8, 0.012 * s, 0.012 * s)
          )
        ),
        seamCol,
        "acTopGrille"
      );
    }

    // Indicator window and LED (right side)
    part(
      parts,
      mult(
        C,
        mult(
          translate(bw * 0.36, 0.1 * bh, frontZ + panelT * 0.3),
          scale(0.22 * s, 0.12 * s, 0.03 * s)
        )
      ),
      darkGrayCol,
      "acDisplay"
    );
    // Display glass overlay and bezel details
    part(
      parts,
      mult(
        C,
        mult(
          translate(bw * 0.36, 0.1 * bh, frontZ + panelT * 0.33),
          scale(0.2 * s, 0.1 * s, 0.01 * s)
        )
      ),
      vec4(0.14, 0.16, 0.18, 1),
      "acDisplayGlass"
    );
    // Simple icon bar inside display (3 bars)
    for (let i = 0; i < 3; i++) {
      part(
        parts,
        mult(
          C,
          mult(
            translate(
              bw * 0.36 - 0.06 * s + i * 0.06 * s,
              0.1 * bh,
              frontZ + panelT * 0.34
            ),
            scale(0.02 * s, 0.03 * s, 0.005 * s)
          )
        ),
        vec4(0.22, 0.75, 0.95, 1),
        "acDisplayIcon"
      );
    }
    part(
      parts,
      mult(
        C,
        mult(
          translate(bw * 0.42, -0.08 * bh, frontZ + panelT * 0.35),
          scale(0.05 * s, 0.05 * s, 0.02 * s)
        )
      ),
      ledCol,
      "acLED"
    );
    // Power button with bezel near the LED
    part(
      parts,
      mult(
        C,
        mult(
          translate(bw * 0.46, -0.08 * bh, frontZ + panelT * 0.33),
          scale(0.08 * s, 0.08 * s, 0.02 * s)
        )
      ),
      vec4(0.9, 0.92, 0.95, 1),
      "acPowerBtnBezel"
    );
    part(
      parts,
      mult(
        C,
        mult(
          translate(bw * 0.46, -0.08 * bh, frontZ + panelT * 0.34), // <-- FIX: Corrected typo from 4.6 to 0.46
          scale(0.06 * s, 0.06 * s, 0.02 * s)
        )
      ),
      vec4(0.22, 0.24, 0.28, 1),
      "acPowerBtn"
    );
    part(
      parts,
      mult(
        C,
        mult(
          translate(bw * 0.46, -0.03 * bh, frontZ + panelT * 0.35),
          scale(0.02 * s, 0.02 * s, 0.02 * s)
        )
      ),
      vec4(0.2, 0.9, 0.5, 1),
      "acPowerBtnLED"
    );
    // Additional small indicators near the display (dim white/blue)
    const led2 = vec4(0.6, 0.8, 1.0, 1);
    const led3 = vec4(0.95, 0.95, 0.98, 1);
    part(
      parts,
      mult(
        C,
        mult(
          translate(bw * 0.32, -0.08 * bh, frontZ + panelT * 0.33),
          scale(0.035 * s, 0.035 * s, 0.02 * s)
        )
      ),
      led2,
      "acLED2"
    );
    part(
      parts,
      mult(
        C,
        mult(
          translate(bw * 0.28, -0.08 * bh, frontZ + panelT * 0.33),
          scale(0.03 * s, 0.03 * s, 0.02 * s)
        )
      ),
      led3,
      "acLED3"
    );

    // Outlet recess (rectangular opening)
    const outletW = bw * (cfg.outletWFrac ?? 0.95);
    const outletH = bh * (cfg.outletHFrac ?? 0.095);
    const outletY = -bh * (cfg.outletYOffsetFrac ?? 0.27);
    const frontInnerZ = bd / 2 - panelT;
    const recessD = (cfg.recessDepthFrac ?? 0.1) * bd;
    part(
      parts,
      mult(
        C,
        mult(
          translate(0, outletY, frontInnerZ - recessD / 2),
          scale(outletW, outletH, recessD)
        )
      ),
      recessCol,
      "acOutlet"
    );

    // --- FIX: Rebuilt outlet frame and thickened bottom to close all gaps ---
    const lipT = 0.02 * s;
    const lipD = 0.04 * bd;
    // Extra upward overlap to close the tiny seam between flap and bottom frame
    const extraCloseEps = (cfg.closeGapEps ?? 0.05) * s; // <-- FIX: Increased from 0.03 to 0.05
    const bottomLipT = lipT * 2.5; // Base thickness

    // Top lip
    part(
      parts,
      mult(
        C,
        mult(
          translate(
            0,
            outletY + outletH / 2 + lipT / 2,
            frontInnerZ - lipD / 2
          ),
          scale(outletW + lipT * 2, lipT, lipD)
        )
      ),
      bodyCol
    );

    // Bottom lip (now a thicker lower frame) — lift slightly to overlap the flap plane (close the gap)
    part(
      parts,
      mult(
        C,
        mult(
          translate(
            0,
            // Raise a tiny epsilon so the top face sits just above hingeY
            outletY - outletH / 2 - bottomLipT / 2 + extraCloseEps,
            frontInnerZ - lipD / 2
          ),
          scale(outletW + lipT * 2, bottomLipT, lipD) // Use new thickness for scale
        )
      ),
      bodyCol
    );

    // Solid side frames (adjusted to connect perfectly with new thicker bottom)
    const frameSideW = (bw - outletW) / 2;
    // Extend the side frames to match the slight upward lift of the bottom lip
    const frameSideH = outletH + lipT + bottomLipT + extraCloseEps; // extraCloseEps keeps side connection seamless
    const frameSideY = outletY + (lipT - bottomLipT) / 2 + extraCloseEps / 2; // recenter with the added height
    const frameSideD = lipD;
    // Left Frame
    part(
      parts,
      mult(
        C,
        mult(
          translate(
            -outletW / 2 - frameSideW / 2,
            frameSideY, // Use new Y position
            frontInnerZ - frameSideD / 2
          ),
          scale(frameSideW, frameSideH, frameSideD) // Use new height
        )
      ),
      bodyCol
    );
    // Right Frame
    part(
      parts,
      mult(
        C,
        mult(
          translate(
            outletW / 2 + frameSideW / 2,
            frameSideY, // Use new Y position
            frontInnerZ - frameSideD / 2
          ),
          scale(frameSideW, frameSideH, frameSideD) // Use new height
        )
      ),
      bodyCol
    );
    // --- End of Frame Fix ---

    // Back panel inside recess to darken the interior
    part(
      parts,
      mult(
        C,
        mult(
          translate(0, outletY, frontInnerZ - recessD + 0.005 * bd),
          scale(outletW * 0.96, outletH * 0.96, 0.01 * bd)
        )
      ),
      vec4(0.25, 0.27, 0.3, 1),
      "acOutletBack"
    );
    // Horizontal coil fins inside recess
    const coilCount = 10;
    for (let i = 0; i < coilCount; i++) {
      const yPos = outletY - outletH / 2 + (i + 0.5) * (outletH / coilCount);
      part(
        parts,
        mult(
          C,
          mult(
            translate(0, yPos, frontInnerZ - recessD * 0.75),
            scale(outletW * 0.92, 0.006 * s, 0.02 * bd)
          )
        ),
        vec4(0.32, 0.34, 0.38, 1),
        "acCoilFin"
      );
    }
    // Blower roller hint (segmented bar)
    const segCount = 14;
    for (let i = 0; i < segCount; i++) {
      const x = -outletW / 2 + (i + 0.5) * (outletW / segCount);
      const shade = 0.3 + (i % 2) * 0.06;
      part(
        parts,
        mult(
          C,
          mult(
            translate(
              x,
              outletY - outletH * 0.36,
              frontInnerZ - recessD * 0.55
            ),
            scale((outletW / segCount) * 0.8, 0.06 * outletH, 0.035 * bd)
          )
        ),
        vec4(shade, shade + 0.02, shade + 0.04, 1),
        "acBlowerSeg"
      );
    }

    // Filler mask near the top of the outlet to close any tiny remaining gaps when the flap swings up
    const maskH = outletH * (cfg.maskHFrac ?? 0.28);
    const maskD = (cfg.maskDepthFrac ?? 0.05) * bd;
    part(
      parts,
      mult(
        C,
        mult(
          translate(
            0,
            outletY + outletH / 2 - maskH / 2,
            frontInnerZ - maskD / 2
          ),
          scale(outletW - lipT * 0.5, maskH, maskD)
        )
      ),
      bodyCol,
      "acOutletMask"
    );
    // Bottom mask to further tighten the visible gap from below
    const maskBH = outletH * (cfg.maskBottomHFrac ?? 0.35);
    part(
      parts,
      mult(
        C,
        mult(
          translate(
            0,
            outletY - outletH / 2 + maskBH / 2,
            frontInnerZ - maskD / 2
          ),
          scale(outletW - lipT * 0.5, maskBH, maskD)
        )
      ),
      bodyCol,
      "acOutletMaskBottom"
    );

    // Internal vertical vanes (static)
    const vaneCount = Math.max(0, Math.floor(cfg.vaneCount ?? 6));
    for (let i = 0; i < vaneCount; i++) {
      const xPos = -outletW / 2 + (i + 0.5) * (outletW / vaneCount);
      part(
        parts,
        mult(
          C,
          mult(
            translate(xPos, outletY, frontInnerZ - recessD * 0.3),
            scale(0.02 * s, outletH * 0.9, 0.02 * s)
          )
        ),
        vaneCol,
        "acVane"
      );
    }

    // Hinge seam bar behind flap
    part(
      parts,
      mult(
        C,
        mult(
          translate(
            0,
            outletY - outletH / 2 + panelT * 0.25,
            frontInnerZ - 0.01 * bd
          ),
          scale(outletW, panelT * 0.5, 0.01 * bd)
        )
      ),
      seamCol
    );

    // Bottom micro vents band to add detail (thin slits)
    const ventCount = 18;
    const ventBandY = -bh * 0.3;
    const ventBandZ = frontZ + panelT * 0.12;
    const ventW = (bw * 0.78) / ventCount;
    for (let i = 0; i < ventCount; i++) {
      const x = -bw * 0.39 + (i + 0.5) * ventW;
      part(
        parts,
        mult(
          C,
          mult(
            translate(x, ventBandY, ventBandZ),
            scale(ventW * 0.6, 0.006 * s, 0.012 * s)
          )
        ),
        seamCol,
        "acVent"
      );
    }

    // Swing flap (animated) — thin plate + small front lip, pivot on bottom-front edge
    const flapW = outletW;
    const flapH = (cfg.flapHFrac ?? 0.055) * s; // thickness
    // Depth determines coverage when closed (rotated vertical). Make it cover the outlet height.
    const flapD =
      cfg.flapDepth != null
        ? cfg.flapDepth
        : cfg.flapDepthFrac != null
        ? cfg.flapDepthFrac * bd
        : outletH * 1.02; // default: slightly larger than outlet height for clean closure
    const hingeY = outletY - outletH / 2; // bottom of outlet = hinge line
    const flapCenterY = hingeY - flapH / 2;
    const flapCenterZ = frontInnerZ + flapD / 2; // back edge aligns to frontInnerZ
    const louverPivot = [cx + 0, cy + hingeY, cz + frontInnerZ];

    // main plate
    let flapMain = mult(
      translate(0, flapCenterY, flapCenterZ),
      scale(flapW, flapH, flapD)
    );
    flapMain = mult(C, flapMain);
    part(parts, flapMain, bodyCol, "acLouver");
    parts[parts.length - 1].pivot = louverPivot;

    // front lip with slight tilt
    const lipD2 = (cfg.flapLipDepthFrac ?? 0.06) * bd;
    let flapLip = scale(flapW, flapH * 0.6, lipD2);
    flapLip = mult(rotateX(-(cfg.flapLipTiltDeg ?? 12)), flapLip);
    // Slight overlap with the main flap to avoid a visible seam
    const lipOverlap = (cfg.flapLipOverlapFrac ?? 0.01) * bd;
    flapLip = mult(
      translate(
        0,
        flapCenterY,
        flapCenterZ + flapD / 2 + lipD2 / 2 - lipOverlap
      ),
      flapLip
    );
    flapLip = mult(C, flapLip);
    part(parts, flapLip, bodyCol, "acLouver");
    parts[parts.length - 1].pivot = louverPivot;

    // (Removed rotating seal per request; rely solely on slight upward shift of bottom slab)

    // Small gasket strip just inside the outlet under the hinge to close tiny gaps when closed
    part(
      parts,
      mult(
        C,
        mult(
          translate(
            0,
            hingeY - flapH * 0.15,
            frontInnerZ - (cfg.gasketDepthFrac ?? 0.005) * bd
          ),
          scale(outletW, flapH * 0.3, (cfg.gasketDepthFrac ?? 0.02) * bd)
        )
      ),
      bodyCol,
      "acGasket"
    );
  }

  function createAcModel(opts) {
    const parts = [];
    const wallCol = vec4(0.92, 0.93, 0.96, 1);
    part(
      parts,
      mult(translate(0, 0, -1.4), scale(12, 7, 0.2)),
      wallCol,
      "wall"
    );
    // Slightly adjust placement so the unit looks naturally mounted and framed in view
    addAirConditioner(parts, [0, 1.25, -0.9], 1.6);
    return parts;
  }
  window.createAcModel = createAcModel;
})();
