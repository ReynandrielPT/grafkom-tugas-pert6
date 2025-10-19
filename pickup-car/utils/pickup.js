// Builds a simple pickup truck from scaled cube parts.
// Returns an array of parts: { transform: mat4, color: vec4 }
(function () {
  function part(list, t, c) {
    list.push({ transform: t, color: c });
  }
  function makeWheel(tx, ty, tz, r, w, color) {
    // approximate wheel as a squashed cube (stylized)
    return { transform: mult(translate(tx, ty, tz), scale(r, r, w)), color };
  }
  function createPickupModel(opts) {
    const parts = [];
    const bodyColor = (opts && opts.bodyColor) || vec4(0.12, 0.15, 0.2, 1);
    const bedColor = scale(0.9, bodyColor);
    const glass = vec4(0.5, 0.7, 0.9, 1);
    const tireCol = vec4(0.08, 0.08, 0.08, 1);
    const rimCol = vec4(0.75, 0.75, 0.75, 1);

    // base chassis
    part(parts, mult(translate(0, -0.25, 0), scale(3.2, 0.25, 1.4)), bodyColor);
    // cabin lower
    part(
      parts,
      mult(translate(-0.4, 0.35, 0), scale(1.4, 0.6, 1.3)),
      bodyColor
    );
    // windshield
    part(
      parts,
      mult(mult(translate(-1.1, 0.9, 0), rotateZ(-20)), scale(0.1, 0.6, 1.2)),
      glass
    );
    // roof
    part(
      parts,
      mult(translate(-0.8, 1.0, 0), scale(1.0, 0.15, 1.2)),
      bodyColor
    );
    // truck bed sides and floor
    part(parts, mult(translate(0.9, 0.35, 0), scale(1.8, 0.6, 1.3)), bedColor);
    part(
      parts,
      mult(translate(1.9, 0.55, 0), scale(0.08, 0.7, 1.25)),
      bedColor
    ); // tailgate

    // front bumper
    part(parts, mult(translate(-1.9, 0.0, 0), scale(0.15, 0.2, 1.4)), rimCol);
    // headlights
    part(
      parts,
      mult(translate(-1.8, 0.25, 0.45), scale(0.06, 0.08, 0.2)),
      rimCol
    );
    part(
      parts,
      mult(translate(-1.8, 0.25, -0.45), scale(0.06, 0.08, 0.2)),
      rimCol
    );

    // wheels (front left/right, rear left/right)
    const wheels = [
      makeWheel(-1.2, -0.55, 0.7, 0.45, 0.35, tireCol),
      makeWheel(-1.2, -0.55, -0.7, 0.45, 0.35, tireCol),
      makeWheel(1.2, -0.55, 0.7, 0.5, 0.35, tireCol),
      makeWheel(1.2, -0.55, -0.7, 0.5, 0.35, tireCol),
    ];
    wheels.forEach((w) => parts.push(w));

    // wheel rims (inner smaller cubes)
    const rims = [
      { tx: -1.2, tz: 0.7 },
      { tx: -1.2, tz: -0.7 },
      { tx: 1.2, tz: 0.7 },
      { tx: 1.2, tz: -0.7 },
    ];
    rims.forEach((r) =>
      part(
        parts,
        mult(translate(r.tx, -0.55, r.tz), scale(0.22, 0.22, 0.18)),
        rimCol
      )
    );

    return parts;
  }
  window.createPickupModel = createPickupModel;
})();
