// Página de carrito: lista los productos, permite ajustar cantidades,
// quitar productos y confirmar el pedido (checkout).

const cartList = document.getElementById('cartList');
const summaryCount = document.getElementById('summaryCount');
const summaryTotal = document.getElementById('summaryTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const cartMessage = document.getElementById('cartMessage');

function money(n) {
    return `$${Number(n).toFixed(2)}`;
}

function rowHtml(item) {
    return `
        <div class="cart-row" data-item-id="${item.id}">
            <div class="thumb"><img src="${item.image_url}" alt="${item.name}"></div>
            <div class="details">
                <h3>${item.name}</h3>
                <div class="meta">Talla ${item.size} · ${money(item.price)} c/u</div>
                <div class="qty-stepper" style="margin-top:8px;">
                    <button type="button" class="qty-minus">−</button>
                    <span>${item.quantity}</span>
                    <button type="button" class="qty-plus">+</button>
                </div>
                <button class="remove-btn">Quitar</button>
            </div>
            <div class="line-price">${money(item.price * item.quantity)}</div>
        </div>
    `;
}

async function loadCart() {
    const res = await fetch('/api/cart');
    const cart = await res.json();

    if (cart.items.length === 0) {
        cartList.innerHTML = '<div class="empty-state">Tu carrito está vacío. <a href="catalogo.html" style="color:var(--kaki-dark); font-weight:600;">Ver catálogo →</a></div>';
    } else {
        cartList.innerHTML = cart.items.map(rowHtml).join('');
    }

    summaryCount.textContent = cart.count;
    summaryTotal.textContent = money(cart.total);
    checkoutBtn.disabled = cart.items.length === 0;

    attachRowEvents();
}

function attachRowEvents() {
    document.querySelectorAll('.cart-row').forEach(row => {
        const itemId = row.dataset.itemId;
        const qtySpan = row.querySelector('.qty-stepper span');

        row.querySelector('.qty-plus').addEventListener('click', async () => {
            const newQty = Number(qtySpan.textContent) + 1;
            await updateQuantity(itemId, newQty);
        });

        row.querySelector('.qty-minus').addEventListener('click', async () => {
            const newQty = Number(qtySpan.textContent) - 1;
            if (newQty < 1) return;
            await updateQuantity(itemId, newQty);
        });

        row.querySelector('.remove-btn').addEventListener('click', async () => {
            await fetch(`/api/cart/items/${itemId}`, { method: 'DELETE' });
            loadCart();
            if (window.refreshHeaderState) window.refreshHeaderState();
        });
    });
}

async function updateQuantity(itemId, quantity) {
    const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
    });
    const data = await res.json();

    if (!res.ok) {
        alert(data.error || 'No se pudo actualizar la cantidad.');
    }

    loadCart();
    if (window.refreshHeaderState) window.refreshHeaderState();
}

checkoutBtn.addEventListener('click', async () => {
    cartMessage.className = 'form-message';
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Procesando...';

    const res = await fetch('/api/orders/checkout', { method: 'POST' });
    const data = await res.json();

    if (res.status === 401) {
        window.location.href = `login.html?redirect=carrito.html`;
        return;
    }

    if (!res.ok) {
        cartMessage.textContent = data.error || 'No se pudo confirmar el pedido.';
        cartMessage.classList.add('show', 'error');
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Confirmar pedido';
        loadCart();
        return;
    }

    window.location.href = `pedido-confirmado.html?order=${data.order.id}`;
});

loadCart();
