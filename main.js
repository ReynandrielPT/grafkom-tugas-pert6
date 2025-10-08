"use strict";

// Chair Viewer
function runApp_ObjectViewer(
  modelType = "chair",
  useIBO = false,
  projectionType = "perspective",
  lightingMode = "fragment" // 'fragment' (per-pixel) or 'vertex' (per-vertex)
) {
  var canvas, gl, program, numPositions, numIndices;

  var positions = [];
  var normals = [];
  var indices = [];
  var objectParts = [];
  var rotation = { x: -25, y: 35 },
    translation = { x: 0, y: 0 };
  var scaleValue = 0.7,
    cameraDistance = 10.0;
  var objectRotationMatrix = mat4();
  var modelViewMatrix, projectionMatrix;
  var modelViewMatrixLoc, projectionMatrixLoc;
  var normalMatrixLoc, lightPosLoc, shininessLoc;
  var ambientProdLoc, diffuseProdLoc, specularProdLoc;
  var lightIntensityLoc;
  var ambientIntensityLoc, diffuseIntensityLoc, specularIntensityLoc;
  var lightingEnabledLoc, baseColorLoc;
  var isDragging = false,
    lastMouseX,
    lastMouseY;
  var currentProjectionType = projectionType;
  var currentLightingMode = lightingMode;
  let animationId = -1;

  // Texture state
  var textureEnabled = 0.0;
  var textureSelect = "none";
  var textureObject = null;
  var textureSamplerLoc = null;
  var textureEnabledLoc = null;

  // Object tint (from UI color picker)
  var materialTint = vec4(1.0, 1.0, 1.0, 1.0);

  // Lighting state (controlled by UI)
  var light = {
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
    var vertices = [
      vec4(-0.5, -0.5, 0.5, 1.0),
      vec4(-0.5, 0.5, 0.5, 1.0),
      vec4(0.5, 0.5, 0.5, 1.0),
      vec4(0.5, -0.5, 0.5, 1.0),
      vec4(-0.5, -0.5, -0.5, 1.0),
      vec4(-0.5, 0.5, -0.5, 1.0),
      vec4(0.5, 0.5, -0.5, 1.0),
      vec4(0.5, -0.5, -0.5, 1.0),
    ];

    if (useIBO) {
      positions = vertices;
      // simple vertex normals pointing outwards from center
      normals = [
        vec3(-1, -1, 1),
        vec3(-1, 1, 1),
        vec3(1, 1, 1),
        vec3(1, -1, 1),
        vec3(-1, -1, -1),
        vec3(-1, 1, -1),
        vec3(1, 1, -1),
        vec3(1, -1, -1),
      ].map(function (n) {
        return normalize(n);
      });
      indices = [
        1, 0, 3, 1, 3, 2, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7, 6, 5, 1, 6, 1, 2,
        4, 5, 6, 4, 6, 7, 5, 4, 0, 5, 0, 1,
      ];
      numIndices = indices.length;
      console.log("numIndices: " + numIndices);
      console.log(indices);
    } else {
      function quad(a, b, c, d) {
        var i = [a, b, c, a, c, d];
        // face normal from two edges
        var t1 = subtract(vertices[b], vertices[a]);
        var t2 = subtract(vertices[c], vertices[b]);
        var n = normalize(cross(t1, t2));
        for (var k = 0; k < i.length; ++k) {
          positions.push(vertices[i[k]]);
          normals.push(n);
        }
      }
      quad(1, 0, 3, 2);
      quad(2, 3, 7, 6);
      quad(3, 0, 4, 7);
      quad(6, 5, 1, 2);
      quad(4, 5, 6, 7);
      quad(5, 4, 0, 1);

      numPositions = positions.length;
      console.log("numPositions: " + numPositions);
      console.log(positions);
    }
  }

  function createCheckerboard(size) {
    var texSize = size || 128;
    var image1 = new Array();
    for (var i = 0; i < texSize; i++) image1[i] = new Array();
    for (var i = 0; i < texSize; i++)
      for (var j = 0; j < texSize; j++) image1[i][j] = new Float32Array(4);
    for (var i = 0; i < texSize; i++)
      for (var j = 0; j < texSize; j++) {
        var c = ((i & 0x8) == 0) ^ ((j & 0x8) == 0);
        image1[i][j] = [c, c, c, 1];
      }
    var image2 = new Uint8Array(4 * texSize * texSize);
    for (var i = 0; i < texSize; i++)
      for (var j = 0; j < texSize; j++)
        for (var k = 0; k < 4; k++)
          image2[4 * texSize * i + 4 * j + k] = 255 * image1[i][j][k];
    return { data: image2, texSize };
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
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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
    // else "custom" is handled via file input
  }

  function init() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) return alert("WebGL 2.0 isn't available");

    initUnitCube();

    // Always load chair model
    objectParts = window.createChairModel();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 0.9, 0.95, 1.0);
    gl.enable(gl.DEPTH_TEST);
    // Choose shader pair by lighting mode
    if (currentLightingMode === "vertex") {
      program = initShaders(
        gl,
        "viewer-vertex-shader-vertex",
        "viewer-fragment-shader-vertex"
      );
    } else {
      program = initShaders(
        gl,
        "viewer-vertex-shader",
        "viewer-fragment-shader"
      );
    }
    gl.useProgram(program);

    // VBO setup
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);
    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    // Normal buffer
    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    var normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    // IBO setup
    if (useIBO) {
      var iBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices),
        gl.STATIC_DRAW
      );
    }

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

    // Texture uniforms
    textureSamplerLoc = gl.getUniformLocation(program, "uTextureMap");
    textureEnabledLoc = gl.getUniformLocation(program, "uTextureEnabled");
    if (textureSamplerLoc) {
      gl.uniform1i(textureSamplerLoc, 0); // use texture unit 0
    }

    // Hook UI
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
        rotation.x = Math.max(-90, Math.min(90, rotation.x));
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    };
    canvas.onwheel = (e) => {
      e.preventDefault();
      cameraDistance += e.deltaY * 0.02;
      cameraDistance = Math.max(4.0, Math.min(25.0, cameraDistance));
    };
    document.getElementById("viewer-scale").oninput = (e) =>
      (scaleValue = parseFloat(e.target.value));
    document.getElementById("viewer-translateX").oninput = (e) =>
      (translation.x = parseFloat(e.target.value));
    document.getElementById("viewer-translateY").oninput = (e) =>
      (translation.y = parseFloat(e.target.value));

    document.getElementById("btn-rotate-x").onclick = () => {
      objectRotationMatrix = mult(objectRotationMatrix, rotateX(90));
    };
    document.getElementById("btn-rotate-y").onclick = () => {
      objectRotationMatrix = mult(objectRotationMatrix, rotateY(90));
    };
    document.getElementById("btn-rotate-z").onclick = () => {
      objectRotationMatrix = mult(objectRotationMatrix, rotateZ(90));
    };

    // Hook UI controls for lighting
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
      // default: none
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
        textureDropzone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          textureDropzone.classList.add("bg-gray-50");
        });
      });
      ["dragleave", "drop"].forEach((evt) => {
        textureDropzone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          textureDropzone.classList.remove("bg-gray-50");
        });
      });
      textureDropzone.addEventListener("drop", function (e) {
        const dt = e.dataTransfer;
        const file = dt && dt.files && dt.files[0];
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

    if (ambientInput)
      ambientInput.oninput = (e) => {
        light.ambient = hexToVec4(e.target.value);
      };
    if (diffuseInput)
      diffuseInput.oninput = (e) => {
        light.diffuse = hexToVec4(e.target.value);
      };
    if (specularInput)
      specularInput.oninput = (e) => {
        light.specular = hexToVec4(e.target.value);
      };
    if (shininessInput)
      shininessInput.oninput = (e) => {
        light.shininess = parseFloat(e.target.value);
      };
    if (lightIntensityInput) {
      const updateIntensity = (e) => {
        light.intensity = parseFloat(lightIntensityInput.value);
        if (lightIntensityValue) {
          lightIntensityValue.textContent = light.intensity.toFixed(2);
        }
      };
      lightIntensityInput.oninput = updateIntensity;
      updateIntensity();
    }
    if (ambientIntensityInput) {
      const updateAmb = () => {
        light.ambientIntensity = parseFloat(ambientIntensityInput.value);
        if (ambientIntensityValue)
          ambientIntensityValue.textContent = light.ambientIntensity.toFixed(2);
      };
      ambientIntensityInput.oninput = updateAmb;
      updateAmb();
    }
    if (diffuseIntensityInput) {
      const updateDif = () => {
        light.diffuseIntensity = parseFloat(diffuseIntensityInput.value);
        if (diffuseIntensityValue)
          diffuseIntensityValue.textContent = light.diffuseIntensity.toFixed(2);
      };
      diffuseIntensityInput.oninput = updateDif;
      updateDif();
    }
    if (specularIntensityInput) {
      const updateSpec = () => {
        light.specularIntensity = parseFloat(specularIntensityInput.value);
        if (specularIntensityValue)
          specularIntensityValue.textContent =
            light.specularIntensity.toFixed(2);
      };
      specularIntensityInput.oninput = updateSpec;
      updateSpec();
    }
    if (objectColorInput) {
      const updateTint = () => {
        materialTint = hexToVec4(objectColorInput.value);
      };
      objectColorInput.oninput = updateTint;
      updateTint();
    }
    if (lightEnabledInput) {
      const updateEnabled = () => {
        light.enabled = !!lightEnabledInput.checked;
      };
      lightEnabledInput.onchange = updateEnabled;
      updateEnabled();
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

    render();
  }

  function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (currentProjectionType === "perspective") {
      projectionMatrix = perspective(
        30.0,
        canvas.width / canvas.height,
        0.2,
        100.0
      );
    } else {
      const size = cameraDistance * 0.5;
      const aspect = canvas.width / canvas.height;
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
    const T = translate(translation.x, translation.y, 0);
    const S = scale(scaleValue, scaleValue, scaleValue);
    const R = objectRotationMatrix;
    const objectTransform = mult(T, mult(R, S));

    // Bind texture if enabled
    if (textureEnabledLoc) {
      gl.uniform1f(textureEnabledLoc, textureEnabled);
    }
    if (textureEnabled > 0.0 && textureObject && textureSamplerLoc) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textureObject);
      gl.uniform1i(textureSamplerLoc, 0);
    }

    for (let i = 0; i < objectParts.length; i++) {
      let M = mult(objectTransform, objectParts[i].transform);
      modelViewMatrix = mult(V, M);
      gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
      // normal matrix per part
      var nMat = normalMatrix(modelViewMatrix, true);
      gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(nMat));

      // Build material based on part color
      // Apply user tint to the base part color
      var materialDiffuse = mult(materialTint, objectParts[i].color);
      var materialAmbient = scale(0.2, materialDiffuse); // simple choice
      var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);

      // Set light uniforms
      gl.uniform4fv(lightPosLoc, light.position);
      gl.uniform1f(shininessLoc, light.shininess);
      if (lightIntensityLoc) gl.uniform1f(lightIntensityLoc, light.intensity);
      if (ambientIntensityLoc)
        gl.uniform1f(ambientIntensityLoc, light.ambientIntensity);
      if (diffuseIntensityLoc)
        gl.uniform1f(diffuseIntensityLoc, light.diffuseIntensity);
      if (specularIntensityLoc)
        gl.uniform1f(specularIntensityLoc, light.specularIntensity);
      if (lightingEnabledLoc)
        gl.uniform1f(lightingEnabledLoc, light.enabled ? 1.0 : 0.0);

      var ambientProduct = mult(light.ambient, materialAmbient);
      var diffuseProduct = mult(light.diffuse, materialDiffuse);
      var specularProduct = mult(light.specular, materialSpecular);
      gl.uniform4fv(ambientProdLoc, flatten(ambientProduct));
      gl.uniform4fv(diffuseProdLoc, flatten(diffuseProduct));
      gl.uniform4fv(specularProdLoc, flatten(specularProduct));
      if (baseColorLoc) gl.uniform4fv(baseColorLoc, flatten(materialDiffuse));

      // IBO rendering call
      if (useIBO) {
        gl.drawElements(gl.TRIANGLES, numIndices, gl.UNSIGNED_SHORT, 0);
      }
      // VBO only rendering call
      else {
        gl.drawArrays(gl.TRIANGLES, 0, numPositions);
      }
    }
    animationId = requestAnimationFrame(render);
  }

  function setCameraPosition(preset) {
    switch (preset) {
      case "front":
        rotation.x = 0;
        rotation.y = 0;
        cameraDistance = 10.0;
        break;
      case "side":
        rotation.x = 0;
        rotation.y = 90;
        cameraDistance = 10.0;
        break;
      case "top":
        rotation.x = -90;
        rotation.y = 0;
        cameraDistance = 10.0;
        break;
      case "isometric":
        rotation.x = -30;
        rotation.y = 45;
        cameraDistance = 10.0;
        break;
      default:
        rotation.x = -25;
        rotation.y = 35;
        cameraDistance = 10.0;
    }
  }

  // Reset helpers for UI toolbar
  function resetTransform() {
    scaleValue = 0.7;
    translation = { x: 0, y: 0 };
    objectRotationMatrix = mat4();
  }

  function resetLight() {
    light.position = vec4(2.0, 3.0, 4.0, 1.0);
    light.shininess = 50.0;
    light.intensity = 1.0;
    light.ambientIntensity = 1.0;
    light.diffuseIntensity = 1.0;
    light.specularIntensity = 1.0;
    light.enabled = true;
    // Keep colors/tint as-is; user may have changed them intentionally
  }

  function resetView() {
    // Reset camera orientation and distance
    rotation = { x: -25, y: 35 };
    cameraDistance = 10.0;
    resetTransform();
    resetLight();
  }

  init();
  return {
    animationId: animationId,
    setCameraPosition: setCameraPosition,
    resetTransform: resetTransform,
    resetLight: resetLight,
    resetView: resetView,
  };
}

window.runApp_ObjectViewer = runApp_ObjectViewer;
