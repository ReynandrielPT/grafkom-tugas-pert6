"use strict";

(function () {
  let canvas, gl, program;
  let positions = [],
    normals = [];
  let numPositions = 0;
  let modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
  let lightPosLoc,
    shininessLoc,
    ambientProdLoc,
    diffuseProdLoc,
    specularProdLoc,
    lightIntensityLoc;
  let rotation = { x: -8, y: 28 };
  let cameraDistance = 9;
  let isDragging = false,
    lastX = 0,
    lastY = 0;
  let currentProjection = "perspective";
  let currentLighting = "fragment";
  let playing = false;
  let t = 0;
  let speed = 2;
  let acSwing = false;
  // UI angle domain (degrees): 100..225, where 225 ~ fully closed upward, 100 ~ fully open
  let acOpenDeg = 225;
  let acRotate = false;
  let acRotateSpeed = 30; // degrees per second

  function fallbackCreateAcModel() {
    const parts = [];
    const wallCol = vec4(0.92, 0.93, 0.96, 1);
    const bodyCol = vec4(0.95, 0.96, 0.98, 1);
    const fasciaCol = vec4(0.96, 0.97, 0.99, 1);
    // wall backplate
    parts.push({
      transform: mult(translate(0, 0, -1.4), scale(12, 7, 0.2)),
      color: wallCol,
      tag: "wall",
    });
    // simple AC block
    const C = translate(0, 1.2, -0.9);
    parts.push({
      transform: mult(C, mult(translate(0, 0, -0.25), scale(4.2, 1.0, 0.5))),
      color: bodyCol,
    });
    parts.push({
      transform: mult(C, mult(translate(0, 0.15, 0.2), scale(4.0, 0.5, 0.06))),
      color: fasciaCol,
    });
    return parts;
  }

  function initUnitCube() {
    const v = [
      vec4(-0.5, -0.5, 0.5, 1),
      vec4(-0.5, 0.5, 0.5, 1),
      vec4(0.5, 0.5, 0.5, 1),
      vec4(0.5, -0.5, 0.5, 1),
      vec4(-0.5, -0.5, -0.5, 1),
      vec4(-0.5, 0.5, -0.5, 1),
      vec4(0.5, 0.5, -0.5, 1),
      vec4(0.5, -0.5, -0.5, 1),
    ];
    function quad(a, b, c, d) {
      const idx = [a, b, c, a, c, d];
      const t1 = subtract(v[b], v[a]);
      const t2 = subtract(v[c], v[b]);
      const n = normalize(cross(t1, t2));
      for (let k = 0; k < idx.length; k++) {
        positions.push(v[idx[k]]);
        normals.push(n);
      }
    }
    positions = [];
    normals = [];
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
    numPositions = positions.length;
  }

  function setupGL() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) {
      alert("WebGL 2.0 isn't available");
      return;
    }
    initUnitCube();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.93, 0.94, 0.98, 1);
    gl.enable(gl.DEPTH_TEST);
    program = initShaders(
      gl,
      currentLighting === "vertex"
        ? "viewer-vertex-shader-vertex"
        : "viewer-vertex-shader",
      currentLighting === "vertex"
        ? "viewer-fragment-shader-vertex"
        : "viewer-fragment-shader"
    );
    gl.useProgram(program);
    const vbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPos, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPos);
    const nbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nbuf);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    const aNor = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNor);
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "uNormalMatrix");
    lightPosLoc = gl.getUniformLocation(program, "uLightPosition");
    shininessLoc = gl.getUniformLocation(program, "uShininess");
    ambientProdLoc = gl.getUniformLocation(program, "uAmbientProduct");
    diffuseProdLoc = gl.getUniformLocation(program, "uDiffuseProduct");
    specularProdLoc = gl.getUniformLocation(program, "uSpecularProduct");
    lightIntensityLoc = gl.getUniformLocation(program, "uLightIntensity");
    hookUI();
    requestAnimationFrame(render);
  }

  function hookUI() {
    // Projection and lighting mode toggles
    const proj = [...document.querySelectorAll('input[name="proj"]')];
    proj.forEach((r) =>
      r.addEventListener("change", () => (currentProjection = r.value))
    );
    const light = [...document.querySelectorAll('input[name="light"]')];
    light.forEach((r) =>
      r.addEventListener("change", () => {
        currentLighting = r.value;
        setupGL();
      })
    );

    // Playback and basic controls
    const intensity = document.getElementById("lightIntensity");
    const intVal = document.getElementById("intVal");
    const updI = () => {
      intVal.textContent = parseFloat(intensity.value).toFixed(2);
    };
    intensity.oninput = updI;
    updI();
    document.getElementById("shininess").oninput = () => {};
    document.getElementById("btnPlay").onclick = () => {
      playing = true;
    };
    document.getElementById("btnPause").onclick = () => {
      playing = false;
    };
    document.getElementById("btnStop").onclick = () => {
      playing = false;
      t = 0;
    };
    document.getElementById("btnReset").onclick = () => {
      t = 0;
    };
    const spd = document.getElementById("speed");
    spd.oninput = () => {
      speed = parseFloat(spd.value);
    };

    // Swing and open
    const swing = document.getElementById("acSwing");
    if (swing) {
      const set = () => (acSwing = !!swing.checked);
      swing.onchange = set;
      set();
    }
    const open = document.getElementById("acOpen");
    const openVal = document.getElementById("acOpenVal");
    if (open && openVal) {
      const set = () => {
        acOpenDeg = parseFloat(open.value) || 0;
        openVal.textContent = Math.round(acOpenDeg);
      };
      open.oninput = set;
      set();
    }

    // Orbit camera gestures
    canvas.onmousedown = (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    document.onmouseup = () => {
      isDragging = false;
    };
    document.onmousemove = (e) => {
      if (isDragging) {
        rotation.y += (e.clientX - lastX) * 0.5;
        rotation.x += (e.clientY - lastY) * 0.5;
        rotation.x = Math.max(-89, Math.min(89, rotation.x));
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    canvas.onwheel = (e) => {
      e.preventDefault();
      cameraDistance += e.deltaY * 0.02;
      cameraDistance = Math.max(4, Math.min(30, cameraDistance));
    };

    // Model rotation controls
    const rotChk = document.getElementById("acRotate");
    const rotSpd = document.getElementById("acRotateSpeed");
    if (rotChk) {
      const set = () => (acRotate = !!rotChk.checked);
      rotChk.onchange = set;
      set();
    }
    if (rotSpd) {
      rotSpd.oninput = () => (acRotateSpeed = parseFloat(rotSpd.value) || 0);
    }
  }

  function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const intensity = parseFloat(
      document.getElementById("lightIntensity").value
    );
    const shininess = parseFloat(document.getElementById("shininess").value);
    const aspect = canvas.width / canvas.height;
    const P =
      currentProjection === "perspective"
        ? perspective(30, aspect, 0.2, 200)
        : ortho(-8 * aspect, 8 * aspect, -8, 8, 0.2, 200);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(P));
    const eye = vec3(
      cameraDistance *
        Math.sin(radians(rotation.y)) *
        Math.cos(radians(rotation.x)),
      cameraDistance * Math.sin(radians(rotation.x)),
      cameraDistance *
        Math.cos(radians(rotation.y)) *
        Math.cos(radians(rotation.x))
    );
    const V = lookAt(eye, vec3(0, 0.5, 0), vec3(0, 1, 0));
    const lightPos = vec4(4, 6, 8, 1);
    gl.uniform4fv(lightPosLoc, lightPos);
    gl.uniform1f(shininessLoc, shininess);
    gl.uniform1f(lightIntensityLoc, intensity);
    const lightAmbient = vec4(0.2, 0.2, 0.2, 1),
      lightDiffuse = vec4(1, 1, 1, 1),
      lightSpecular = vec4(1, 1, 1, 1);

    if (playing) {
      t += 0.016 * speed;
    }

    const parts = window.createAcModel
      ? window.createAcModel({})
      : fallbackCreateAcModel();
    const spinAngle = acRotate ? t * acRotateSpeed : 0;
    const Rspin = rotateY(spinAngle);
    for (let i = 0; i < parts.length; i++) {
      let M = mult(Rspin, parts[i].transform);
      if (parts[i].tag === "acLouver") {
        const pivot = parts[i].pivot;
        if (pivot) {
          // UI degree domain [100..225]: 225 = closed (up), 100 = open (down)
          let uiDeg;
          if (acSwing) {
            const minDeg = 100,
              maxDeg = Math.max(100, Math.min(225, acOpenDeg));
            // Oscillate between min and max
            const mid = 0.5 * (minDeg + maxDeg);
            const amp = 0.5 * (maxDeg - minDeg);
            uiDeg = mid + amp * Math.sin(t * 2.0);
          } else {
            uiDeg = acOpenDeg;
          }
          uiDeg = Math.max(100, Math.min(225, uiDeg));
          // Map UI to rotation: f=1 (open) at 100, f=0 (closed) at 225
          const f = (225 - uiDeg) / (225 - 100);
          const angleX = 90 * (f - 1); // -90 (closed) .. 0 (open)
          const Tp = translate(pivot[0], pivot[1], pivot[2]);
          const Tm = translate(-pivot[0], -pivot[1], -pivot[2]);
          M = mult(Tp, mult(rotateX(angleX), mult(Tm, M)));
        }
      }
      const MV = mult(V, M);
      const nMat = normalMatrix(MV, true);
      gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(MV));
      gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(nMat));
      const col = parts[i].color || vec4(0.85, 0.88, 0.92, 1);
      const amb = mult(lightAmbient, scale(0.2, col));
      const dif = mult(lightDiffuse, col);
      const spec = mult(lightSpecular, vec4(1, 1, 1, 1));
      gl.uniform4fv(ambientProdLoc, flatten(amb));
      gl.uniform4fv(diffuseProdLoc, flatten(dif));
      gl.uniform4fv(specularProdLoc, flatten(spec));
      gl.drawArrays(gl.TRIANGLES, 0, numPositions);
    }

    requestAnimationFrame(render);
  }

  window.addEventListener("load", setupGL);
})();
