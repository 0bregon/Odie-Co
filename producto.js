// Ficha de producto: muestra tallas con su stock real, controla la
// cantidad y agrega al carrito validando disponibilidad.

const container = document.getElementById('productDetail');
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

let selectedSize = null;
let quantity = 1;
let product = null;

function money(n) {
    return `$${Number(n).toFixed(2)}`;
}

function render() {
    const sizesHtml = product.sizes.map(s => `
        <button
            class="size-option ${selectedSize === s.size ? 'selected' : ''}"
            data-size="${s.size}"
            ${s.stock <= 0 ? 'disabled' : ''}
        >${s.size}</button>
    `).join('');

    container.innerHTML = `
        <div class="product-detail">
            <div class="product-photo">
                <img src="${product.image_url}" alt="${product.name}">
            </div>
            <div class="product-info">
                <span class="category">${product.category}</span>
                <h1>${product.name}</h1>
                <div class="price">${money(product.price)}</div>
                <p class="description">${product.description || ''}</p>

                <span class="size-label">Talla</span>
                <div class="size-grid" id="sizeGrid">${sizesHtml}</div>

                <span class="size-label">Cantidad</span>
                <div class="qty-row">
                    <div class="qty-stepper">
                        <button type="button" id="qtyMinus">−</button>
                        <span id="qtyValue">${quantity}</span>
                        <button type="button" id="qtyPlus">+</button>
                    </div>
                    <span id="stockHint" style="font-size:12px; color:var(--muted);"></span>
                </div>

                <button id="addToCartBtn" class="primary-button" style="width:100%;">Agregar al carrito</button>
                <div id="productMessage" class="form-message"></div>
            </div>
        </div>
    `;

    document.querySelectorAll('.size-option').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedSize = btn.dataset.size;
            quantity = 1;
            render();
        });
    });

    document.getElementById('qtyMinus').addEventListener('click', () => {
        if (quantity > 1) {
            quantity--;
            document.getElementById('qtyValue').textContent = quantity;
        }
    });

    document.getElementById('qtyPlus').addEventListener('click', () => {
        const sizeInfo = product.sizes.find(s => s.size === selectedSize);
        const max = sizeInfo ? sizeInfo.stock : 99;
        if (quantity < max) {
            quantity++;
            document.getElementById('qtyValue').textContent = quantity;
        }
    });

    const stockHint = document.getElementById('stockHint');
    if (selectedSize) {
        const sizeInfo = product.sizes.find(s => s.size === selectedSize);
        stockHint.textContent = sizeInfo ? `${sizeInfo.stock} disponibles` : '';
    }

    document.getElementById('addToCartBtn').addEventListener('click', addToCart);
}

async function addToCart() {
    const messageBox = document.getElementById('productMessage');
    messageBox.className = 'form-message';

    if (!selectedSize) {
        messageBox.textContent = 'Selecciona una talla antes de continuar.';
        messageBox.classList.add('show', 'error');
        return;
    }

    const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, size: selectedSize, quantity })
    });

    const data = await res.json();

    if (!res.ok) {
        messageBox.textContent = data.error || 'No se pudo agregar al carrito.';
        messageBox.classList.add('show', 'error');
        return;
    }

    messageBox.textContent = 'Producto agregado al carrito.';
    messageBox.classList.add('show', 'success');

    if (window.refreshHeaderState) window.refreshHeaderState();
}

async function load() {
    if (!slug) {
        container.innerHTML = '<div class="empty-state">Producto no especificado.</div>';
        return;
    }

    const res = await fetch(`/api/products/${encodeURIComponent(slug)}`);
    if (!res.ok) {
        container.innerHTML = '<div class="empty-state">No encontramos ese producto.</div>';
        return;
    }

    const data = await res.json();
    product = data.product;
    render();
}

load();
