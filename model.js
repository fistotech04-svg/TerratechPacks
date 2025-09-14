/********** AVAILABLE OPTIONS **********/
const options = {
  lid: ["White", "Transparency"],
  tub: ["White", "Transparency", "Black"]
};

/********** PART MATERIAL NAMES **********/
const PART_MATERIALS = {
  lid: ["Top"],               // adjust based on console logs
  tub: ["Bottom", "Bottom1"]  // can hold multiple names
};

/********** UPDATE MATERIAL COLOR **********/
function updateMaterialColor(part, color) {
  if (!mainViewer.model) {
    mainViewer.addEventListener("load", () => updateMaterialColor(part, color), { once: true });
    return;
  }

  const materialNames = PART_MATERIALS[part] || [];

  const factors = {
    white: [1, 1, 1, 1],
    black: [0, 0, 0, 1],
    transparency: [1, 1, 1, 0.3]
  };

  const colorKey = color.toLowerCase();  // ✅ Normalize color string
  const factor = factors[colorKey];
  if (!factor) {
    console.warn(`Unknown color: ${color}`);
    return;
  }

  materialNames.forEach(name => {
    const mat = mainViewer.model.materials.find(m => m.name === name);
    if (!mat) {
      console.warn(`Material '${name}' not found in model`);
      return;
    }

    mat.alphaMode = (colorKey === "transparency") ? "BLEND" : "OPAQUE";
    mat.doubleSided = true;

    try {
      mat.pbrMetallicRoughness.setBaseColorFactor(factor);
      console.log(`✅ Updated ${name} → ${colorKey}`);
    } catch (err) {
      console.error("❌ Failed to set color on", name, err);
    }
  });
}

/********** RENDER OPTIONS **********/
function renderOptions(part) {
  colorOptions.innerHTML = "";

  options[part].forEach((color, idx) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "color";
    input.value = color.toLowerCase();
    if (idx === 0) input.checked = true;

    input.addEventListener("change", () => {
      updateMaterialColor(part, input.value);
    });

    label.append(input, " " + color);
    colorOptions.appendChild(label);
  });

  // apply default option on render
  updateMaterialColor(part, options[part][0].toLowerCase());
}

/********** UPDATE PART **********/
function updatePart(part) {
  if (options[part]) {
    renderOptions(part);
  }
}



// ================== CONFIG ==================

const MODEL_NAMES = [
  "120ml Round Container",
  "500ml Round Container",
  "500gms/450ml Container",
  "500ml Rectangular Container",
  "250gms Sweet Box",
  "250gms Sweet BoxTE",
];

const MODEL_PATHS = [
  "/assets/terra_tech_models/logo_120 ml round.glb",
  "/assets/terra_tech_models/logo_500ml round container.glb",
  "/assets/terra_tech_models/logo_500gms450ml container.glb",
  "/assets/terra_tech_models/logo_500ml rectangular container .glb",
  "/assets/terra_tech_models/logo_250 gms sweet.glb",
  "/assets/terra_tech_models/logo_250_gms_te_sb.glb",
];

const PATTERN_MATERIAL_NAME = "Bottom";
const LOGO_MATERIAL_NAME = "Logo";

/********** STATE **********/
const state = {
  selectedIndex: 0,
  thumbnails: [],
  modelViewers: [],
  patternUrl: null,
  logoDataUrl: null,
  floralPatterns: [],
  autoPatternIndex: 0,
  autoPatternTimer: null
};

/********** ELEMENTS **********/
const thumbGrid = document.getElementById("thumbGrid");
const mainViewer = document.getElementById("mainViewer");
const mainModelTitle = document.getElementById("mainModelTitle");
const logoInput = document.getElementById("logoUpload");

// ================== THUMBNAILS ==================

function initThumbnails() {
  MODEL_PATHS.forEach((path, idx) => {
    const card = document.createElement("div");
    card.className = "thumb-card";
    card.dataset.index = idx;

    const mv = document.createElement("model-viewer");
    mv.src = path;
    mv.alt = MODEL_NAMES[idx];
    mv.disableZoom = true;
    mv.cameraControls = true;
    mv.reveal = "auto";
    mv.interactionPrompt = "none";
    mv.style.pointerEvents = "none";

    const label = document.createElement("div");
    label.className = "thumb-label";
    label.textContent = MODEL_NAMES[idx];

    card.appendChild(mv);
    card.appendChild(label);
    thumbGrid.appendChild(card);

    state.thumbnails.push({ card, viewer: mv });
    state.modelViewers.push(mv);

    card.addEventListener("click", () => selectModel(idx));
  });

  markSelectedThumbnail(0);
}

function markSelectedThumbnail(index) {
  state.thumbnails.forEach((t, i) => {
    t.card.classList.toggle("selected", i === index);
  });
}

// ================== MODEL SELECTION ==================

function selectModel(index) {
  if (index < 0 || index >= MODEL_PATHS.length) return;
  state.selectedIndex = index;

  mainViewer.src = MODEL_PATHS[index];
  mainViewer.alt = MODEL_NAMES[index];
  mainModelTitle.textContent = MODEL_NAMES[index];

  markSelectedThumbnail(index);

  mainViewer.addEventListener("load", async () => {
    if (state.patternUrl) await tryApplyMaterialTexture(mainViewer, PATTERN_MATERIAL_NAME, state.patternUrl);
    if (state.logoDataUrl) await tryApplyMaterialTexture(mainViewer, LOGO_MATERIAL_NAME, state.logoDataUrl);

    // apply default colors after model loads
    updatePart(partSelect.value);
  }, { once: true });
}

// ================== PATTERNS ==================

function initFloralPatterns() {
  const patternContainers = document.querySelectorAll(".patternContainer");
  if (!patternContainers.length) return;

  const FLORAL_PATTERNS = [
    { id: "f1", label: "Floral 1", src: "/assets/pattern/pattern-1.webp" },
    { id: "f2", label: "Floral 2", src: "/assets/pattern/pattern-2.webp" },
    { id: "f3", label: "Floral 3", src: "/assets/pattern/pattern-3.webp" },
    { id: "f4", label: "Floral 4", src: "/assets/pattern/pattern-4.webp" },
    { id: "f5", label: "Floral 5", src: "/assets/pattern/pattern-5.webp" },
    { id: "f6", label: "Floral 6", src: "/assets/pattern/pattern-6.webp" }
  ];

  state.floralPatterns = FLORAL_PATTERNS;

  patternContainers.forEach(container => {
    container.innerHTML = "";
    FLORAL_PATTERNS.forEach((p) => {
      const sw = document.createElement("div");
      sw.className = "pattern-swatch";
      sw.style.backgroundImage = `url('${p.src}')`;
      sw.title = p.label;

      sw.addEventListener("click", () => applyPatternToAll(p.src));

      container.appendChild(sw);
    });
  });
}

function applyPatternToAll(url) {
  state.patternUrl = url || null;
  const allViewers = [...state.modelViewers, mainViewer];

  const promises = allViewers.map((mv) =>
    tryApplyMaterialTexture(mv, PATTERN_MATERIAL_NAME, url)
  );

  document.querySelectorAll(".pattern-swatch").forEach(el => el.classList.remove("selected"));
  if (url) {
    document.querySelectorAll(".pattern-swatch").forEach(sw => {
      if (sw.style.backgroundImage.includes(url)) {
        sw.classList.add("selected");
      }
    });
  }

  return Promise.all(promises);
}

// ================== APPLY MATERIAL ==================

async function tryApplyMaterialTexture(viewer, materialName, textureUrl) {
  if (!textureUrl || !viewer) return;

  try {
    if (!viewer.model) {
      return new Promise((resolve) => {
        viewer.addEventListener("load", () => {
          tryApplyMaterialTexture(viewer, materialName, textureUrl).then(resolve);
        }, { once: true });
      });
    }

    const mat = viewer.model.materials.find(m => m.name === materialName);
    if (!mat) return;

    const tex = await viewer.createTexture(textureUrl);
    mat.pbrMetallicRoughness.baseColorTexture.setTexture(tex);
    mat.pbrMetallicRoughness.baseColorTexture.texture.sampler.setWrapMode("REPEAT");
  } catch (err) {
    console.error("Failed to apply texture:", err);
  }
}

// ================== AUTO PATTERN LOOP ==================

function startAutoPatternLoop(interval = 6000) {
  if (!state.floralPatterns.length) return;

  if (state.autoPatternTimer) clearInterval(state.autoPatternTimer);

  state.autoPatternTimer = setInterval(() => {
    if (!document.querySelector(".pattern-swatch.selected")) {
      const pattern = state.floralPatterns[state.autoPatternIndex];
      if (pattern) applyPatternToAll(pattern.src);

      state.autoPatternIndex = (state.autoPatternIndex + 1) % state.floralPatterns.length;
    }
  }, interval);
}

// ================== LOGO UPLOAD ==================

logoInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const logoDataUrl = e.target.result;
    state.logoDataUrl = logoDataUrl;

    await tryApplyMaterialTexture(mainViewer, LOGO_MATERIAL_NAME, logoDataUrl);

    state.modelViewers.forEach(async (mv) => {
      if (mv !== mainViewer) {
        await tryApplyMaterialTexture(mv, LOGO_MATERIAL_NAME, logoDataUrl);
      }
    });
  };
  reader.readAsDataURL(file);
});

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

// ================== ACCORDION ==================

function initAccordion() {
  document.querySelectorAll(".accordion-header").forEach(header => {
    header.addEventListener("click", () => {
      const content = header.nextElementSibling;
      content.style.display = content.style.display === "block" ? "none" : "block";
    });
  });
}

// ================== INIT ==================

document.addEventListener("DOMContentLoaded", () => {
  initFloralPatterns();
  initThumbnails();

  if (!state.modelViewers.includes(mainViewer)) state.modelViewers.push(mainViewer);

  initAccordion();
  applyPatternToAll(null);
  startAutoPatternLoop(4000);

  updatePart(partSelect.value); // initial part + color
  partSelect.addEventListener("change", () => {
    updatePart(partSelect.value);
  });
});
