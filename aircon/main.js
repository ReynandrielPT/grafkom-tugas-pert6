"use strict";

function runApp_ACViewer(
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

  // Camera
  let rotation = { x: -8, y: 28 },
    cameraDistance = 9.0;
  let isDragging = false,
    lastMouseX,
    lastMouseY;
  let currentProjectionType = projectionType;
  let currentLightingMode = lightingMode;
  let animationId = -1;
  let lastTime = 0; // For deltaTime calculation

  // AC Animation State
  let playing = false;
  let t = 0; // This is NOW ONLY for swing animation time
  let speed = 2; // This is NOW ONLY for swing speed
  let acOpenAngleDeg = 225; // Internal default (maps to 135 display)
  let acRotate = false;
  let acRotateSpeed = 30;
  let currentRotationAngle = 0; // This is the persistent rotation angle
  const AC_OPEN_MIN = 100;
  const AC_OPEN_MAX = 360;

  // Texture state
  let textureEnabled = 0.0;
  let textureSelect = "none";
  let textureObject = null;
  let textureSamplerLoc = null;
  let textureEnabledLoc = null;

  // Object tint
  let materialTint = vec4(1.0, 1.0, 1.0, 1.0);

  // Lighting state
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

    // Get uniform locations
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
    // Camera
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

    // Animation
    document.getElementById("btnPlay").onclick = () => (playing = true);
    document.getElementById("btnPause").onclick = () => (playing = false);
    document.getElementById("btnStop").onclick = () => {
      playing = false;
      t = 0; // Reset swing time ONLY
    };
    // This is "Swing Speed"
    document.getElementById("speed").oninput = (e) =>
      (speed = parseFloat(e.target.value));

    // This is "Rotate Model"
    document.getElementById("acRotate").onchange = (e) =>
      (acRotate = !!e.target.checked);
    // This is "Rotate Speed"
    document.getElementById("acRotateSpeed").oninput = (e) =>
      (acRotateSpeed = parseFloat(e.target.value));

    // AC Louver
    const open = document.getElementById("acOpenAngle");
    const openVal = document.getElementById("acOpenAngleVal");
    const setOpenAngle = () => {
      const displayValue = parseFloat(open.value) || 0;
      acOpenAngleDeg = 360 - displayValue;
      openVal.textContent = Math.round(displayValue);
    };
    open.oninput = setOpenAngle;
    setOpenAngle();

    // Lighting
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
    const objectColorInput = document.getElementById("objectColor");
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
    if (objectColorInput) {
      const update = () => (materialTint = hexToVec4(objectColorInput.value));
      objectColorInput.oninput = update;
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

    // Texture UI
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

  // Create the scene graph ONCE.
  const objectTreeRoot = window.createAcModel({});

  function render(now) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Delta time calculation
    now *= 0.001; // convert time to seconds
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

    // Update swing time 't' independently
    if (playing) {
      t += deltaTime * speed; // 'speed' is swing speed
    }

    // Set light uniforms (once per frame)
    gl.uniform4fv(lightPosLoc, light.position);
    gl.uniform1f(shininessLoc, light.shininess);
    gl.uniform1f(lightIntensityLoc, light.intensity);
    gl.uniform1f(ambientIntensityLoc, light.ambientIntensity);
    gl.uniform1f(diffuseIntensityLoc, light.diffuseIntensity);
    gl.uniform1f(specularIntensityLoc, light.specularIntensity);
    gl.uniform1f(lightingEnabledLoc, light.enabled ? 1.0 : 0.0);

    // Bind texture (once per frame)
    if (textureEnabledLoc) {
      gl.uniform1f(textureEnabledLoc, textureEnabled);
    }
    if (textureEnabled > 0.0 && textureObject && textureSamplerLoc) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textureObject);
      gl.uniform1i(textureSamplerLoc, 0);
    }

    // **** CHANGED: Update rotation logic ****
    if (acRotate) {
      // If checkbox is on, rotate
      currentRotationAngle += deltaTime * acRotateSpeed;
    } else {
      // If checkbox is off, instantly snap back to 0
      currentRotationAngle = 0;
    }
    const Rspin = rotateY(currentRotationAngle);
    // **** END OF CHANGE ****

    // --- Recursive Scene Graph Traversal ---
    function drawNode(node, parentMatrix) {
      let localM = node.localTransform || mat4();

      // --- HIERARCHICAL ANIMATION LOGIC ---

      // Apply global spin to the entire scene (tagged 'sceneRoot')
      if (node.tag === "sceneRoot") {
        localM = mult(Rspin, localM); // Use the independent Rspin
      }

      // Apply louver swing animation (tagged 'acLouverAssembly')
      if (node.tag === "acLouverAssembly") {
        let uiDeg;
        // The swing angle depends ONLY on 'playing' and 't'
        if (playing) {
          const maxDeg = 360; // Closed
          const minDeg = acOpenAngleDeg; // Open limit from slider
          const mid = 0.5 * (minDeg + maxDeg);
          const amp = 0.5 * (maxDeg - minDeg);
          uiDeg = mid - amp * Math.sin(t * 2.0);
        } else {
          uiDeg = 360; // Closed
        }
        uiDeg = Math.max(AC_OPEN_MIN, Math.min(AC_OPEN_MAX, uiDeg));
        const f = (AC_OPEN_MAX - uiDeg) / (AC_OPEN_MAX - AC_OPEN_MIN);
        const angleX = 180 * f - 90; // -90 (closed) .. +90 (fully open)

        // Apply rotation *after* the local transform to pivot correctly
        localM = mult(localM, rotateX(angleX));
      }
      // --- END ANIMATION LOGIC ---

      // Calculate the world matrix for this node
      const currentWorldMatrix = mult(parentMatrix, localM);

      // If this node is drawable (not just a group), then draw it
      if (node.draw) {
        modelViewMatrix = mult(V, currentWorldMatrix);
        gl.uniformMatrix4fv(
          modelViewMatrixLoc,
          false,
          flatten(modelViewMatrix)
        );
        const nMat = normalMatrix(modelViewMatrix, true);
        gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(nMat));

        // Combine part color with material tint
        const materialDiffuse = mult(materialTint, node.color);
        const materialAmbient = scale(0.2, materialDiffuse);
        const materialSpecular = vec4(1.0, 1.0, 1.0, 1.0); // Simple white specular

        // Set per-object material uniforms
        const ambientProduct = mult(light.ambient, materialAmbient);
        const diffuseProduct = mult(light.diffuse, materialDiffuse);
        const specularProduct = mult(light.specular, materialSpecular);
        gl.uniform4fv(ambientProdLoc, flatten(ambientProduct));
        gl.uniform4fv(diffuseProdLoc, flatten(diffuseProduct));
        gl.uniform4fv(specularProdLoc, flatten(specularProduct));
        gl.uniform4fv(baseColorLoc, flatten(materialDiffuse));

        // Draw the unit cube
        gl.drawArrays(gl.TRIANGLES, 0, numPositions);
      }

      // Recursively draw all children
      if (node.children && node.children.length > 0) {
        for (let i = 0; i < node.children.length; i++) {
          // Pass this node's world matrix as the parent matrix to its children
          drawNode(node.children[i], currentWorldMatrix);
        }
      }
    }
    // --- END Recursive Traversal ---

    // Start drawing from the root node with an identity matrix
    drawNode(objectTreeRoot, mat4());

    animationId = requestAnimationFrame(render);
  }

  // --- Start App ---
  setupGL();
  hookUI();
  applyTextureSelection(); // Init texture to 'none'

  // Start the render loop
  render(0);

  return {
    stop: stop,
    setCameraPosition: setCameraPosition,
  };
}

// Make it globally accessible for the inline script
window.runApp_ACViewer = runApp_ACViewer;
