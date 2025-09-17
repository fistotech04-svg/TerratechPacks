/********** AVAILABLE OPTIONS **********/
const options = {
  lid: ["White", "Transparency"],
  tub: ["White", "Transparency", "Black"],
};

/********** PART MATERIAL NAMES **********/
const PART_MATERIALS = {
  lid: ["Top"], // adjust based on console logs
  tub: [ "Bottom1"], // can hold multiple names
};

/********** UPDATE MATERIAL COLOR **********/
function updateMaterialColor(part, color, { skipWait = false } = {}) {
  const viewers = Array.from(new Set([...(state.modelViewers || []), mainViewer].filter(Boolean)));

  const factors = {
    white: [1, 1, 1, 1],
    black: [0, 0, 0, 1],
    transparency: [1, 1, 1, 0.3],
  };

  const factor = factors[color.toLowerCase()];
  if (!factor) return;

  viewers.forEach((viewer) => {
    const applyToViewer = () => {
      const materialNames = PART_MATERIALS[part] || [];
      materialNames.forEach((name) => {
        const mat = viewer.model?.materials.find((m) => m.name === name);
        if (!mat) return;
        
        // Remove texture if exists
        if (mat.pbrMetallicRoughness.baseColorTexture) {
          mat.pbrMetallicRoughness.baseColorTexture.setTexture(null);
        }

        mat.pbrMetallicRoughness.setBaseColorFactor(factor);
        mat.setAlphaMode(factor[3] < 1 ? "BLEND" : "OPAQUE");
        mat.doubleSided = true;
      });
    };

    if (!viewer.model && !skipWait) {
      viewer.addEventListener("load", applyToViewer, { once: true });
    } else {
      applyToViewer();
    }
  });

  // Save immediately
  state.selectedColors[part] = color.toLowerCase();
  localStorage.setItem("selectedColors", JSON.stringify(state.selectedColors));
}


/********** RENDER OPTIONS **********/
function renderOptions(part) {
  colorOptions.innerHTML = "";
  const savedColor = state.selectedColors[part] || options[part][0].toLowerCase();

  options[part].forEach((color) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "color";
    input.value = color.toLowerCase();
    if (input.value === savedColor) input.checked = true;

    input.addEventListener("change", () => {
      state.selectedColors[part] = input.value;
      localStorage.setItem("selectedColors", JSON.stringify(state.selectedColors)); // ✅ save
      updateMaterialColor(part, input.value);
    });

    label.append(input, " " + color);
    colorOptions.appendChild(label);
  });

  // apply saved color immediately
  updateMaterialColor(part, savedColor);
}


/********** UPDATE PART **********/
function updatePart(part) {
  if (options[part]) {
    renderOptions(part);
  }
}

/********** CONFIG **********/
const BASE_URL = "https://terratechpacks.com/App_3D/Patterns/";
const MODEL_CATEGORIES = {
  Round: [
    { name: "120ml Round Container", path: "./assets/Model_with_logo/120ml round with logo.glb" },
    { name: "500ml Round Container", path: "./assets/Model_with_logo/500ml Round  with logo.glb" },
  ],
  Biryani: [
    { name: "500ml Rectangular Container", path: "./assets/Model_with_logo/500ml Rect with logo.glb" },
  ],
  Square: [
    { name: "500gms/450ml Container", path: "./assets/Model_with_logo/450ml cont with logo.glb" },
  ],
  "Sweet Boxes": [
    { name: "250gms Sweet Box", path: "./assets/Model_with_logo/250gms SB with logo.glb" },
  ],
  "TE Sweet Boxes": [
    { name: "250gms Sweet BoxTE", path: "./assets/Model_with_logo/TE 250 sb with logo.glb" },
  ],
};

const PATTERN_MATERIAL_NAME = "Bottom";
const LOGO_MATERIAL_NAME = "Logo";

/********** STATE **********/
const state = {
  selectedIndex: 0,
  thumbnails: [],
  modelViewers: [],
  patternUrl: null,
  logoDataUrl: null,
  patternCycleTimer: null,
  selectedColors: { lid: "white", tub: "white" }, // track last color
};

/********** ELEMENTS **********/
const thumbGrid = document.getElementById("thumbGrid");
const mainViewer = document.getElementById("mainViewer");
const mainModelTitle = document.getElementById("mainModelTitle");
const logoInput = document.getElementById("logoUpload");
const partSelect = document.getElementById("partSelect");
const colorOptions = document.getElementById("colorOptions");

/********** UTILS **********/
function resolvePatternUrl(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return location.origin + s;
  return BASE_URL + encodeURIComponent(s);
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/********** THUMBNAILS **********/
function initThumbnails() {
  if (!thumbGrid) return;
  thumbGrid.innerHTML = "";
  let modelIndex = 0;

  Object.entries(MODEL_CATEGORIES).forEach(([category, models]) => {
    const categoryDiv = document.createElement("div");
    categoryDiv.className = "category-section";
    const categoryTitle = document.createElement("h4");
    categoryTitle.textContent = category;
    categoryDiv.appendChild(categoryTitle);

    const categoryGrid = document.createElement("div");
    categoryGrid.className = "category-grid";

    models.forEach((model) => {
      const card = document.createElement("div");
      card.className = "thumb-card";
      card.dataset.index = modelIndex;

      const mv = document.createElement("model-viewer");
      mv.src = model.path;
      mv.alt = model.name;
      mv.disableZoom = true;
      mv.cameraControls = true;
      mv.reveal = "auto";
      mv.interactionPrompt = "none";
      mv.style.pointerEvents = "none";

      const label = document.createElement("div");
      label.className = "thumb-label";
      label.textContent = model.name;

      card.appendChild(mv);
      card.appendChild(label);
      categoryGrid.appendChild(card);

      state.thumbnails.push({ card, name: model.name, path: model.path });
      state.modelViewers.push(mv);

      card.addEventListener("click", () => selectModel(Number(card.dataset.index)));
      modelIndex++;
    });

    categoryDiv.appendChild(categoryGrid);
    thumbGrid.appendChild(categoryDiv);
  });

  markSelectedThumbnail(0);
}

function markSelectedThumbnail(index) {
  state.thumbnails.forEach((t, i) => t.card.classList.toggle("selected", i === index));
}

/********** MODEL SELECTION **********/
function selectModel(index) {
  if (index < 0 || index >= state.thumbnails.length) return;
  state.selectedIndex = index;
  const { name, path } = state.thumbnails[index];
  if (!mainViewer) return;

  const encoded = encodeURI(path) + (path.includes("?") ? "&" : "?") + "t=" + Date.now();
  mainViewer.src = encoded;
  mainViewer.alt = name;
  mainModelTitle.textContent = name;

  markSelectedThumbnail(index);

  mainViewer.addEventListener("load", () => {
  // Apply pattern if any
  if (state.patternUrl) applyPatternToAll(state.patternUrl);
  if (state.logoDataUrl) tryApplyMaterialTexture(mainViewer, LOGO_MATERIAL_NAME, state.logoDataUrl);

  // ✅ Apply all saved colors immediately
  Object.entries(state.selectedColors).forEach(([part, color]) => {
    updateMaterialColor(part, color, { skipWait: true }); 
  });
});




}

/********** FETCH CATEGORIES & PATTERNS **********/
async function fetchCategories() {
  try {
    const res = await fetch("https://terratechpacks.com/App_3D/category_fetch.php");
    const json = await res.json();
    return (json.status === "success" && Array.isArray(json.data)) ? json.data : [];
  } catch (err) {
    console.error("Failed to fetch categories:", err);
    return [];
  }
}

// Fetch Patterns by Category with categoryName as a parameter
async function fetchPatternsByCategory(categoryName) {
  if (!categoryName) return [];

  try {
    const formData = new FormData();
    formData.append("category_name", categoryName);
    const res = await fetch("https://terratechpacks.com/App_3D/pattern_url.php", { method: "POST", body: formData });
    const json = await res.json();
    // Check if data is valid and return the patterns that match the selected category
    if (json.status === "success" && Array.isArray(json.data)) {
      return json.data.filter(p => p.category_name.toLowerCase() === categoryName.toLowerCase());
    }
    return [];
  } catch (err) {
    console.error(`Failed to fetch patterns for category: ${categoryName}`, err);
    return [];
  }
}

// Initialize Category Accordion with lazy loading
async function initCategoryAccordion() {
  const accordion = document.querySelector(".accordion");
  if (!accordion) return;

  const categories = await fetchCategories();
  let allPatterns = [];  // Array to store all patterns from all categories

  // Loop through each category to fetch patterns and collect them
  for (const cat of categories) {
    const patterns = await fetchPatternsByCategory(cat.category);
    patterns.forEach((p) => {
      const patternUrl = resolvePatternUrl(p.pattern_url);
      allPatterns.push(patternUrl);  // Collect all patterns
    });

    // Create accordion items for each category
    const li = document.createElement("li");

    const header = document.createElement("div");
    header.className = "accordion-header";
    header.innerHTML = `<span><i class="fa-solid fa-paintbrush"></i> ${cat.category}</span><i class="fa-solid fa-angle-down drop"></i>`;

    const content = document.createElement("div");
    content.className = "accordion-content patternContainer";
    content.style.maxHeight = "0px";
    content.style.overflow = "hidden";
    content.style.transition = "max-height 0.3s ease";

    li.appendChild(header);
    li.appendChild(content);
    accordion.appendChild(li);

    header.addEventListener("click", async () => {
      const isOpen = header.classList.contains("active");

      document.querySelectorAll(".accordion-header").forEach((h) => {
        if (h !== header) {
          h.classList.remove("active");
          const c = h.nextElementSibling;
          if (c) c.style.maxHeight = "0px";
          const drop = h.querySelector(".drop");
          if (drop) drop.className = "fa-solid fa-angle-down drop";
        }
      });

      if (isOpen) {
        header.classList.remove("active");
        content.style.maxHeight = "0px";
        header.querySelector(".drop").className = "fa-solid fa-angle-down drop";
      } else {
        header.classList.add("active");

        if (!content.dataset.loaded) {
          content.innerHTML = "";

          if (patterns.length) {
            // If patterns are available, display them
            patterns.forEach((p) => {
              const patternUrl = resolvePatternUrl(p.pattern_url);
              const sw = document.createElement("div");
              sw.className = "pattern-swatch";
              sw.style.backgroundImage = `url('${patternUrl}')`;
              sw.title = `${p.category_name} - ${p.id}`;
              sw.addEventListener("click", () => {
                stopPatternCycle();
                applyPatternToAll(p.pattern_url);
              });
              content.appendChild(sw);
            });

            content.dataset.loaded = "true";
            content.style.maxHeight = content.scrollHeight + "px";
            header.querySelector(".drop").className = "fa-solid fa-angle-up drop";
          } else {
            // If no patterns are available for this category, display a message
            const noPattern = document.createElement("div");
            noPattern.textContent = "No patterns available for this category";
            noPattern.style.padding = "10px";
            content.appendChild(noPattern);
            content.dataset.loaded = "true";  // Mark this content as loaded
            content.style.maxHeight = content.scrollHeight + "px";
            header.querySelector(".drop").className = "fa-solid fa-angle-up drop";
          }
        } else {
          content.style.maxHeight = content.scrollHeight + "px";
          header.querySelector(".drop").className = "fa-solid fa-angle-up drop";
        }
      }
    });
  }

  // After collecting all patterns, start the pattern cycle for all of them
  if (allPatterns.length > 0) {
    startPatternCycle(allPatterns, 4000);  // Start the cycle with a 3000ms interval
  } else {
    console.warn("No patterns found to start the cycle.");
  }
}

// ================== EXPORT ==================

const exportBtn = document.getElementById("exportBtn");
const exportFormat = document.getElementById("exportFormat");

exportBtn.addEventListener("click", async () => {
  const format = exportFormat.value;
  const modelName = mainModelTitle.textContent.replace(/\s+/g, "_");

  if (!mainViewer) return;

  try {
    const dataUrl = await mainViewer.toDataURL();
    if (format === "pdf") {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "landscape" });
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${modelName}.pdf`);
    } else {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${modelName}.${format}`;
      link.click();
    }
  } catch (err) {
    console.error("Export failed:", err);
  }
});


/********** PATTERN CYCLE **********/
function startPatternCycle(patternUrls = [], interval = 4000) {
  stopPatternCycle();  // Stop any ongoing cycle first

  if (!patternUrls.length) {
    console.warn("No patterns provided for the cycle");
    return;
  }

  let idx = 0;
  state.patternCycleTimer = setInterval(() => {
    const patternUrl = `${patternUrls[idx % patternUrls.length]}?t=${Date.now()}`;
    applyPatternToAll(patternUrl);

    // Highlight the current pattern swatch during the cycle
    const currentBaseUrl = resolvePatternUrl(patternUrls[idx % patternUrls.length]);

    // Update the selected swatch (blue border)
    document.querySelectorAll(".pattern-swatch").forEach((sw) => {
      const bg = sw.style.backgroundImage.replace(/^url\(["']?|["']?\)$/g, "");
      sw.classList.toggle("selected", bg === currentBaseUrl);
    });

    idx++;
  }, interval);
}


function stopPatternCycle() {
  if (state.patternCycleTimer) {
    console.log("Stopping pattern cycle");
    clearInterval(state.patternCycleTimer);
    state.patternCycleTimer = null;
  }
}

/********** APPLY PATTERN TO ALL VIEWERS **********/
async function applyPatternToAll(patternUrl) {
  if (!patternUrl) return;

  // Prepare base and cache-busted URLs
  const baseUrl = /^https?:\/\//i.test(patternUrl) ? patternUrl : `${BASE_URL}${patternUrl}`;
  const separator = baseUrl.includes('?') ? '&' : '?';
  const fullUrl = `${baseUrl}${separator}t=${Date.now()}`;

  state.patternUrl = baseUrl; // Save base URL for accurate future comparison

  console.log("Applying pattern:", fullUrl);

  // Update pattern swatch selection
  document.querySelectorAll(".pattern-swatch").forEach((sw) => {
    const bg = sw.style.backgroundImage.replace(/^url\(["']?|["']?\)$/g, ""); // remove url() wrapper
    sw.classList.toggle("selected", bg === baseUrl);
  });

  const viewers = Array.from(new Set([...(state.modelViewers || []), mainViewer].filter(Boolean)));
  await Promise.all(viewers.map((viewer) => tryApplyMaterialTexture(viewer, PATTERN_MATERIAL_NAME, fullUrl)));
}

/********** CREATE LOGO CANVAS WITHOUT STRETCH **********/
function createLogoCanvas(file, canvasSize = 512, logoScale = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext("2d");

      // Force image to a consistent % of canvas size
      const targetW = canvasSize * logoScale;
      const aspect = img.width / img.height;
      let w = targetW;
      let h = targetW;

      if (aspect > 1) {
        // Wider than tall
        h = targetW / aspect;
      } else {
        // Taller than wide
        w = targetW * aspect;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, (canvasSize - w) / 2, (canvasSize - h) / 2, w, h);

      resolve(canvas.toDataURL());
    };
  });
}

/********** TRY APPLY MATERIAL TEXTURE **********/
async function tryApplyMaterialTexture(viewer, materialName, textureUrl) {
  if (!viewer || !textureUrl) return;
  if (!viewer.model) await new Promise((res) => viewer.addEventListener("load", res, { once: true }));

  const mat = viewer.model.materials?.find((m) => m.name === materialName);
  if (!mat) return console.warn(`Material "${materialName}" not found`);

  const tex = await viewer.createTexture(encodeURI(textureUrl));
  mat.pbrMetallicRoughness.baseColorTexture.setTexture(tex);

  // Apply transform via KHR_texture_transform extension (if available)
  try {
    if (tex.texture) {
      tex.texture.transform = {
        offset: [0.25, 0.25], // center the image
        scale: [0.5, 0.5],    // shrink to 50%
        rotation: 0
      };
    }
  } catch (err) {
    console.warn("Texture transform not supported:", err);
  }

  try {
    tex.texture.sampler.setWrapMode("CLAMP_TO_EDGE"); // prevent repeating
  } catch (_) {}

  mat.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1]);
}



/********** LOGO UPLOAD **********/
if (logoInput) {
  logoInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const logoDataUrl = await createLogoCanvas(file, 512, 0.8); // Canvas size and logo scale
    state.logoDataUrl = logoDataUrl;

    const viewers = Array.from(
      new Set([...(state.modelViewers || []), mainViewer].filter(Boolean))
    );

    await Promise.all(
      viewers.map((v) =>
        tryApplyMaterialTexture(v, LOGO_MATERIAL_NAME, state.logoDataUrl)
      )
    );
  });
}

/********** BACKGROUND COLOR PICKER **********/
const bgColorInput = document.getElementById("bgColorPicker");
const mainbg = document.getElementById("main");
const modalContent = document.querySelector(".modal-content");

function getBrightness(hex) {
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

if (bgColorInput && mainbg && modalContent) {
  // Restore saved color on load
  const savedBg = localStorage.getItem("bgColor");
  if (savedBg) {
    mainbg.style.backgroundColor = savedBg;
    modalContent.style.backgroundColor = savedBg; // ✅ Apply to modal
    bgColorInput.value = savedBg;

    const brightness = getBrightness(savedBg);
    bgColorInput.style.borderColor = brightness < 128 ? "white" : "black";
  }

  // Update background live on color change
  bgColorInput.addEventListener("input", (e) => {
    const color = e.target.value;
    mainbg.style.backgroundColor = color;
    modalContent.style.backgroundColor = color; // ✅ Apply to modal

    const brightness = getBrightness(color);
    bgColorInput.style.borderColor = brightness < 128 ? "white" : "black";

    localStorage.setItem("bgColor", color);
  });
}

function preloadImages(urls = []) {
  urls.forEach(url => {
    const img = new Image();
    img.src = url + "?preload=" + Date.now(); // force preload with unique param
  });
}



// JavaScript
let canvas = null;
let baseImageObj = null;
let logoImageObj = null;

const editBtn = document.querySelector(".edit_btn");
const modal = document.getElementById("editModal");
const closeModal = document.querySelector(".close-button");
const previewLoader = document.getElementById("previewLoader");
const previewWrapper = document.getElementById("previewWrapper");
const uploadInput = document.getElementById("uploadBtn");

// const state = {
//   patternCycleTimer: null,  // example flag, replace as needed
//   patternUrl: '',           // base image URL, set dynamically
//   logoDataUrl: '',          // uploaded logo data URL
// };

// Helper: get bounding rect of base image on canvas (in canvas coords)
function getBaseImageBounds() {
  if (!baseImageObj) return null;

  const imgLeft = baseImageObj.left - (baseImageObj.width * baseImageObj.scaleX) / 2;
  const imgTop = baseImageObj.top - (baseImageObj.height * baseImageObj.scaleY) / 2;
  const imgWidth = baseImageObj.width * baseImageObj.scaleX;
  const imgHeight = baseImageObj.height * baseImageObj.scaleY;

  return {
    left: imgLeft,
    top: imgTop,
    right: imgLeft + imgWidth,
    bottom: imgTop + imgHeight,
    width: imgWidth,
    height: imgHeight,
  };
}


const fabricCanvasElem = document.getElementById('fabricCanvas');

// Resize canvas to fit wrapper size
function resizeCanvas() {
  fabricCanvasElem.width = previewWrapper.clientWidth;
  fabricCanvasElem.height = previewWrapper.clientHeight;
  if (canvas) {
    canvas.setWidth(previewWrapper.clientWidth);
    canvas.setHeight(previewWrapper.clientHeight);
    canvas.renderAll();
  }
}

// Initialize Fabric canvas and load base image (pattern)
function initFabricCanvas() {
  if (canvas) {
    canvas.dispose(); // clean up old canvas if exists
  }

  canvas = new fabric.Canvas('fabricCanvas', {
    selection: false,
    preserveObjectStacking: true,
  });

  resizeCanvas();

  if (state.patternUrl) {
    previewLoader.style.display = "block"; // show loader before base image loads

    fabric.Image.fromURL(state.patternUrl + "?t=" + Date.now(), (img) => {
      baseImageObj = img;

      // Scale base image to fit canvas while maintaining aspect ratio
      const canvasRatio = canvas.width / canvas.height;
      const imgRatio = img.width / img.height;

      if (imgRatio > canvasRatio) {
        img.scaleToWidth(canvas.width);
      } else {
        img.scaleToHeight(canvas.height);
      }

      img.set({
        selectable: false,
        evented: false,
        left: canvas.width / 2,
        top: canvas.height / 2,
        originX: 'center',
        originY: 'center',
      });

      canvas.setBackgroundImage(img, () => {
        canvas.renderAll();
        previewLoader.style.display = "none";  // hide loader after base image loaded
      });
    });
  } else {
    previewLoader.style.display = "none"; // no base image, hide loader immediately
  }
}

// Add logo to canvas with drag, resize, rotate enabled
function addLogoToCanvas(dataUrl) {
  if (logoImageObj) {
    canvas.remove(logoImageObj);
    logoImageObj = null;
  }

  fabric.Image.fromURL(dataUrl, (img) => {
    logoImageObj = img;

    // Scale logo uniformly to fit within 100x100 box (keep aspect ratio)
    const maxDisplaySize = 300;
    const scaleRatio = maxDisplaySize / Math.max(img.width, img.height);
    img.scale(scaleRatio);

    img.set({
      originX: 'left',
      originY: 'top',
      cornerStyle: 'circle',
      cornerColor: 'blue',
      transparentCorners: false,
      lockScalingFlip: true,
      selectable: true,
      hasRotatingPoint: true,
      cornerSize: 12,
      minScaleLimit: 0.1,
    });

    // Place logo at top-left of base image (with margin)
    const baseBounds = getBaseImageBounds();
    if (baseBounds) {
      img.set({
        left: baseBounds.left + 5,
        top: baseBounds.top + 5,
      });
    } else {
      img.set({
        left: 10,
        top: 10,
      });
    }

    // Keep logo inside base image when moving
    img.on('moving', () => {
      const baseBounds = getBaseImageBounds();
      const bound = img.getBoundingRect();

      if (baseBounds) {
        if (bound.left < baseBounds.left) img.left += (baseBounds.left - bound.left);
        if (bound.top < baseBounds.top) img.top += (baseBounds.top - bound.top);
        if (bound.left + bound.width > baseBounds.right) img.left -= (bound.left + bound.width - baseBounds.right);
        if (bound.top + bound.height > baseBounds.bottom) img.top -= (bound.top + bound.height - baseBounds.bottom);
      }
    });

    // Keep logo inside base image when scaling
    img.on('scaling', () => {
      const baseBounds = getBaseImageBounds();
      const bound = img.getBoundingRect();

      if (baseBounds) {
        // Limit scale so logo doesn't go outside image
        const scaleLimitX = (baseBounds.right - img.left) / img.width;
        const scaleLimitY = (baseBounds.bottom - img.top) / img.height;

        const maxAllowedScale = Math.min(scaleLimitX, scaleLimitY);
        if (img.scaleX > maxAllowedScale) {
          img.scaleX = img.scaleY = maxAllowedScale;
        }
      }
    });

    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
  });
}



// Open modal and initialize everything
editBtn.addEventListener('click', () => {
  if (state.patternCycleTimer) {
    alert("Please select the pattern before editing.");
    return;
  }

  if (modal) modal.classList.add("show");

  previewLoader.style.display = "block"; // show loader immediately

  initFabricCanvas();

  // If logo uploaded, add logo asynchronously (no loader wait)
  if (state.logoDataUrl) {
    addLogoToCanvas(state.logoDataUrl);
  }
});

// Upload logo and add to canvas
uploadInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  previewLoader.style.display = "block"; // optional: can show loader for logo if you want

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    state.logoDataUrl = dataUrl;

    addLogoToCanvas(dataUrl);

    previewLoader.style.display = "none"; // hide loader after logo added (optional)
  };
  reader.readAsDataURL(file);
});

// Optional: close modal logic
if (closeModal) {
  closeModal.addEventListener('click', () => {
    if (modal) modal.classList.remove("show");
    if (canvas) {
      canvas.dispose();
      canvas = null;
      baseImageObj = null;
      logoImageObj = null;
    }
  });
}

// Resize canvas on window resize
window.addEventListener('resize', () => {
  resizeCanvas();
});




//   saveLogoBtn.addEventListener("click", async () => {
//   if (!state.patternUrl && !state.logoDataUrl) {
//     alert("No pattern or logo to apply.");
//     return;
//   }

//   const baseImage = document.getElementById("baseImage");
//   const logoOverlay = document.getElementById("logoOverlay");
//   const wrapper = document.getElementById("previewWrapper");

//   const canvas = document.createElement("canvas");
//   const ctx = canvas.getContext("2d");

//   const w = baseImage.naturalWidth || baseImage.width;
//   const h = baseImage.naturalHeight || baseImage.height;

//   canvas.width = w;
//   canvas.height = h;

//   // Step 1: Draw base pattern
//   if (state.patternUrl) {
//     await new Promise((resolve, reject) => {
//       const img = new Image();
//       img.crossOrigin = "anonymous";
//       img.src = state.patternUrl + "?t=" + Date.now();
//       img.onload = () => {
//         ctx.drawImage(img, 0, 0, w, h);
//         resolve();
//       };
//       img.onerror = reject;
//     });
//   }

//   // Step 2: Draw logo overlay
//   if (state.logoDataUrl && logoOverlay.style.display !== "none") {
//     await new Promise((resolve, reject) => {
//       const img2 = new Image();
//       img2.crossOrigin = "anonymous";
//       img2.src = state.logoDataUrl;
//       img2.onload = () => {
//         const overlayRect = logoOverlay.getBoundingClientRect();
//         const wrapperRect = wrapper.getBoundingClientRect();

//         const relX = overlayRect.left - wrapperRect.left;
//         const relY = overlayRect.top - wrapperRect.top;

//         const scaleX = w / wrapperRect.width;
//         const scaleY = h / wrapperRect.height;

//         ctx.drawImage(
//           img2,
//           relX * scaleX,
//           relY * scaleY,
//           overlayRect.width * scaleX,
//           overlayRect.height * scaleY
//         );
//         resolve();
//       };
//       img2.onerror = reject;
//     });
//   }

//   // Step 3: Apply combined texture to Bottom material (NOT Logo material)
//   const finalTextureUrl = canvas.toDataURL("image/png");
//   state.patternUrl = finalTextureUrl; // update state to reflect final merged texture

//   const viewers = Array.from(
//     new Set([...(state.modelViewers || []), mainViewer].filter(Boolean))
//   );

//   await Promise.all(
//     viewers.map((v) =>
//       tryApplyMaterialTexture(v, PATTERN_MATERIAL_NAME, finalTextureUrl)
//     )
//   );

//   modal.classList.remove("show");
// });



// Close on X click
// closeModal.addEventListener("click", () => {
//   modal.classList.remove("show");
// });

// Close when clicking outside the modal-content
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.remove("show");
  }
});




/********** INIT **********/
document.addEventListener("DOMContentLoaded", async () => {
  const preloader = document.getElementById("preloader");
  if (preloader) preloader.style.display = "flex";

  const saved = localStorage.getItem("selectedColors");
  if (saved) {
    state.selectedColors = JSON.parse(saved);
  } else {
    state.selectedColors = { lid: "white", tub: "white" };
  }

  // ✅ Wait for thumbnails and categories to load
  await initThumbnails();
  const allPatterns = await initCategoryAccordion(); // must return all patterns!

  if (mainViewer && !state.modelViewers.includes(mainViewer)) {
    state.modelViewers.push(mainViewer);
  }

  if (partSelect) {
    partSelect.value = "tub";
    updatePart("tub");
    partSelect.addEventListener("change", () => updatePart(partSelect.value));
  }

  // ✅ Restore saved colors
  Object.keys(state.selectedColors).forEach((part) => {
    const savedColor = state.selectedColors[part] || options[part][0].toLowerCase();
    updateMaterialColor(part, savedColor);
  });

  // ✅ Preload and cycle patterns (after loading categories)
  if (allPatterns && allPatterns.length > 0) {
    preloadImages(allPatterns);
    startPatternCycle(allPatterns, 2000);
  }

  // ✅ Hide preloader
  if (preloader) {
    preloader.classList.add("fade-out");
    setTimeout(() => {
      preloader.style.display = "none";
    }, 500); // Optional fade-out
  }
});



