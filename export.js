window.addEventListener("DOMContentLoaded", () => {
  const textureInputs = [
    { titleId: "textureTitle1", fileId: "texture1", topColorId: "topColor1", bgColorId: "bgColor1" },
    { titleId: "textureTitle2", fileId: "texture2", topColorId: "topColor2", bgColorId: "bgColor2" },
    { titleId: "textureTitle3", fileId: "texture3", topColorId: "topColor3", bgColorId: "bgColor3" },
  ];

  const renderedImages = document.getElementById("renderedImages");
  const modelSrc = "./assets/model.glb";
  const materialName = "Bottom.006";
  const TopmaterialName = "Top.006";
  const viewerTextureCache = new WeakMap();

  // --- Utilities ---
  function stripQuery(url) {
    try {
      return (
        new URL(url, location.href).origin +
        new URL(url, location.href).pathname
      );
    } catch {
      return url;
    }
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // --- Color utilities ---
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : null;
  }

  function hexToRgbArray(hex) {
    const rgb = hexToRgb(hex);
    return rgb ? [rgb.r, rgb.g, rgb.b] : [245, 210, 218]; // default fallback
  }

  // --- Enhanced texture and color application ---
  async function tryApplyMaterialTexture(viewer, materialNames, textureUrl, topMaterialColor = null) {
    if (!viewer || !textureUrl) return;
    if (!viewer.model) {
      await new Promise((res) =>
        viewer.addEventListener("load", res, { once: true })
      );
    }
    
    // Apply texture to bottom material
    const names = Array.isArray(materialNames) ? materialNames : [materialNames];
    const mat = names
      .map((n) => viewer.model?.materials?.find((m) => m.name === n))
      .find(Boolean);
    
    if (mat) {
      try {
        let vcache = viewerTextureCache.get(viewer) || new Map();
        viewerTextureCache.set(viewer, vcache);

        const cacheKey = mat.name + "::" + stripQuery(textureUrl);
        let tex =
          vcache.get(cacheKey) ||
          (await viewer.createTexture(encodeURI(textureUrl)));
        vcache.set(cacheKey, tex);

        mat.pbrMetallicRoughness.baseColorTexture.setTexture(tex);
        mat.pbrMetallicRoughness.setBaseColorFactor([1, 1, 1, 1]);
        mat.setAlphaMode("OPAQUE");
      } catch (err) {
        console.error("Failed to apply texture:", err);
      }
    }

    // Apply color to top material
    if (topMaterialColor) {
      const topMat = viewer.model?.materials?.find((m) => m.name === TopmaterialName);
      if (topMat) {
        try {
          const colorArray = hexToRgbArray(topMaterialColor);
          topMat.pbrMetallicRoughness.setBaseColorFactor([...colorArray, 1]);
        } catch (err) {
          console.error("Failed to apply top material color:", err);
        }
      }
    }
  }

  // --- Create PDF-specific model viewer ---
  async function createPDFModelViewer(textureDataURL, topMaterialColor = null, customSize = 800) {
    console.log("Creating PDF model viewer...");
    
    const pdfModelViewer = document.createElement("model-viewer");
    pdfModelViewer.src = modelSrc;
    pdfModelViewer.setAttribute("camera-orbit", "-540.9deg 84.49deg 0.4649m");
    pdfModelViewer.setAttribute("disable-tap", "");
    pdfModelViewer.setAttribute("disable-pan", "");
    pdfModelViewer.setAttribute("interaction-prompt", "none");
    pdfModelViewer.setAttribute("shadow-intensity","0.5")
    pdfModelViewer.style.width = `${customSize}px`;
    pdfModelViewer.style.height = `${customSize}px`;
    pdfModelViewer.style.position = "fixed";
    pdfModelViewer.style.left = "50%";
    pdfModelViewer.style.top = "50%";
    pdfModelViewer.style.transform = "translate(-50%, -50%)";
    pdfModelViewer.style.zIndex = "-1";
    pdfModelViewer.style.backgroundColor = "rgba(255, 255, 255, 0.95)";
    pdfModelViewer.style.border = "2px solid #ccc";
    pdfModelViewer.style.borderRadius = "10px";
    pdfModelViewer.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
    
    // Add to document temporarily
    document.body.appendChild(pdfModelViewer);
    console.log("PDF model viewer added to DOM");

    // Wait for model to load with timeout
    let attempts = 0;
    const maxAttempts = 50;
    
    while (!pdfModelViewer.model && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 200));
      attempts++;
      console.log(`Waiting for model to load... attempt ${attempts}`);
    }
    
    if (!pdfModelViewer.model) {
      console.error("Model failed to load after", maxAttempts * 200, "ms");
      return null;
    }
    
    console.log("Model loaded successfully");

    // Apply texture and color
    console.log("Applying texture and color...");
    await tryApplyMaterialTexture(pdfModelViewer, materialName, textureDataURL, topMaterialColor);
    console.log("Texture and color applied");
    
    // Give more time to render
    await new Promise((r) => setTimeout(r, 2000));
    console.log("Ready for capture");

    return { pdfModelViewer };
  }

  // --- Capture from PDF model viewer ---
  async function capturePDFModelImage(pdfModelViewer) {
    if (!pdfModelViewer) {
      console.error("No model viewer provided");
      return null;
    }

    console.log("Attempting to capture image...");
    
    // Try multiple methods to get canvas
    let canvas = null;
    
    // Method 1: Shadow root canvas
    if (pdfModelViewer.shadowRoot) {
      canvas = pdfModelViewer.shadowRoot.querySelector("canvas");
      console.log("Canvas from shadow root:", canvas);
    }
    
    // Method 2: Direct canvas query
    if (!canvas) {
      canvas = pdfModelViewer.querySelector("canvas");
      console.log("Canvas from direct query:", canvas);
    }
    
    if (canvas) {
      try {
        console.log("Canvas dimensions:", canvas.width, "x", canvas.height);
        const dataURL = canvas.toDataURL("image/png", 1.0);
        console.log("Image captured successfully, length:", dataURL.length);
        return dataURL;
      } catch (e) {
        console.error("Canvas capture failed:", e);
      }
    } else {
      console.error("No canvas found in model viewer");
    }
    
    return null;
  }

  // --- Setup model-viewer ---
  function setupModelViewer(modelViewer) {
    modelViewer.captureScreenshot = async function () {
      return await captureModelViewerImage(this);
    };
  }

  // --- Capture model-viewer image (for cards) ---
  async function captureModelViewerImage(modelViewer) {
    if (!modelViewer) return null;
    modelViewer.setAttribute("camera-orbit", "-540.9deg 84.49deg 0.4649m");

    if (!modelViewer.model) {
      await new Promise((resolve) => {
        const check = () =>
          modelViewer.model ? resolve() : setTimeout(check, 100);
        check();
      });
    }

    await new Promise((r) => setTimeout(r, 800));

    const canvas = modelViewer.shadowRoot?.querySelector("canvas");
    if (canvas) {
      try {
        return canvas.toDataURL("image/png", 1.0);
      } catch (e) {
        console.warn("Canvas capture failed:", e);
      }
    }
    return null;
  }

  // --- Enhanced render model cards ---
  textureInputs.forEach(({ titleId, fileId, topColorId, bgColorId }, index) => {
    const fileInput = document.getElementById(fileId);
    const titleInput = document.getElementById(titleId);
    const topColorInput = document.getElementById(topColorId);
    const bgColorInput = document.getElementById(bgColorId);
    
    if (!fileInput) return;

    // Keep track of existing cards per input
    let existingCard = null;

    // Handle file input change
    fileInput.addEventListener("change", (e) => {
      handleInputChange();
    });

    // Handle color input changes
    if (topColorInput) {
      topColorInput.addEventListener("change", handleInputChange);
    }
    if (bgColorInput) {
      bgColorInput.addEventListener("change", handleInputChange);
    }
    if (titleInput) {
      titleInput.addEventListener("input", handleInputChange);
    }

    async function handleInputChange() {
      const file = fileInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const textureDataURL = event.target.result;
        const title = titleInput?.value || "Untitled";
        const topMaterialColor = topColorInput?.value || "#ffffff";
        const backgroundColor = bgColorInput?.value || "#f5d2da";

        // Check if a card for this fileId already exists
        existingCard = renderedImages.querySelector(`.rendered-card[data-file-id="${fileId}"]`);

        if (existingCard) {
          // Update existing card's data
          existingCard.dataset.textureDataUrl = textureDataURL;
          existingCard.dataset.title = title;
          existingCard.dataset.topMaterialColor = topMaterialColor;
          existingCard.dataset.backgroundColor = backgroundColor;

          existingCard.style.backgroundColor = backgroundColor;

          const optionTheme = existingCard.querySelector("div");
          if (optionTheme) {
            optionTheme.textContent = `Option - ${index + 1}   Theme - ${title}`;
          }

          const modelViewer = existingCard.querySelector("model-viewer");
          if (modelViewer) {
            // Apply new texture and color
            await tryApplyMaterialTexture(modelViewer, materialName, textureDataURL, topMaterialColor);
          }
        } else {
          // If no existing card, create a new one
          if (renderedImages.querySelectorAll(".rendered-card").length >= 3) {
            alert("Maximum of 3 textures allowed.");
            return;
          }

          const card = document.createElement("div");
          card.className = "rendered-card";
          card.dataset.fileId = fileId;
          card.style.backgroundColor = backgroundColor;
          card.style.cssText = `
            border: 2px solid black;
            border-radius: 20px;
            width: 300px;
            box-shadow: 0 8px 32px rgba(150, 50, 65, 0.11);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 28px 0 18px 0;
            margin: 5px 14px;
          `;

          card.dataset.textureDataUrl = textureDataURL;
          card.dataset.title = title;
          card.dataset.topMaterialColor = topMaterialColor;
          card.dataset.backgroundColor = backgroundColor;

          const optionTheme = document.createElement("div");
          optionTheme.style =
            "font-size:18px;font-weight:400;margin-bottom:7px;color:#212529;text-align:center";
          optionTheme.textContent = `Option - ${index + 1}   Theme - ${title}`;

          const modelViewer = document.createElement("model-viewer");
          modelViewer.src = modelSrc;
          modelViewer.setAttribute("camera-controls", "");
          modelViewer.setAttribute("rotate", "null");
          modelViewer.setAttribute("exposure", "1");
          modelViewer.setAttribute("shadow-intensity", "0.5");
          modelViewer.setAttribute("disable-tap", "");
          modelViewer.setAttribute("disable-pan", "");
          modelViewer.setAttribute("ar", "");
          modelViewer.setAttribute("interaction-prompt", "none");
          modelViewer.setAttribute("camera-orbit", "-540.9deg 84.49deg 0.4649m");
          modelViewer.setAttribute("field-of-view", "33deg");
          modelViewer.style.width = "200px";
          modelViewer.style.height = "200px";
          modelViewer.style.pointerEvents = "none";

          setupModelViewer(modelViewer);
          modelViewer.addEventListener("load", async () => {
            await tryApplyMaterialTexture(
              modelViewer,
              materialName,
              textureDataURL,
              topMaterialColor
            );
          });

          card.appendChild(optionTheme);
          card.appendChild(modelViewer);
          renderedImages.appendChild(card);
        }
      };
      reader.readAsDataURL(file);
    }
  });

  // --- Enhanced PDF Export ---
  const exportBtn = document.getElementById("export_btn");
  if (!exportBtn) return;

  exportBtn.addEventListener("click", async () => {
  const loadingOverlay = document.getElementById("pdfLoadingOverlay");

  // Show loading overlay
  loadingOverlay.style.display = "flex";

  console.log("PDF Export started");

  const cards = document.querySelectorAll(".rendered-card");
  if (!cards.length) {
    loadingOverlay.style.display = "none";
    return alert("No rendered models to export.");
  }

  console.log(`Found ${cards.length} cards to export`);

  try {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      console.error("jsPDF not found");
      loadingOverlay.style.display = "none";
      return alert("jsPDF library not loaded");
    }

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    console.log(`Page size: ${pageWidth} x ${pageHeight}`);

    // 🔹 Count total pages (cover + cards + summary)
    const totalPages = cards.length + 2;

    // --- Cover Page (first page, no page number) ---
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    // Load background image
    const bgImage = new Image();
    bgImage.src = "./assets/pattern/pattern-6.webp";
    await new Promise((res) => { bgImage.onload = res; });

    pdf.addImage(bgImage, "PNG", 0, 0, pageWidth, pageHeight);

    // Logos
    const terraLogo1 = new Image();
    terraLogo1.src = "./assets/Logo/terratechpacks.png";

    const customLogo = new Image();
    customLogo.src =
      document.getElementById("customLogoInput")?.dataset.preview ||
      "./assets/Logo/terratechpacks.png";

    await Promise.all([
      new Promise((res) => (terraLogo1.onload = res)),
      new Promise((res) => (customLogo.onload = res)),
    ]);

    const centerX = pageWidth / 2;
    let currentY1 = pageHeight / 4;

    // Terra logo
    const terraWidth = 250;
    const terraHeight =
      (terraLogo1.naturalHeight / terraLogo1.naturalWidth) * terraWidth;
    pdf.addImage(
      terraLogo1,
      "PNG",
      centerX - terraWidth / 2,
      currentY1,
      terraWidth,
      terraHeight
    );
    currentY1 += terraHeight + 40;

    // X logo
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(60);
    pdf.text("X", centerX, currentY1 + 60, { align: "center" });
    currentY1 += 120;

    // Custom logo
    const customWidth = 250;
    const customHeight =
      (customLogo.naturalHeight / customLogo.naturalWidth) * customWidth;
    pdf.addImage(
      customLogo,
      "PNG",
      centerX - customWidth / 2,
      currentY1,
      customWidth,
      customHeight
    );
    currentY1 += customHeight + 40;

    // --- Start Option Pages ---
    const headerHeight = 110;
    const footerHeight = 60;
    const sideMargin = 30;
    const availableWidth = pageWidth - sideMargin * 2;
    const availableHeight = pageHeight - headerHeight - footerHeight;
    const contentCenterX = pageWidth / 2;
    const contentCenterY = pageHeight / 2;
    const pdfModelSize = 800;

    const terraLogo = new Image();
    terraLogo.src = "./assets/Logo/terratechpacks.png";

    await Promise.race([
      new Promise((res) => (terraLogo.onload = res)),
      new Promise((res) => setTimeout(res, 1000)),
    ]);

    for (let i = 0; i < cards.length; i++) {
      pdf.addPage();

      const card = cards[i];
      const themeText =
        card.querySelector("div")?.textContent ||
        "Option - 1   Theme - Silk Saree";
      const modelTitle =
        card.dataset.title ||
        card.querySelector("p")?.textContent ||
        "Untitled";
      const textureDataURL = card.dataset.textureDataUrl;
      const topMaterialColor = card.dataset.topMaterialColor || "#ffffff";
      const backgroundColor = card.dataset.backgroundColor || "#f5d2da";

      console.log(
        `Card ${i + 1}: ${modelTitle}, has texture: ${!!textureDataURL}, top color: ${topMaterialColor}, bg color: ${backgroundColor}`
      );

      // Background color
      const bgRgb = hexToRgb(backgroundColor);
      if (bgRgb) {
        pdf.setFillColor(bgRgb.r * 255, bgRgb.g * 255, bgRgb.b * 255);
      } else {
        pdf.setFillColor(245, 210, 218);
      }
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      // Header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Option - ${i + 1}`, pageWidth / 2, 70, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(24);
      pdf.text(`Theme - ${modelTitle}`, pageWidth / 2, 105, {
        align: "center",
      });

      // Logo on top right
      if (terraLogo.complete && terraLogo.naturalWidth > 0) {
        const logoHeight = 25;
        const logoWidth =
          (terraLogo.naturalWidth * logoHeight) / terraLogo.naturalHeight;
        const topMargin = 60;
        pdf.addImage(
          terraLogo,
          "PNG",
          pageWidth - logoWidth - 25,
          topMargin,
          logoWidth,
          logoHeight
        );
      }

      // Model capture
      let pdfModelViewer = null;
      let modelImageData = null;
      if (textureDataURL) {
        try {
          const result = await createPDFModelViewer(
            textureDataURL,
            topMaterialColor,
            pdfModelSize
          );
          if (result) {
            pdfModelViewer = result.pdfModelViewer;
            modelImageData = await capturePDFModelImage(pdfModelViewer);
            if (pdfModelViewer && document.body.contains(pdfModelViewer)) {
              document.body.removeChild(pdfModelViewer);
            }
            pdfModelViewer = null;
          }
        } catch (error) {
          console.error("Model capture failed:", error);
          if (pdfModelViewer && document.body.contains(pdfModelViewer)) {
            document.body.removeChild(pdfModelViewer);
          }
        }
      }

      if (modelImageData) {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = modelImageData;
        });

        const imageAspectRatio = img.width / img.height;
        const availableAspectRatio = availableWidth / availableHeight;

        let finalWidth, finalHeight;
        if (imageAspectRatio > availableAspectRatio) {
          finalWidth = availableWidth * 0.95;
          finalHeight = finalWidth / imageAspectRatio;
        } else {
          finalHeight = availableHeight * 0.95;
          finalWidth = finalHeight * imageAspectRatio;
        }

        const imageX = contentCenterX - finalWidth / 2;
        const imageY = contentCenterY - finalHeight / 2;
        pdf.addImage(
          modelImageData,
          "PNG",
          imageX,
          imageY,
          finalWidth,
          finalHeight
        );
      }

      // Footer (page number)
      const pageNumber = i + 2; // +2 because cover is page 1
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(
        `${pageNumber}/${totalPages}`,
        pageWidth / 2,
        pageHeight - 25,
        { align: "center" }
      );
    }

    // --- Summary Page ---
    pdf.addPage();
    pdf.setFillColor(245, 210, 218);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    pdf.text("All Applied Textures", pageWidth / 2, 50, { align: "center" });

    const marginX = 40;
    const startY = 80;
    const spaceBetween = 20;
    let currentY = startY;

    const maxImageWidth = pageWidth - marginX * 2;
    const availableHeight1 = pageHeight - startY - 40;
    const cardsCount = cards.length;
    const maxHeightPerImage =
      (availableHeight1 - (cardsCount - 1) * spaceBetween) / cardsCount;

    for (let i = 0; i < cards.length; i++) {
      const textureDataUrl = cards[i].dataset.textureDataUrl;
      if (!textureDataUrl) continue;

      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;

          let imgWidth = maxImageWidth;
          let imgHeight = imgWidth / aspectRatio;

          if (imgHeight > maxHeightPerImage) {
            imgHeight = maxHeightPerImage;
            imgWidth = imgHeight * aspectRatio;
          }

          const imageX = (pageWidth - imgWidth) / 2;
          pdf.addImage(img, "PNG", imageX, currentY, imgWidth, imgHeight);

          currentY += imgHeight + spaceBetween;
          resolve();
        };
        img.onerror = reject;
        img.src = textureDataUrl;
      });
    }

    // Footer for summary page
    const summaryPageNumber = totalPages;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(
      `${summaryPageNumber}/${totalPages}`,
      pageWidth / 2,
      pageHeight - 25,
      { align: "center" }
    );

    // Save PDF
    console.log("Saving PDF...");
    pdf.save(`Theme_Mockup_${new Date().toISOString().slice(0, 10)}.pdf`);
    console.log("PDF saved successfully!");
  } catch (error) {
    console.error("PDF Export failed:", error);
    alert("PDF Export failed. Check console for details.");
  } finally {
    loadingOverlay.style.display = "none";

    // Reset UI
    renderedImages.innerHTML = "";
    textureInputs.forEach(({ titleId, fileId, topColorId, bgColorId }) => {
      const fileInput = document.getElementById(fileId);
      const titleInput = document.getElementById(titleId);
      const topColorInput = document.getElementById(topColorId);
      const bgColorInput = document.getElementById(bgColorId);

      if (fileInput) fileInput.value = "";
      if (titleInput) titleInput.value = "";
      if (topColorInput) topColorInput.value = "#ffffff";
      if (bgColorInput) bgColorInput.value = "#f5d2da";
    });

    viewerTextureCache.clear();

    customLogoInput.value = null;
    customLogoPreview.src = "";
    customLogoPreview.style.display = "none";

    console.log("All data and UI reset after PDF generation.");
  }
});


      // Handle custom logo upload & preview
    const customLogoInput = document.getElementById("customLogoInput");
    const customLogoPreview = document.getElementById("customLogoPreview");

    if (customLogoInput) {
      customLogoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target.result;

            // show preview in <img>
            if (customLogoPreview) {
              customLogoPreview.src = dataUrl;
              customLogoPreview.style.display = "block";
            }

            // store the dataUrl on the input for PDF export
            customLogoInput.dataset.preview = dataUrl;
          };
          reader.readAsDataURL(file);
        }
      });
    }
});