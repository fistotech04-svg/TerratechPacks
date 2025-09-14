const API_FETCH  = 'https://terratechpacks.com/App_3D/category_fetch.php';
const API_ADD    = 'https://terratechpacks.com/App_3D/category_add.php';
const API_REMOVE = 'https://terratechpacks.com/App_3D/category_remove.php';

function initCategoryPage() {
    fetchCategories();

    const input = document.getElementById('category-name');
    if (input) {
        input.addEventListener('keyup', function (e) {
            if (e.key === 'Enter') {
                addCategory();
            }
        });
    }
}

// Fetch and render categories
async function fetchCategories() {
    const tableBody = document.getElementById('category-table-body');
    if (!tableBody) return;

    // Show loading message
    tableBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    try {
        const response = await fetch(API_FETCH, { cache: 'no-store' });
        const data = await response.json();

        console.log('Fetched categories:', data);

        if (data.status === 'success') {
            renderCategories(data.data || []);
        } else {
            renderCategories([], data.message || 'Failed to load categories.');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        renderCategories([], 'Error: ' + error.message);
    }
}

// Add a new category
async function addCategory() {
    const input = document.getElementById('category-name');
    if (!input) return alert('Category input not found.');

    const name = input.value.trim();
    if (!name) return alert('Please enter a category name.');

    try {
        const response = await fetch(API_ADD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: name })
        });

        const text = await response.text();
        let data;

        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Invalid JSON from server:', text);
            alert('Server returned an invalid response.');
            return;
        }

        if (data.status === 'success') {
            alert('Category added successfully!');
            input.value = '';
            fetchCategories();
        } else {
            alert('Error adding category: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Add error:', err);
        alert('An error occurred while adding the category.');
    }
}

// ✅ Remove a category
async function removeCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
        const response = await fetch(API_REMOVE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });

        const data = await response.json();

        if (data.status === 'success') {
            alert('Category removed successfully.');
            fetchCategories();
        } else {
            alert('Error removing category: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Remove error:', error);
        alert('An error occurred while removing the category.');
    }
}

// Render categories into table
function renderCategories(categories, errorMessage = '') {
    const tableBody = document.getElementById('category-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (errorMessage) {
        tableBody.innerHTML = `<tr><td colspan="3">${escapeHtml(errorMessage)}</td></tr>`;
        return;
    }

    if (!categories || categories.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3">No categories found</td></tr>';
        return;
    }

    categories.forEach((cat, index) => {
        const id = Number(cat.id);
        const displayName = capitalize(String(cat.category || ''));

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(displayName)}</td>
            <td class="remove">
                <i class="fa-solid fa-trash trash" onclick="removeCategory(${id})" style="cursor:pointer;color:red;"></i>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Capitalize first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Escape HTML to prevent XSS
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
