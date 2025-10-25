"use strict";

function runApp_ClockViewer(
  projectionType = "perspective",
  lightingMode = "fragment"
) {
  let canvas, gl, program, numPositions;
  let positions = [],
    normals = [],
    texCoords = [];
  let modelViewMatrix, projectionMatrix;
  let modelViewMatrixLoc, projectionMatrixLoc;
  let normalMatrixLoc,
    lightPosLoc,
    shininessLoc,
    ambientProdLoc,
    diffuseProdLoc,
    specularProdLoc,
    lightIntensityLoc,
    ambientIntensityLoc,
    diffuseIntensityLoc,
    specularIntensityLoc,
    lightingEnabledLoc,
    baseColorLoc;

  let rotation = { x: -8, y: 28 },
    cameraDistance = 9.0;
  let isDragging = false,
    lastMouseX,
    lastMouseY;
  let currentProjectionType = projectionType;
  let currentLightingMode = lightingMode;
  let animationId = -1;
  let lastTime = 0;

  let playing = false;
  let t_clock = 0;
  let t_model = 0;
  let speed = 2;
  let acRotate = false;
  let acRotateSpeed = 30;
  let clkRealTime = false;
  const simStartSec = 10 * 3600 + 10 * 60 + 0;

  let textureEnabled = 0.0;
  let textureSelect = "none";
  let textureObject = null;
  let textureSamplerLoc = null;
  let textureEnabledLoc = null;

  let materialColors = {};

  let light = {
    ambient: vec4(0.2, 0.2, 0.2, 1.0),
    diffuse: vec4(1.0, 1.0, 1.0, 1.0),
    specular: vec4(1.0, 1.0, 1.0, 1.0),
    position: vec4(2.0, 3.0, 4.0, 1.0),
    shininess: 50.0,
    intensity: 1.0,
    ambientIntensity: 1.0,
    diffuseIntensity: 1.0,
    specularIntensity: 1.0,
    enabled: true,
  };

  function fallbackCreateClockModel() {
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
    parts.push({
      transform: mult(translate(0, 0, -1.4), scale(12, 7, 0.2)),
      color: vec4(0.92, 0.93, 0.96, 1),
      tag: "wall",
    });
    parts.push({
      transform: mult(C, scale(w, h, d)),
      color: caseCol,
      tag: "clockRimSeg",
    });
    parts.push({
      transform: mult(
        C,
        mult(translate(0, 0, frontZ), scale(w * 0.92, h * 0.92, faceT))
      ),
      color: faceCol,
      tag: "clockFace",
    });
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
    const handDepth = 0.06;
    const hubZ = frontZ + faceT / 2 + handDepth / 2 + 0.001;
    const pivot = [0, 0, hubZ];
    const hrLen = 0.55 * h,
      hrW = 0.08 * w;
    let hourHandLocal = mult(
      translate(0, hrLen / 2 - 0.05 * h, 0),
      scale(hrW, hrLen, handDepth)
    );
    let hourHand = mult(C, mult(translate(0, 0, hubZ), hourHandLocal));
    parts.push({
      transform: hourHand,
      color: tickCol,
      tag: "clockHandHour",
      pivot,
    });
    const mnLen = 0.75 * h,
      mnW = 0.06 * w;
    let minuteHandLocal = mult(
      translate(0, mnLen / 2 - 0.05 * h, 0),
      scale(mnW, mnLen, handDepth)
    );
    let minuteHand = mult(C, mult(translate(0, 0, hubZ), minuteHandLocal));
    parts.push({
      transform: minuteHand,
      color: tickCol,
      tag: "clockHandMinute",
      pivot,
    });
    const scLen = 0.8 * h,
      scW = 0.03 * w;
    let secondHandLocal = mult(
      translate(0, scLen / 2 - 0.05 * h, 0),
      scale(scW, scLen, handDepth)
    );
    let secondHand = mult(C, mult(translate(0, 0, hubZ), secondHandLocal));
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
    const uv = [vec2(0, 0), vec2(0, 1), vec2(1, 1), vec2(1, 0)];

    function quad(a, b, c, d) {
      const idx = [a, b, c, a, c, d];
      const t1 = subtract(v[b], v[a]);
      const t2 = subtract(v[c], v[b]);
      const n = normalize(cross(t1, t2));
      const uvs = [uv[0], uv[1], uv[2], uv[0], uv[2], uv[3]];
      for (let k = 0; k < idx.length; k++) {
        positions.push(v[idx[k]]);
        normals.push(n);
        texCoords.push(uvs[k]);
      }
    }
    positions = [];
    normals = [];
    texCoords = [];
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
    numPositions = positions.length;
  }

  function createCheckerboard(size) {
    const texSize = size || 64;
    const numRows = 8,
      numCols = 8;
    const myTexels = new Uint8Array(4 * texSize * texSize);
    for (let i = 0; i < texSize; ++i) {
      for (let j = 0; j < texSize; ++j) {
        const patchY = Math.floor(i / (texSize / numRows));
        const patchX = Math.floor(j / (texSize / numCols));
        const c = patchX % 2 !== patchY % 2 ? 255 : 0;
        const k = 4 * (i * texSize + j);
        myTexels[k] = c;
        myTexels[k + 1] = c;
        myTexels[k + 2] = c;
        myTexels[k + 3] = 255;
      }
    }
    return { data: myTexels, texSize };
  }

  function createGLTextureFromImage(img) {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

  function createGLTextureFromCheckerboard(cb) {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      cb.texSize,
      cb.texSize,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      cb.data
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

  function applyTextureSelection() {
    if (textureSelect === "none") {
      textureObject = null;
      textureEnabled = 0.0;
      return;
    }
    if (textureSelect === "checkerboard") {
      const cb = createCheckerboard(128);
      textureObject = createGLTextureFromCheckerboard(cb);
      textureEnabled = 1.0;
      return;
    }
  }

  function setupGL() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) return alert("WebGL 2.0 isn't available");

    initUnitCube();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.93, 0.94, 0.98, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(
      gl,
      currentLightingMode === "vertex"
        ? "viewer-vertex-shader-vertex"
        : "viewer-vertex-shader",
      currentLightingMode === "vertex"
        ? "viewer-fragment-shader-vertex"
        : "viewer-fragment-shader"
    );
    gl.useProgram(program);

    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
    const positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    const nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    const normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    const tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);
    const texCoordLoc = gl.getAttribLocation(program, "aTexCoord");
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordLoc);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "uNormalMatrix");
    lightPosLoc = gl.getUniformLocation(program, "uLightPosition");
    shininessLoc = gl.getUniformLocation(program, "uShininess");
    ambientProdLoc = gl.getUniformLocation(program, "uAmbientProduct");
    diffuseProdLoc = gl.getUniformLocation(program, "uDiffuseProduct");
    specularProdLoc = gl.getUniformLocation(program, "uSpecularProduct");
    lightIntensityLoc = gl.getUniformLocation(program, "uLightIntensity");
    ambientIntensityLoc = gl.getUniformLocation(program, "uAmbientIntensity");
    diffuseIntensityLoc = gl.getUniformLocation(program, "uDiffuseIntensity");
    specularIntensityLoc = gl.getUniformLocation(program, "uSpecularIntensity");
    lightingEnabledLoc = gl.getUniformLocation(program, "uLightingEnabled");
    baseColorLoc = gl.getUniformLocation(program, "uBaseColor");
    textureSamplerLoc = gl.getUniformLocation(program, "uTextureMap");
    textureEnabledLoc = gl.getUniformLocation(program, "uTextureEnabled");

    if (textureSamplerLoc) {
      gl.uniform1i(textureSamplerLoc, 0);
    }
  }

  function hookUI() {
    canvas.onmousedown = (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };
    document.onmouseup = () => (isDragging = false);
    document.onmousemove = (e) => {
      if (isDragging) {
        rotation.y += (e.clientX - lastMouseX) * 0.5;
        rotation.x += (e.clientY - lastMouseY) * 0.5;
        rotation.x = Math.max(-89, Math.min(89, rotation.x));
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    };
    canvas.onwheel = (e) => {
      e.preventDefault();
      cameraDistance += e.deltaY * 0.02;
      cameraDistance = Math.max(4.0, Math.min(25.0, cameraDistance));
    };

    document.getElementById("btnPlay").onclick = () => (playing = true);
    document.getElementById("btnPause").onclick = () => (playing = false);
    document.getElementById("btnStop").onclick = () => {
      playing = false;
      t_clock = 0;
      t_model = 0;
    };
    document.getElementById("btnReset").onclick = () => {
      t_clock = 0;
      t_model = 0;
    };
    document.getElementById("speed").oninput = (e) =>
      (speed = parseFloat(e.target.value));
    document.getElementById("acRotate").onchange = (e) =>
      (acRotate = !!e.target.checked);
    document.getElementById("acRotateSpeed").oninput = (e) =>
      (acRotateSpeed = parseFloat(e.target.value));

    const rt = document.getElementById("clkRealTime");
    if (rt) {
      const set = () => (clkRealTime = !!rt.checked);
      rt.onchange = set;
      set();
    }

    function hexToVec4(hex) {
      const h = hex.replace("#", "");
      const r = parseInt(h.substring(0, 2), 16) / 255;
      const g = parseInt(h.substring(2, 4), 16) / 255;
      const b = parseInt(h.substring(4, 6), 16) / 255;
      return vec4(r, g, b, 1.0);
    }

    const ambientInput = document.getElementById("ambientColor");
    const diffuseInput = document.getElementById("diffuseColor");
    const specularInput = document.getElementById("specularColor");
    const shininessInput = document.getElementById("shininess");
    const lightIntensityInput = document.getElementById("lightIntensity");
    const lightIntensityValue = document.getElementById("lightIntensityValue");
    const ambientIntensityInput = document.getElementById("ambientIntensity");
    const diffuseIntensityInput = document.getElementById("diffuseIntensity");
    const specularIntensityInput = document.getElementById("specularIntensity");
    const ambientIntensityValue = document.getElementById(
      "ambientIntensityValue"
    );
    const diffuseIntensityValue = document.getElementById(
      "diffuseIntensityValue"
    );
    const specularIntensityValue = document.getElementById(
      "specularIntensityValue"
    );
    const lightEnabledInput = document.getElementById("lightEnabled");
    const lightX = document.getElementById("lightX");
    const lightY = document.getElementById("lightY");
    const lightZ = document.getElementById("lightZ");

    if (ambientInput)
      ambientInput.oninput = (e) => (light.ambient = hexToVec4(e.target.value));
    if (diffuseInput)
      diffuseInput.oninput = (e) => (light.diffuse = hexToVec4(e.target.value));
    if (specularInput)
      specularInput.oninput = (e) =>
        (light.specular = hexToVec4(e.target.value));
    if (shininessInput)
      shininessInput.oninput = (e) =>
        (light.shininess = parseFloat(e.target.value));

    if (lightIntensityInput) {
      const update = (e) => {
        light.intensity = parseFloat(lightIntensityInput.value);
        if (lightIntensityValue)
          lightIntensityValue.textContent = light.intensity.toFixed(2);
      };
      lightIntensityInput.oninput = update;
      update();
    }
    if (ambientIntensityInput) {
      const update = () => {
        light.ambientIntensity = parseFloat(ambientIntensityInput.value);
        if (ambientIntensityValue)
          ambientIntensityValue.textContent = light.ambientIntensity.toFixed(2);
      };
      ambientIntensityInput.oninput = update;
      update();
    }
    if (diffuseIntensityInput) {
      const update = () => {
        light.diffuseIntensity = parseFloat(diffuseIntensityInput.value);
        if (diffuseIntensityValue)
          diffuseIntensityValue.textContent = light.diffuseIntensity.toFixed(2);
      };
      diffuseIntensityInput.oninput = update;
      update();
    }
    if (specularIntensityInput) {
      const update = () => {
        light.specularIntensity = parseFloat(specularIntensityInput.value);
        if (specularIntensityValue)
          specularIntensityValue.textContent =
            light.specularIntensity.toFixed(2);
      };
      specularIntensityInput.oninput = update;
      update();
    }

    if (lightEnabledInput) {
      const update = () => (light.enabled = !!lightEnabledInput.checked);
      lightEnabledInput.onchange = update;
      update();
    }
    function updateLightPos() {
      light.position = vec4(
        parseFloat(lightX.value),
        parseFloat(lightY.value),
        parseFloat(lightZ.value),
        1.0
      );
    }
    if (lightX && lightY && lightZ) {
      lightX.oninput = updateLightPos;
      lightY.oninput = updateLightPos;
      lightZ.oninput = updateLightPos;
      updateLightPos();
    }

    const colorInputs = {
      wall: document.getElementById("colorWall"),
      rim: document.getElementById("colorRim"),
      face: document.getElementById("colorFace"),
      ticks: document.getElementById("colorTicks"),
      hands: document.getElementById("colorHands"),
      secondHand: document.getElementById("colorSecondHand"),
      default: document.getElementById("colorDefault"),
    };

    for (const key in colorInputs) {
      const input = colorInputs[key];
      if (input) {
        const update = () => {
          materialColors[key] = hexToVec4(input.value);
        };
        input.oninput = update;
        update();
      } else {
        materialColors[key] = vec4(1.0, 1.0, 1.0, 1.0);
      }
    }

    const textureEnabledInput = document.getElementById("textureEnabled");
    const textureSelectInput = document.getElementById("textureSelect");
    const textureFileRow = document.getElementById("textureFileRow");
    const textureFileInput = document.getElementById("textureFile");
    const textureDropzone = document.getElementById("textureDropzone");
    const texturePreview = document.getElementById("texturePreview");
    const textureFileName = document.getElementById("textureFileName");
    const textureFileInfo = document.getElementById("textureFileInfo");
    const textureClear = document.getElementById("textureClear");

    function setPreview(img, name, size) {
      if (texturePreview) {
        texturePreview.src = img || "";
        texturePreview.style.display = img ? "block" : "none";
      }
      if (textureFileName)
        textureFileName.textContent = name || "No file selected";
      if (textureFileInfo)
        textureFileInfo.textContent = size ? size + " KB" : "";
    }

    function handleFile(file) {
      if (!file || !file.type || !file.type.startsWith("image/")) {
        alert("Please select an image file.");
        return;
      }
      const sizeKB = Math.round(file.size / 1024);
      const reader = new FileReader();
      reader.onload = function (evt) {
        const dataUrl = evt.target.result;
        const img = new Image();
        img.onload = function () {
          textureObject = createGLTextureFromImage(img);
          textureEnabled = 1.0;
          if (textureEnabledInput) textureEnabledInput.checked = true;
          setPreview(dataUrl, file.name, sizeKB.toString());
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }

    if (textureEnabledInput) {
      textureEnabledInput.onchange = function () {
        textureEnabled = textureEnabledInput.checked ? 1.0 : 0.0;
        if (textureEnabled === 1.0 && textureSelect === "none") {
          textureSelect = "checkerboard";
          if (textureSelectInput) textureSelectInput.value = "checkerboard";
          applyTextureSelection();
        }
      };
    }
    if (textureSelectInput) {
      textureSelectInput.onchange = function () {
        textureSelect = textureSelectInput.value;
        if (textureFileRow)
          textureFileRow.style.display =
            textureSelect === "custom" ? "grid" : "none";
        if (textureSelect !== "custom") {
          setPreview(null, "No file selected", "");
        }
        applyTextureSelection();
      };
      textureSelect = textureSelectInput.value || "none";
      if (textureFileRow)
        textureFileRow.style.display =
          textureSelect === "custom" ? "grid" : "none";
    }
    if (textureFileInput) {
      textureFileInput.onchange = function () {
        const file = textureFileInput.files && textureFileInput.files[0];
        handleFile(file);
      };
    }
    if (textureDropzone) {
      textureDropzone.addEventListener("click", function () {
        if (textureFileInput) textureFileInput.click();
      });
      ["dragenter", "dragover"].forEach((evt) => {
        textureDropzone.addEventListener(evt, (e) => e.preventDefault());
      });
      ["dragleave", "drop"].forEach((evt) => {
        textureDropzone.addEventListener(evt, (e) => e.preventDefault());
      });
      textureDropzone.addEventListener("drop", function (e) {
        const file = e.dataTransfer && e.dataTransfer.files[0];
        if (file) handleFile(file);
      });
    }
    if (textureClear) {
      textureClear.onclick = function () {
        textureObject = null;
        if (textureEnabledInput) textureEnabledInput.checked = false;
        textureEnabled = 0.0;
        setPreview(null, "No file selected", "");
        if (textureFileInput) textureFileInput.value = "";
      };
    }
  }

  function setCameraPosition(preset) {
    switch (preset) {
      case "front":
        rotation.x = 0;
        rotation.y = 0;
        cameraDistance = 9.0;
        break;
      case "side":
        rotation.x = 0;
        rotation.y = 90;
        cameraDistance = 9.0;
        break;
      case "top":
        rotation.x = -90;
        rotation.y = 0;
        cameraDistance = 9.0;
        break;
      case "isometric":
        rotation.x = -30;
        rotation.y = 45;
        cameraDistance = 9.0;
        break;
      default:
        rotation.x = -8;
        rotation.y = 28;
        cameraDistance = 9.0;
    }
  }

  function stop() {
    if (animationId !== -1) {
      cancelAnimationFrame(animationId);
      animationId = -1;
    }
  }

  function render(now) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    now = (now || 0) * 0.001;
    const deltaTime = now - lastTime;
    lastTime = now;

    const aspect = canvas.width / canvas.height;

    if (currentProjectionType === "perspective") {
      projectionMatrix = perspective(30.0, aspect, 0.2, 100.0);
    } else {
      const size = cameraDistance * 0.4;
      projectionMatrix = ortho(
        -size * aspect,
        size * aspect,
        -size,
        size,
        0.2,
        100.0
      );
    }
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

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

    if (playing) {
      t_clock += deltaTime * speed;
    }

    let spinAngle = 0.0;
    if (acRotate) {
      t_model += deltaTime;
      spinAngle = t_model * acRotateSpeed;
    } else {
      t_model = 0.0;
    }

    gl.uniform4fv(lightPosLoc, light.position);
    gl.uniform1f(shininessLoc, light.shininess);
    gl.uniform1f(lightIntensityLoc, light.intensity);
    gl.uniform1f(ambientIntensityLoc, light.ambientIntensity);
    gl.uniform1f(diffuseIntensityLoc, light.diffuseIntensity);
    gl.uniform1f(specularIntensityLoc, light.specularIntensity);
    gl.uniform1f(lightingEnabledLoc, light.enabled ? 1.0 : 0.0);

    if (textureEnabledLoc) {
      gl.uniform1f(textureEnabledLoc, textureEnabled);
    }
    if (textureEnabled > 0.0 && textureObject && textureSamplerLoc) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textureObject);
      gl.uniform1i(textureSamplerLoc, 0);
    }

    const objectParts = window.createClockModel
      ? window.createClockModel({})
      : fallbackCreateClockModel();

    const Rspin = rotateY(spinAngle);

    let hours, minutes, seconds;
    if (clkRealTime) {
      const now = new Date();
      hours = now.getHours() % 12;
      minutes = now.getMinutes();
      seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    } else {
      const curr = simStartSec + t_clock;
      hours = Math.floor(curr / 3600) % 12;
      minutes = Math.floor(curr / 60) % 60;
      seconds = curr % 60;
    }

    const secDeg = -6 * (seconds % 60);
    const minDeg = -6 * (minutes + seconds / 60);
    const hourDeg = -30 * (hours + minutes / 60 + seconds / 3600);

    for (let i = 0; i < objectParts.length; i++) {
      let M_part_base = objectParts[i].transform;
      let M_rotated = M_part_base;

      if (objectParts[i].pivot && objectParts[i].tag) {
        let ang = null;
        if (objectParts[i].tag === "clockHandHour") ang = hourDeg;
        else if (objectParts[i].tag === "clockHandMinute") ang = minDeg;
        else if (objectParts[i].tag === "clockHandSecond") ang = secDeg;

        if (ang !== null) {
          const pv = objectParts[i].pivot;
          const Tp = translate(pv[0], pv[1], pv[2]);
          const Tm = translate(-pv[0], -pv[1], -pv[2]);
          M_rotated = mult(Tp, mult(rotateZ(ang), mult(Tm, M_part_base)));
        }
      }

      modelViewMatrix = mult(V, mult(Rspin, M_rotated));

      gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
      const nMat = normalMatrix(modelViewMatrix, true);
      gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(nMat));

      let finalPartColor;
      const tag = objectParts[i].tag;

      if (tag === "wall") {
        finalPartColor = materialColors.wall;
      } else if (tag === "clockRimSeg" || tag === "innerRimCol") {
        finalPartColor = materialColors.rim;
      } else if (tag === "clockFace") {
        finalPartColor = materialColors.face;
      } else if (
        tag === "clockTick" ||
        tag === "clockMinuteTick" ||
        tag === "clockNumber"
      ) {
        finalPartColor = materialColors.ticks;
      } else if (tag === "clockHandHour" || tag === "clockHandMinute") {
        finalPartColor = materialColors.hands;
      } else if (tag === "clockHandSecond") {
        finalPartColor = materialColors.secondHand;
      } else {
        finalPartColor = mult(materialColors.default, objectParts[i].color);
      }

      const materialDiffuse = finalPartColor;
      const materialAmbient = scale(0.2, materialDiffuse);
      const materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);

      const ambientProduct = mult(light.ambient, materialAmbient);
      const diffuseProduct = mult(light.diffuse, materialDiffuse);
      const specularProduct = mult(light.specular, materialSpecular);
      gl.uniform4fv(ambientProdLoc, flatten(ambientProduct));
      gl.uniform4fv(diffuseProdLoc, flatten(diffuseProduct));
      gl.uniform4fv(specularProdLoc, flatten(specularProduct));
      gl.uniform4fv(baseColorLoc, flatten(materialDiffuse));

      gl.drawArrays(gl.TRIANGLES, 0, numPositions);
    }
    animationId = requestAnimationFrame(render);
  }

  setupGL();
  hookUI();
  applyTextureSelection();
  render();

  return {
    stop: stop,
    setCameraPosition: setCameraPosition,
  };
}

window.runApp_ClockViewer = runApp_ClockViewer;
