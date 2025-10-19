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
  let rotation = { x: -10, y: 30 };
  let cameraDistance = 18;
  let isDragging = false,
    lastX = 0,
    lastY = 0;
  let currentProjection = "perspective";
  let currentLighting = "fragment";
  let playing = false;
  let t = 0;
  let speed = 2;

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
      cameraDistance = Math.max(6, Math.min(60, cameraDistance));
    };
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
        ? perspective(30, aspect, 0.2, 500)
        : ortho(-20 * aspect, 20 * aspect, -20, 20, 0.2, 500);
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
    const lightPos = vec4(6, 12, 12, 1);
    gl.uniform4fv(lightPosLoc, lightPos);
    gl.uniform1f(shininessLoc, shininess);
    gl.uniform1f(lightIntensityLoc, intensity);
    const lightAmbient = vec4(0.2, 0.2, 0.2, 1),
      lightDiffuse = vec4(1, 1, 1, 1),
      lightSpecular = vec4(1, 1, 1, 1);

    if (playing) {
      t += 0.016 * speed;
    }

    // Forward distance traveled and wheel angular speed
    const v = speed * 2.0; // units/sec
    const distance = t * v;

    // Environment moves opposite to car to simulate motion
    const env = window.createL300Environment({ offsetX: distance });
    for (let i = 0; i < env.length; i++) {
      const col = env[i].color || vec4(0.3, 0.3, 0.32, 1);
      const M = env[i].transform;
      const MV = mult(V, M);
      const nMat = normalMatrix(MV, true);
      gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(MV));
      gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(nMat));
      const amb = mult(lightAmbient, scale(0.2, col));
      const dif = mult(lightDiffuse, col);
      const spec = mult(lightSpecular, vec4(1, 1, 1, 1));
      gl.uniform4fv(ambientProdLoc, flatten(amb));
      gl.uniform4fv(diffuseProdLoc, flatten(dif));
      gl.uniform4fv(specularProdLoc, flatten(spec));
      gl.drawArrays(gl.TRIANGLES, 0, numPositions);
    }

    const parts = window.createL300Model({ time: t, speed });
    for (let i = 0; i < parts.length; i++) {
      const col = parts[i].color || vec4(0.3, 0.3, 0.32, 1);
      let M = parts[i].transform;
      // Animate wheel rotation first (about local pivot), before overall car translation
      if (parts[i].tag && parts[i].tag.startsWith("wheel")) {
        const pivot = parts[i].pivot;
        const axis = parts[i].orientAxis || "Z";
        if (pivot && axis === "Z") {
          // spin rate proportional to linear velocity and wheel radius (~0.55)
          const wheelR = 0.55;
          const omega = (v / (2 * Math.PI * wheelR)) * 360.0; // deg/sec
          const angle = (t * omega) % 360.0;
          const Tp = translate(pivot[0], pivot[1], pivot[2]);
          const Tm = translate(-pivot[0], -pivot[1], -pivot[2]);
          M = mult(Tp, mult(rotateZ(angle), mult(Tm, M)));
        }
      }
      // Move entire car forward along +X after wheel rotation
      M = mult(translate(distance, 0, 0), M);
      const MV = mult(V, M);
      const nMat = normalMatrix(MV, true);
      gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(MV));
      gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(nMat));
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
