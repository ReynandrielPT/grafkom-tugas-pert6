"use strict";

// Chair Viewer
function runApp_ObjectViewer(
  modelType = "chair",
  useIBO = false,
  projectionType = "perspective"
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
  var isDragging = false,
    lastMouseX,
    lastMouseY;
  var currentProjectionType = projectionType;
  let animationId = -1;

  // Lighting state (controlled by UI)
  var light = {
    ambient: vec4(0.2, 0.2, 0.2, 1.0),
    diffuse: vec4(1.0, 1.0, 1.0, 1.0),
    specular: vec4(1.0, 1.0, 1.0, 1.0),
    position: vec4(2.0, 3.0, 4.0, 1.0),
    shininess: 50.0,
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
    program = initShaders(gl, "viewer-vertex-shader", "viewer-fragment-shader");
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
    const lightX = document.getElementById("lightX");
    const lightY = document.getElementById("lightY");
    const lightZ = document.getElementById("lightZ");

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

    for (let i = 0; i < objectParts.length; i++) {
      let M = mult(objectTransform, objectParts[i].transform);
      modelViewMatrix = mult(V, M);
      gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
      // normal matrix per part
      var nMat = normalMatrix(modelViewMatrix, true);
      gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(nMat));

      // Build material based on part color
      var materialDiffuse = objectParts[i].color;
      var materialAmbient = scale(0.2, materialDiffuse); // simple choice
      var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);

      // Set light uniforms
      gl.uniform4fv(lightPosLoc, light.position);
      gl.uniform1f(shininessLoc, light.shininess);

      var ambientProduct = mult(light.ambient, materialAmbient);
      var diffuseProduct = mult(light.diffuse, materialDiffuse);
      var specularProduct = mult(light.specular, materialSpecular);
      gl.uniform4fv(ambientProdLoc, flatten(ambientProduct));
      gl.uniform4fv(diffuseProdLoc, flatten(diffuseProduct));
      gl.uniform4fv(specularProdLoc, flatten(specularProduct));

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

  init();
  return {
    animationId: animationId,
    setCameraPosition: setCameraPosition,
  };
}

window.runApp_ObjectViewer = runApp_ObjectViewer;
