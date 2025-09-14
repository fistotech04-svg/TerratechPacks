const API_FETCH_CATEGORIES = "https://terratechpacks.com/App_3D/category_fetch.php";
const API_UPLOAD_PATTERN   = "https://terratechpacks.com/App_3D/pattern_add.php";
const API_UPLOAD_IMAGE     = "https://terratechpacks.com/App_3D/upload_to_assets.php";
const API_FETCH_PATTERNS = "https://terratechpacks.com/App_3D/pattern_fetch.php";
const API_DELETE_PATTERNS = "https://terratechpacks.com/App_3D/pattern_remove.php";

function initPatternPage() {
  fetchPatternCategories();
  fetchPatterns(); // ✅ Fetch and render patterns in table
  const uploadBtn = document.getElementById("upload-btn");
  if (uploadBtn) uploadBtn.addEventListener("click", uploadPatternHandler);
}

async function fetchPatternCategories() {
  const categorySelect = document.getElementById("category-select");
  if (!categorySelect) return;

  categorySelect.innerHTML = '<option value="">Loading categories...</option>';

  try {
    const res = await fetch(API_FETCH_CATEGORIES, { cache: "no-store" });
    const data = await res.json();

    console.log("Fetch pattern category",data);

    if (data.status === "success" && Array.isArray(data.data)) {
      updateCategoriesUI(data.data, categorySelect);
    } else {
      categorySelect.innerHTML = '<option value="">No categories available</option>';
    }
  } catch (err) {
    console.error("Error fetching categories:", err);
    categorySelect.innerHTML = '<option value="">Error loading categories</option>';
  }
}

function updateCategoriesUI(categories, categorySelect) {
  categorySelect.innerHTML = '<option value="">-- Select Category --</option>';
  categories.forEach(cat => {
    const option = document.createElement("option");
    // Use category name
    option.value = cat.category;
    option.textContent = cat.category;
    categorySelect.appendChild(option);
  });
}

async function fetchPatterns() {
  const tableBody = document.getElementById("pattern-table-body");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;

  try {
    const res = await fetch(API_FETCH_PATTERNS, { cache: "no-store" });
    const data = await res.json();

    if (data.status === "success" && Array.isArray(data.data)) {
      renderPatternTable(data.data, tableBody);
    } else {
      tableBody.innerHTML = `<tr><td colspan="4">No patterns found.</td></tr>`;
    }
  } catch (err) {
    console.error("Error fetching patterns:", err);
    tableBody.innerHTML = `<tr><td colspan="4">Error loading patterns.</td></tr>`;
  }
}

function renderPatternTable(patterns, tableBody) {
  tableBody.innerHTML = "";

  if (!patterns.length) {
    tableBody.innerHTML = `<tr><td colspan="4">No patterns available.</td></tr>`;
    return;
  }

  patterns.forEach((pattern, index) => {
    const row = document.createElement("tr");

    const imageUrl = `https://terratechpacks.com/App_3D/Patterns/${pattern.pattern_url}`;
    const escapedCategory = escapeHtml(pattern.category_name || "");
    const escapedUrl = escapeHtml(pattern.pattern_url || "");

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapedCategory}</td>
      <td><img src="${imageUrl}" alt="Pattern" style="max-width: 100px;" /></td>
      <td><i class="fa-solid fa-trash trash" data-id="${pattern.id}" style="cursor:pointer;color:red;"></i></td>
      
    `;

    tableBody.appendChild(row);
  });

  // Attach delete handlers (optional)
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this pattern?")) {
        deletePattern(id);
      }
    });
  });
}


async function uploadPatternHandler() {
  const categorySelect = document.getElementById("category-select");
  const fileInput = document.getElementById("pattern-file");
  if (!categorySelect || !fileInput) return;

  const categoryName = categorySelect.value.trim();
  const file = fileInput.files[0];

  if (!categoryName) {
    alert("Please select a category.");
    return;
  }
  if (!file) {
    alert("Please select a pattern file.");
    return;
  }

  try {
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ["jpg", "jpeg", "png", "gif"];
    if (!allowed.includes(ext)) {
      alert("Invalid file type");
      return;
    }

    const filename = `${categoryName}_${Date.now()}.${ext}`;

    const uploadRes = await uploadToAssets(file, filename);
    if (!uploadRes || !uploadRes.success) {
      alert("Failed to upload file.");
      return;
    }

    const res = await fetch(API_UPLOAD_PATTERN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_name: categoryName,
        pattern_url: filename   // ⬅️ Only the filename sent to backend
      })
    });

    const result = await res.json();
    if (result.status === "success") {
  alert("Pattern uploaded successfully");
  fileInput.value = "";
  categorySelect.value = "";
  fetchPatterns();

  // ✅ Clear preview image
  const previewImage = document.getElementById("preview-image");
  if (previewImage) {
    previewImage.src = "";
    previewImage.style.display = "none";
  }
}
 else {
      alert("Error: " + (result.message || "Upload failed"));
    }
  } catch (err) {
    console.error("Upload error:", err);
    alert("Unexpected error during upload");
  }
}


async function uploadToAssets(file, filename) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("filename", filename);

  const response = await fetch(API_UPLOAD_IMAGE, {
    method: "POST",
    body: formData
  });

  return await response.json();
}

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("pattern-file");
  const previewImg = document.getElementById("preview-image");

  fileInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) {
      previewImg.style.display = "none";
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      previewImg.src = e.target.result;
      previewImg.style.display = "block";
    };
    reader.readAsDataURL(file);
  });

  initPatternPage(); // Make sure to call your init here
});


async function deletePattern(id) {
  try {
    const res = await fetch(API_DELETE_PATTERNS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });

    const data = await res.json();
    if (data.status === "success") {
      alert("Pattern deleted successfully.");
      fetchPatterns(); // Refresh table
    } else {
      alert("Error: " + (data.message || "Unable to delete pattern."));
    }
  } catch (err) {
    console.error("Delete error:", err);
    alert("Unexpected error occurred.");
  }
}


function escapeHtml(unsafe) {
  return String(unsafe).replace(/[&<>"'`=\/]/g, function (s) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#96;',
      '=': '&#61;'
    }[s];
  });
}
