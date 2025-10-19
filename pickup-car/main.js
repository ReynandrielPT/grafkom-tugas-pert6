"use strict";

// PC Desktop Viewer (WebGL2) with animated CPU fan
(function () {
  let canvas, gl, program;
  let positions = [],
    normals = [],
    indices = [];
  let numPositions = 0,
    numIndices = 0;
  let modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
  let lightPosLoc,
    shininessLoc,
    ambientProdLoc,
    diffuseProdLoc,
    specularProdLoc,
    lightIntensityLoc;
  let rotation = { x: -15, y: 35 };
  let cameraDistance = 12;
  let isDragging = false,
    lastX = 0,
    lastY = 0;
  let currentProjection = "perspective";
  let currentLighting = "fragment";
  let fanLightColor = vec4(0.13, 0.83, 0.93, 1); // default from UI
  let panelOpen = false; // UI: open/close right glass panel
  let cpuFanOn = false; // UI: CPU fan power

  // animation state (fan removed; keep controls harmless)
  let playing = false;
  let t = 0;
  let speed = 1; // seconds scaled

  function initUnitCube(useIBO) {
    const verts = [
      vec4(-0.5, -0.5, 0.5, 1),
      vec4(-0.5, 0.5, 0.5, 1),
      vec4(0.5, 0.5, 0.5, 1),
      vec4(0.5, -0.5, 0.5, 1),
      vec4(-0.5, -0.5, -0.5, 1),
      vec4(-0.5, 0.5, -0.5, 1),
      vec4(0.5, 0.5, -0.5, 1),
      vec4(0.5, -0.5, -0.5, 1),
    ];
    if (useIBO) {
      positions = verts;
      normals = [
        vec3(-1, -1, 1),
        vec3(-1, 1, 1),
        vec3(1, 1, 1),
        vec3(1, -1, 1),
        vec3(-1, -1, -1),
        vec3(-1, 1, -1),
        vec3(1, 1, -1),
        vec3(1, -1, -1),
      ].map(normalize);
      indices = [
        1, 0, 3, 1, 3, 2, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7, 6, 5, 1, 6, 1, 2,
        4, 5, 6, 4, 6, 7, 5, 4, 0, 5, 0, 1,
      ];
      numIndices = indices.length;
    } else {
      function quad(a, b, c, d) {
        const idx = [a, b, c, a, c, d];
        const t1 = subtract(verts[b], verts[a]);
        const t2 = subtract(verts[c], verts[b]);
        const n = normalize(cross(t1, t2));
        for (let k = 0; k < idx.length; k++) {
          positions.push(verts[idx[k]]);
          normals.push(n);
        }
      }
      positions = [];
      normals = [];
      indices = [];
      quad(1, 0, 3, 2);
      quad(2, 3, 7, 6);
      quad(3, 0, 4, 7);
      quad(6, 5, 1, 2);
      quad(4, 5, 6, 7);
      quad(5, 4, 0, 1);
      numPositions = positions.length;
    }
  }

  function setupGL() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) {
      alert("WebGL 2.0 isn't available");
      return;
    }
    initUnitCube(false);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.93, 0.94, 0.98, 1);
    gl.enable(gl.DEPTH_TEST);
    // select shader pair
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

    // buffers
    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(posLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posLoc);
    const nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    const nLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(nLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(nLoc);

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
    const projRadios = [...document.querySelectorAll('input[name="proj"]')];
    projRadios.forEach((r) =>
      r.addEventListener("change", () => {
        currentProjection = r.value;
      })
    );
    const lightRadios = [...document.querySelectorAll('input[name="light"]')];
    lightRadios.forEach((r) =>
      r.addEventListener("change", () => {
        currentLighting = r.value; // reload program for mode switch
        setupGL();
      })
    );

    const intensity = document.getElementById("lightIntensity");
    const intVal = document.getElementById("intVal");
    function updateI() {
      intVal.textContent = parseFloat(intensity.value).toFixed(2);
    }
    intensity.oninput = updateI;
    updateI();
    document.getElementById("shininess").oninput = () => {};

    const btnPlay = document.getElementById("btnPlay");
    const btnPause = document.getElementById("btnPause");
    const btnReset = document.getElementById("btnReset");
    btnPlay.onclick = () => {
      playing = true;
    };
    btnPause.onclick = () => {
      playing = false;
    };
    btnReset.onclick = () => {
      t = 0;
    };

    const spd = document.getElementById("speed");
    spd.oninput = () => {
      speed = parseFloat(spd.value);
    };
    const fanColor = document.getElementById("fanColor");
    if (fanColor) {
      fanColor.oninput = () => {
        const hex = fanColor.value.replace("#", "");
        fanLightColor = vec4(
          parseInt(hex.slice(0, 2), 16) / 255,
          parseInt(hex.slice(2, 4), 16) / 255,
          parseInt(hex.slice(4, 6), 16) / 255,
          1
        );
      };
    }
    const panelCk = document.getElementById("panelOpen");
    if (panelCk) {
      const setPanel = () => (panelOpen = !!panelCk.checked);
      panelCk.onchange = setPanel;
      setPanel();
    }

    const cpuFanCk = document.getElementById("cpuFanOn");
    if (cpuFanCk) {
      const setCpuFan = () => (cpuFanOn = !!cpuFanCk.checked);
      cpuFanCk.onchange = setCpuFan;
      setCpuFan();
    }

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
  }

  function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const intensity = parseFloat(
      document.getElementById("lightIntensity").value
    );
    const shininess = parseFloat(document.getElementById("shininess").value);

    const aspect = canvas.width / canvas.height;
    let P =
      currentProjection === "perspective"
        ? perspective(30, aspect, 0.2, 200)
        : ortho(-8 * aspect, 8 * aspect, -8, 8, 0.2, 200);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(P));

    // view
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

    // light
    const lightPos = vec4(4, 6, 8, 1);
    gl.uniform4fv(lightPosLoc, lightPos);
    gl.uniform1f(shininessLoc, shininess);
    gl.uniform1f(lightIntensityLoc, intensity);

    // material base colors
    const lightAmbient = vec4(0.2, 0.2, 0.2, 1);
    const lightDiffuse = vec4(1, 1, 1, 1);
    const lightSpecular = vec4(1, 1, 1, 1);

    // Default case color baseline (dark gray). We'll tint fan blades later per-part by rebinding colors.
    const caseColor = vec4(0.12, 0.12, 0.14, 1);
    let ambientProduct = mult(lightAmbient, scale(0.2, caseColor));
    let diffuseProduct = mult(lightDiffuse, caseColor);
    let specularProduct = mult(lightSpecular, vec4(1, 1, 1, 1));
    gl.uniform4fv(ambientProdLoc, flatten(ambientProduct));
    gl.uniform4fv(diffuseProdLoc, flatten(diffuseProduct));
    gl.uniform4fv(specularProdLoc, flatten(specularProduct));

    // animation param
    if (playing) {
      t += 0.016 * speed;
    }

    const baseT = mat4(); // PC is stationary

    // draw pc parts
    const parts = window.createPcModel({});
    for (let i = 0; i < parts.length; i++) {
      let partT = parts[i].transform;
      if (parts[i].tag === "glassRight" && panelOpen) {
        partT = mult(translate(0, 0, 0.6), partT);
      }

      // Spin CPU fan blades around their pivot when enabled, respecting orientation
      if (cpuFanOn && parts[i].tag === "cpuFanBlade") {
        const pivot = parts[i].pivot; // [x,y,z]
        const orientYDeg = parts[i].orientYDeg || 0;
        const orientXDeg = parts[i].orientXDeg || 0;
        if (pivot) {
          const angle = (t * 720.0) % 360.0; // deg/sec
          const Tp = translate(pivot[0], pivot[1], pivot[2]);
          const Tm = translate(-pivot[0], -pivot[1], -pivot[2]);
          const Oy = rotateY(orientYDeg);
          const OyInv = rotateY(-orientYDeg);
          const Ox = rotateX(orientXDeg);
          const OxInv = rotateX(-orientXDeg);
          // Tp * Oy * Ox * Rz(angle) * Ox^-1 * Oy^-1 * Tm * partT
          partT = mult(
            Tp,
            mult(
              Oy,
              mult(
                Ox,
                mult(rotateZ(angle), mult(OxInv, mult(OyInv, mult(Tm, partT))))
              )
            )
          );
        }
      }
      const M = mult(baseT, partT);
      const MV = mult(V, M);
      gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(MV));
      const nMat = normalMatrix(MV, true);
      gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(nMat));
      // per-part color
      const baseCol = parts[i].color || caseColor;
      // Optionally tint blades with fan light color
      const col =
        parts[i].tag === "cpuFanBlade"
          ? vec4(
              0.5 * baseCol[0] + 0.5 * fanLightColor[0],
              0.5 * baseCol[1] + 0.5 * fanLightColor[1],
              0.5 * baseCol[2] + 0.5 * fanLightColor[2],
              1
            )
          : baseCol;
      ambientProduct = mult(lightAmbient, scale(0.2, col));
      diffuseProduct = mult(lightDiffuse, col);
      gl.uniform4fv(ambientProdLoc, flatten(ambientProduct));
      gl.uniform4fv(diffuseProdLoc, flatten(diffuseProduct));
      gl.drawArrays(gl.TRIANGLES, 0, numPositions);
    }

    requestAnimationFrame(render);
  }

  window.addEventListener("load", setupGL);
})();
