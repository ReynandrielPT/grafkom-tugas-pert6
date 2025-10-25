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
  let t = 0; // seconds accumulator for simulation
  let speed = 2; // sim speed multiplier
  let acRotate = false; // reuse id for rotate toggle
  let acRotateSpeed = 30; // degrees per second
  let clkRealTime = false;

  // Start from a pleasing time when not in real-time mode
  const simStartSec = 10 * 3600 + 10 * 60 + 0; // 10:10:00

  function fallbackCreateClockModel() {
    // Minimal square clock if clock.js isn't loaded
    const parts = [];
    const caseCol = vec4(0.93, 0.95, 0.98, 1);
    const faceCol = vec4(0.98, 0.985, 0.99, 1);
    const tickCol = vec4(0.18, 0.2, 0.22, 1);
    const secondCol = vec4(0.85, 0.1, 0.12, 1);

    const C = translate(0, 1.25, -0.9);
    const w = 2.6,
      h = 2.6,
      d = 0.5,
      faceT = 0.05;
    const frontZ = d / 2 - faceT / 2;
    // wall
    parts.push({
      transform: mult(translate(0, 0, -1.4), scale(12, 7, 0.2)),
      color: vec4(0.92, 0.93, 0.96, 1),
      tag: "wall",
    });
    // body
    parts.push({ transform: mult(C, scale(w, h, d)), color: caseCol });
    // face
    parts.push({
      transform: mult(
        C,
        mult(translate(0, 0, frontZ), scale(w * 0.92, h * 0.92, faceT))
      ),
      color: faceCol,
    });
    // hour ticks
    const tickL = 0.18 * h,
      tickW = 0.04 * w,
      tickD = 0.06;
    const tickR = Math.min(w, h) * 0.42;
    for (let i = 0; i < 12; i++) {
      const Rz = rotateZ(i * 30);
      const T = translate(0, tickR, frontZ + faceT / 2 + tickD / 2);
      const S = scale(tickW, tickL, tickD);
      parts.push({
        transform: mult(C, mult(Rz, mult(T, S))),
        color: tickCol,
        tag: "clockTick",
      });
    }
    // hands
    const handDepth = 0.06;
    const hubZ = frontZ + faceT / 2 + handDepth / 2 + 0.001;
    const pivot = [0, 1.25, -0.9 + hubZ];
    const hrLen = 0.55 * h,
      hrW = 0.08 * w;
    let hourHand = mult(
      translate(0, hrLen / 2 - 0.05 * h, hubZ),
      scale(hrW, hrLen, handDepth)
    );
    hourHand = mult(C, hourHand);
    parts.push({
      transform: hourHand,
      color: tickCol,
      tag: "clockHandHour",
      pivot,
    });
    const mnLen = 0.75 * h,
      mnW = 0.06 * w;
    let minuteHand = mult(
      translate(0, mnLen / 2 - 0.05 * h, hubZ),
      scale(mnW, mnLen, handDepth)
    );
    minuteHand = mult(C, minuteHand);
    parts.push({
      transform: minuteHand,
      color: tickCol,
      tag: "clockHandMinute",
      pivot,
    });
    const scLen = 0.8 * h,
      scW = 0.03 * w;
    let secondHand = mult(
      translate(0, scLen / 2 - 0.05 * h, hubZ),
      scale(scW, scLen, handDepth)
    );
    secondHand = mult(C, secondHand);
    parts.push({
      transform: secondHand,
      color: secondCol,
      tag: "clockHandSecond",
      pivot,
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

    // Model rotation controls (reuse id names)
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

    // Real-time toggle
    const rt = document.getElementById("clkRealTime");
    if (rt) {
      const set = () => (clkRealTime = !!rt.checked);
      rt.onchange = set;
      set();
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

    const parts = window.createClockModel
      ? window.createClockModel({})
      : fallbackCreateClockModel();
    const spinAngle = acRotate ? t * acRotateSpeed : 0;
    const Rspin = rotateY(spinAngle);

    // Compute current time components
    let hours, minutes, seconds;
    if (clkRealTime) {
      const now = new Date();
      hours = now.getHours() % 12;
      minutes = now.getMinutes();
      seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    } else {
      const curr = simStartSec + t;
      hours = Math.floor(curr / 3600) % 12;
      minutes = Math.floor(curr / 60) % 60;
      seconds = curr % 60;
    }

    const secDeg = -6 * (seconds % 60);
    const minDeg = -6 * (minutes + seconds / 60);
    const hourDeg = -30 * (hours + minutes / 60 + seconds / 3600);

    for (let i = 0; i < parts.length; i++) {
      let M = mult(Rspin, parts[i].transform);
      if (parts[i].pivot && parts[i].tag) {
        let ang = null;
        if (parts[i].tag === "clockHandHour") ang = hourDeg;
        else if (parts[i].tag === "clockHandMinute") ang = minDeg;
        else if (parts[i].tag === "clockHandSecond") ang = secDeg;
        if (ang !== null) {
          const pv = parts[i].pivot;
          const Tp = translate(pv[0], pv[1], pv[2]);
          const Tm = translate(-pv[0], -pv[1], -pv[2]);
          M = mult(Tp, mult(rotateZ(ang), mult(Tm, M)));
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
