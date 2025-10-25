(function () {
  /**
   * Creates a new drawable part node.
   * @param {mat4} t - The local transformation matrix (relative to its parent).
   * @param {vec4} c - The color of the part.
   * @param {string} tag - A tag for identification (e.g., animation).
   * @returns {object} A scene graph node.
   */
  function createPartNode(t, c, tag) {
    return {
      localTransform: t,
      color: c,
      tag: tag || null,
      children: [], // This part could have children, but typically leaf nodes don't
      draw: true, // This node represents a drawable cube
    };
  }

  /**
   * Creates a new group node.
   * A group node is invisible but holds children and a transformation.
   * Useful for grouping parts (e.g., the whole louver assembly).
   * @param {mat4} t - The local transformation matrix (relative to its parent).
   * @param {string} tag - A tag for identification.
   * @returns {object} A scene graph node.
   */
  function createGroupNode(t, tag) {
    return {
      localTransform: t,
      color: null,
      tag: tag || null,
      children: [],
      draw: false, // This node is just a transform/group, not drawn
    };
  }

  /**
   * Adds all the parts of an air conditioner to a parent scene graph node.
   * @param {object} parentNode - The scene graph node to attach the AC to.
   * @param {number} size - A scaling factor for the whole unit.
   */
  function addAirConditioner(parentNode, size) {
    const s = size || 1.0;
    // No center [cx, cy, cz] or 'C' matrix. The parentNode's transform *is* the center.
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
    parentNode.children.push(
      createPartNode(
        mult(translate(0, 0, -bd / 2 + panelT / 2), scale(bw, bh, panelT)),
        bodyCol
      )
    );

    // Top/Bottom caps and side walls (outer shell)
    parentNode.children.push(
      createPartNode(
        mult(translate(0, bh / 2.2 - panelT / 2, 0), scale(bw, panelT, bd)),
        bodyCol
      )
    );
    parentNode.children.push(
      createPartNode(
        mult(translate(0, -bh / 2.4 + panelT / 2, 0), scale(bw, panelT, bd)),
        bodyCol
      )
    );
    parentNode.children.push(
      createPartNode(
        mult(
          translate(-bw / 2 + panelT / 2, 0, 0),
          scale(panelT, bh - 3 * panelT, bd)
        ),
        bodyCol
      )
    );
    parentNode.children.push(
      createPartNode(
        mult(
          translate(bw / 2 - panelT / 2, 0, 0),
          scale(panelT, bh - 3 * panelT, bd)
        ),
        bodyCol
      )
    );

    // Front fascia (slightly proud to fake curvature)
    const frontZ = bd / 2 - panelT / 2;
    const fasciaYOffsetFrac = cfg.fasciaYOffsetFrac ?? 0.14;
    const fasciaHFrac = cfg.fasciaHFrac ?? 0.56;
    parentNode.children.push(
      createPartNode(
        mult(
          translate(0, bh * fasciaYOffsetFrac, frontZ),
          scale(bw - 2 * panelT, bh * fasciaHFrac, panelT)
        ),
        fasciaCol
      )
    );
    // Subtle seam under fascia
    parentNode.children.push(
      createPartNode(
        mult(
          translate(0, -bh * 0.05, frontZ + panelT * 0.2),
          scale(bw - 2 * panelT, 0.01 * s, 0.01 * s)
        ),
        seamCol
      )
    );

    // Bottom fascia lip/seam to suggest the lower cover edge
    parentNode.children.push(
      createPartNode(
        mult(
          translate(0, -bh * 0.32, frontZ + panelT * 0.15),
          scale(bw - 2 * panelT, 0.008 * s, 0.012 * s)
        ),
        seamCol
      )
    );

    // Front edge bevel hints (left and right thin vertical strips)
    const bevelZ1 = frontZ + panelT * 0.15;
    const bevelZ2 = frontZ + panelT * 0.05;
    const bevelH = bh * 0.55;
    const bevelY = -bh * 0.05;
    // Left
    parentNode.children.push(
      createPartNode(
        mult(
          translate(-bw / 2 + panelT, bevelY, bevelZ1),
          scale(0.01 * s, bevelH, 0.01 * s)
        ),
        seamCol
      )
    );
    parentNode.children.push(
      createPartNode(
        mult(
          translate(-bw / 2 + panelT * 1.6, bevelY, bevelZ2),
          scale(0.01 * s, bevelH, 0.01 * s)
        ),
        seamCol
      )
    );
    // Right
    parentNode.children.push(
      createPartNode(
        mult(
          translate(bw / 2 - panelT, bevelY, bevelZ1),
          scale(0.01 * s, bevelH, 0.01 * s)
        ),
        seamCol
      )
    );
    parentNode.children.push(
      createPartNode(
        mult(
          translate(bw / 2 - panelT * 1.6, bevelY, bevelZ2),
          scale(0.01 * s, bevelH, 0.01 * s)
        ),
        seamCol
      )
    );

    // Top intake grille (on top face, near front edge)
    const grillSlats = Math.max(4, Math.floor(cfg.grillSlats ?? 12));
    for (let i = 0; i < grillSlats; i++) {
      const zOff = bd / 2 - panelT - i * 0.03 * s;
      parentNode.children.push(
        createPartNode(
          mult(
            translate(0, bh / 2 - panelT, zOff),
            scale(bw * 0.8, 0.012 * s, 0.012 * s)
          ),
          seamCol,
          "acTopGrille"
        )
      );
    }

    // Indicator window and LED (right side)
    parentNode.children.push(
      createPartNode(
        mult(
          translate(bw * 0.36, 0.1 * bh, frontZ + panelT * 0.3),
          scale(0.22 * s, 0.12 * s, 0.03 * s)
        ),
        darkGrayCol,
        "acDisplay"
      )
    );
    // Display glass overlay and bezel details
    parentNode.children.push(
      createPartNode(
        mult(
          translate(bw * 0.36, 0.1 * bh, frontZ + panelT * 0.33),
          scale(0.2 * s, 0.1 * s, 0.01 * s)
        ),
        vec4(0.14, 0.16, 0.18, 1),
        "acDisplayGlass"
      )
    );
    // Simple icon bar inside display (3 bars)
    for (let i = 0; i < 3; i++) {
      parentNode.children.push(
        createPartNode(
          mult(
            translate(
              bw * 0.36 - 0.06 * s + i * 0.06 * s,
              0.1 * bh,
              frontZ + panelT * 0.34
            ),
            scale(0.02 * s, 0.03 * s, 0.005 * s)
          ),
          vec4(0.22, 0.75, 0.95, 1),
          "acDisplayIcon"
        )
      );
    }
    parentNode.children.push(
      createPartNode(
        mult(
          translate(bw * 0.42, -0.08 * bh, frontZ + panelT * 0.35),
          scale(0.05 * s, 0.05 * s, 0.02 * s)
        ),
        ledCol,
        "acLED"
      )
    );
    // Power button with bezel near the LED
    parentNode.children.push(
      createPartNode(
        mult(
          translate(bw * 0.46, -0.08 * bh, frontZ + panelT * 0.33),
          scale(0.08 * s, 0.08 * s, 0.02 * s)
        ),
        vec4(0.9, 0.92, 0.95, 1),
        "acPowerBtnBezel"
      )
    );
    parentNode.children.push(
      createPartNode(
        mult(
          translate(bw * 0.46, -0.08 * bh, frontZ + panelT * 0.34),
          scale(0.06 * s, 0.06 * s, 0.02 * s)
        ),
        vec4(0.22, 0.24, 0.28, 1),
        "acPowerBtn"
      )
    );
    parentNode.children.push(
      createPartNode(
        mult(
          translate(bw * 0.46, -0.03 * bh, frontZ + panelT * 0.35),
          scale(0.02 * s, 0.02 * s, 0.02 * s)
        ),
        vec4(0.2, 0.9, 0.5, 1),
        "acPowerBtnLED"
      )
    );
    // Additional small indicators near the display (dim white/blue)
    const led2 = vec4(0.6, 0.8, 1.0, 1);
    const led3 = vec4(0.95, 0.95, 0.98, 1);
    parentNode.children.push(
      createPartNode(
        mult(
          translate(bw * 0.32, -0.08 * bh, frontZ + panelT * 0.33),
          scale(0.035 * s, 0.035 * s, 0.02 * s)
        ),
        led2,
        "acLED2"
      )
    );
    parentNode.children.push(
      createPartNode(
        mult(
          translate(bw * 0.28, -0.08 * bh, frontZ + panelT * 0.33),
          scale(0.03 * s, 0.03 * s, 0.02 * s)
        ),
        led3,
        "acLED3"
      )
    );

    // Outlet recess (rectangular opening)
    const outletW = bw * (cfg.outletWFrac ?? 0.95);
    const outletH = bh * (cfg.outletHFrac ?? 0.095);
    const outletY = -bh * (cfg.outletYOffsetFrac ?? 0.27);
    const frontInnerZ = bd / 2 - panelT;
    const recessD = (cfg.recessDepthFrac ?? 0.1) * bd;
    parentNode.children.push(
      createPartNode(
        mult(
          translate(0, outletY, frontInnerZ - recessD / 2),
          scale(outletW, outletH, recessD)
        ),
        recessCol,
        "acOutlet"
      )
    );

    // --- FIX: Rebuilt outlet frame and thickened bottom to close all gaps ---
    const lipT = 0.02 * s;
    const lipD = 0.04 * bd;
    const extraCloseEps = (cfg.closeGapEps ?? 0.05) * s;
    const bottomLipT = lipT * 2.5; // Base thickness

    // Top lip
    parentNode.children.push(
      createPartNode(
        mult(
          translate(
            0,
            outletY + outletH / 2 + lipT / 2,
            frontInnerZ - lipD / 2
          ),
          scale(outletW + lipT * 2, lipT, lipD)
        ),
        bodyCol
      )
    );

    // Bottom lip (now a thicker lower frame)
    parentNode.children.push(
      createPartNode(
        mult(
          translate(
            0,
            outletY - outletH / 2 - bottomLipT / 2 + extraCloseEps,
            frontInnerZ - lipD / 2
          ),
          scale(outletW + lipT * 2, bottomLipT, lipD)
        ),
        bodyCol
      )
    );

    // Solid side frames
    const frameSideW = (bw - outletW) / 2;
    const frameSideH = outletH + lipT + bottomLipT + extraCloseEps;
    const frameSideY = outletY + (lipT - bottomLipT) / 2 + extraCloseEps / 2;
    const frameSideD = lipD;
    // Left Frame
    parentNode.children.push(
      createPartNode(
        mult(
          translate(
            -outletW / 2 - frameSideW / 2,
            frameSideY,
            frontInnerZ - frameSideD / 2
          ),
          scale(frameSideW, frameSideH, frameSideD)
        ),
        bodyCol
      )
    );
    // Right Frame
    parentNode.children.push(
      createPartNode(
        mult(
          translate(
            outletW / 2 + frameSideW / 2,
            frameSideY,
            frontInnerZ - frameSideD / 2
          ),
          scale(frameSideW, frameSideH, frameSideD)
        ),
        bodyCol
      )
    );
    // --- End of Frame Fix ---

    // Back panel inside recess to darken the interior
    parentNode.children.push(
      createPartNode(
        mult(
          translate(0, outletY, frontInnerZ - recessD + 0.005 * bd),
          scale(outletW * 0.96, outletH * 0.96, 0.01 * bd)
        ),
        vec4(0.25, 0.27, 0.3, 1),
        "acOutletBack"
      )
    );
    // Horizontal coil fins inside recess
    const coilCount = 10;
    for (let i = 0; i < coilCount; i++) {
      const yPos = outletY - outletH / 2 + (i + 0.5) * (outletH / coilCount);
      parentNode.children.push(
        createPartNode(
          mult(
            translate(0, yPos, frontInnerZ - recessD * 0.75),
            scale(outletW * 0.92, 0.006 * s, 0.02 * bd)
          ),
          vec4(0.32, 0.34, 0.38, 1),
          "acCoilFin"
        )
      );
    }
    // Blower roller hint (segmented bar)
    const segCount = 14;
    for (let i = 0; i < segCount; i++) {
      const x = -outletW / 2 + (i + 0.5) * (outletW / segCount);
      const shade = 0.3 + (i % 2) * 0.06;
      parentNode.children.push(
        createPartNode(
          mult(
            translate(
              x,
              outletY - outletH * 0.36,
              frontInnerZ - recessD * 0.55
            ),
            scale((outletW / segCount) * 0.8, 0.06 * outletH, 0.035 * bd)
          ),
          vec4(shade, shade + 0.02, shade + 0.04, 1),
          "acBlowerSeg"
        )
      );
    }

    // Filler mask near the top of the outlet
    const maskH = outletH * (cfg.maskHFrac ?? 0.28);
    const maskD = (cfg.maskDepthFrac ?? 0.05) * bd;
    parentNode.children.push(
      createPartNode(
        mult(
          translate(
            0,
            outletY + outletH / 2 - maskH / 2,
            frontInnerZ - maskD / 2
          ),
          scale(outletW - lipT * 0.5, maskH, maskD)
        ),
        bodyCol,
        "acOutletMask"
      )
    );
    // Bottom mask
    const maskBH = outletH * (cfg.maskBottomHFrac ?? 0.35);
    parentNode.children.push(
      createPartNode(
        mult(
          translate(
            0,
            outletY - outletH / 2 + maskBH / 2,
            frontInnerZ - maskD / 2
          ),
          scale(outletW - lipT * 0.5, maskBH, maskD)
        ),
        bodyCol,
        "acOutletMaskBottom"
      )
    );

    // Internal vertical vanes (static)
    const vaneCount = Math.max(0, Math.floor(cfg.vaneCount ?? 6));
    for (let i = 0; i < vaneCount; i++) {
      const xPos = -outletW / 2 + (i + 0.5) * (outletW / vaneCount);
      parentNode.children.push(
        createPartNode(
          mult(
            translate(xPos, outletY, frontInnerZ - recessD * 0.3),
            scale(0.02 * s, outletH * 0.9, 0.02 * s)
          ),
          vaneCol,
          "acVane"
        )
      );
    }

    // Hinge seam bar behind flap
    parentNode.children.push(
      createPartNode(
        mult(
          translate(
            0,
            outletY - outletH / 2 + panelT * 0.25,
            frontInnerZ - 0.01 * bd
          ),
          scale(outletW, panelT * 0.5, 0.01 * bd)
        ),
        seamCol
      )
    );

    // Bottom micro vents band to add detail (thin slits)
    const ventCount = 18;
    const ventBandY = -bh * 0.3;
    const ventBandZ = frontZ + panelT * 0.12;
    const ventW = (bw * 0.78) / ventCount;
    for (let i = 0; i < ventCount; i++) {
      const x = -bw * 0.39 + (i + 0.5) * ventW;
      parentNode.children.push(
        createPartNode(
          mult(
            translate(x, ventBandY, ventBandZ),
            scale(ventW * 0.6, 0.006 * s, 0.012 * s)
          ),
          seamCol,
          "acVent"
        )
      );
    }

    // --- HIERARCHICAL LOUVER (SWING FLAP) ---
    // This is the new, hierarchical way.
    // We create an invisible "group" node at the pivot point.
    // The flap and lip are children of this group node.
    // Animating the group node (acLouverAssembly) will animate all its children.
    const flapW = outletW;
    const flapH = (cfg.flapHFrac ?? 0.055) * s; // thickness
    const flapD =
      cfg.flapDepth != null
        ? cfg.flapDepth
        : cfg.flapDepthFrac != null
        ? cfg.flapDepthFrac * bd
        : outletH * 1.02;
    const hingeY = outletY - outletH / 2; // bottom of outlet = hinge line
    // The louverPivot is relative to the AC's center (the parentNode)
    const louverPivotT = translate(0, hingeY, frontInnerZ);

    // Create the group node at the pivot point
    const louverAssemblyNode = createGroupNode(
      louverPivotT,
      "acLouverAssembly"
    );
    parentNode.children.push(louverAssemblyNode);

    // 1. Main Flap
    // Defined relative to the pivot node.
    // Pivot is at (0, hingeY, frontInnerZ)
    // Old flap center was (0, hingeY - flapH / 2, frontInnerZ + flapD / 2)
    // New local center (relative to pivot) is (0, -flapH / 2, +flapD / 2)
    const flapMainLocalT = mult(
      translate(0, -flapH / 2, flapD / 2),
      scale(flapW, flapH, flapD)
    );
    louverAssemblyNode.children.push(
      createPartNode(flapMainLocalT, bodyCol, "acLouverPart")
    );

    // 2. Front Lip
    // Defined relative to the pivot node.
    const lipD2 = (cfg.flapLipDepthFrac ?? 0.06) * bd;
    const lipOverlap = (cfg.flapLipOverlapFrac ?? 0.01) * bd;
    // Old lip center was (0, hingeY - flapH / 2, frontInnerZ + flapD + lipD2/2 - lipOverlap)
    // New local center (relative to pivot) is (0, -flapH / 2, flapD + lipD2/2 - lipOverlap)
    const lipLocalPos = translate(
      0,
      -flapH / 2,
      flapD + lipD2 / 2 - lipOverlap
    );
    const lipLocalRot = rotateX(-(cfg.flapLipTiltDeg ?? 12));
    const lipLocalScale = scale(flapW, flapH * 0.6, lipD2);

    const flapLipLocalT = mult(lipLocalPos, mult(lipLocalRot, lipLocalScale));
    louverAssemblyNode.children.push(
      createPartNode(flapLipLocalT, bodyCol, "acLouverPart")
    );

    // (The original part() calls for 'acLouver' are no longer needed,
    // as they are replaced by the two parts above)

    // Small gasket strip just inside the outlet under the hinge
    parentNode.children.push(
      createPartNode(
        mult(
          translate(
            0,
            hingeY - flapH * 0.15,
            frontInnerZ - (cfg.gasketDepthFrac ?? 0.005) * bd
          ),
          scale(outletW, flapH * 0.3, (cfg.gasketDepthFrac ?? 0.02) * bd)
        ),
        bodyCol,
        "acGasket"
      )
    );
  }

  /**
   * Creates the complete scene graph for the AC model, including the wall.
   * @param {object} opts - Options (currently unused).
   * @returns {object} The root node of the scene graph.
   */
  function createAcModel(opts) {
    // This is the root of our entire scene graph
    const rootNode = createGroupNode(mat4(), "sceneRoot");

    const wallCol = vec4(0.92, 0.93, 0.96, 1);
    // 1. Add Wall
    const wallNode = createPartNode(
      mult(translate(0, 0, -1.4), scale(12, 7, 0.2)),
      wallCol,
      "wall"
    );
    rootNode.children.push(wallNode);

    // 2. Add AC
    // Create a group node for the AC. This node's transform is the
    // old 'center' or 'C' matrix. We can rotate this node
    // to spin the whole AC.
    const acRootNode = createGroupNode(
      translate(0, 1.25, -0.9),
      "acRoot" // Tag this node for the spin animation
    );
    rootNode.children.push(acRootNode);

    // Add all the AC parts as children of the acRootNode
    addAirConditioner(acRootNode, 1.6);

    return rootNode;
  }
  window.createAcModel = createAcModel;
})();
