// Catálogo: carga productos desde la base de datos real (vía API),
// permite filtrar por categoría y muestra disponibilidad por producto.

const grid = document.getElementById('productGrid');
const filtersBox = document.getElementById('categoryFilters');

const params = new URLSearchParams(window.location.search);
let currentCategory = params.get('category') || '';

function money(n) {
    return `$${Number(n).toFixed(2)}`;
}

function productCardHtml(p) {
    const stockClass = p.in_stock ? 'in-stock' : 'out-stock';
    const stockText = p.in_stock ? 'Disponible' : 'Agotado';

    return `
        <a class="product-card" href="producto.html?slug=${encodeURIComponent(p.slug)}">
            <div class="thumb">
                <img src="${p.image_url}" alt="${p.name}" loading="lazy">
            </div>
            <div class="info">
                <span class="category">${p.category}</span>
                <h3>${p.name}</h3>
                <div class="price-row">
                    <span class="price">${money(p.price)}</span>
                    <span class="stock-pill ${stockClass}">${stockText}</span>
                </div>
            </div>
        </a>
    `;
}

async function loadCategories() {
    const res = await fetch('/api/products/categories');
    const data = await res.json();

    data.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-chip' + (cat === currentCategory ? ' active' : '');
        btn.textContent = cat;
        btn.dataset.category = cat;
        btn.addEventListener('click', () => selectCategory(cat));
        filtersBox.appendChild(btn);
    });

    // marcar "Todos" si no hay categoría seleccionada
    const allBtn = filtersBox.querySelector('[data-category=""]');
    if (!currentCategory) allBtn.classList.add('active');
    allBtn.addEventListener('click', () => selectCategory(''));
}

function selectCategory(cat) {
    currentCategory = cat;
    [...filtersBox.children].forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === cat);
    });
    loadProducts();
}

async function loadProducts() {
    grid.innerHTML = '<div class="empty-state">Cargando catálogo...</div>';

    const url = currentCategory
        ? `/api/products?category=${encodeURIComponent(currentCategory)}`
        : '/api/products';

    const res = await fetch(url);
    const data = await res.json();

    if (data.products.length === 0) {
        grid.innerHTML = '<div class="empty-state">No hay productos en esta categoría todavía.</div>';
        return;
    }

    grid.innerHTML = data.products.map(productCardHtml).join('');
}

loadCategories();
loadProducts();
