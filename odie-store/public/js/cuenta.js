// Maneja login, registro, "mi cuenta" (historial de pedidos) y logout.
// Este archivo se incluye en login.html, registro.html y mi-cuenta.html;
// cada bloque revisa si el formulario correspondiente existe en la página.

const params = new URLSearchParams(window.location.search);
const redirectTo = params.get('redirect') || 'index.html';

// ---------- LOGIN ----------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageBox = document.getElementById('loginMessage');
        messageBox.className = 'form-message';

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            messageBox.textContent = data.error || 'No se pudo iniciar sesión.';
            messageBox.classList.add('show', 'error');
            return;
        }

        window.location.href = redirectTo;
    });
}

// ---------- REGISTRO ----------
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageBox = document.getElementById('registerMessage');
        messageBox.className = 'form-message';

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            messageBox.textContent = data.error || 'No se pudo crear la cuenta.';
            messageBox.classList.add('show', 'error');
            return;
        }

        messageBox.textContent = 'Cuenta creada. Te enviamos un correo de bienvenida. Redirigiendo...';
        messageBox.classList.add('show', 'success');
        setTimeout(() => { window.location.href = redirectTo; }, 1200);
    });
}

// ---------- MI CUENTA ----------
const ordersList = document.getElementById('ordersList');
if (ordersList) {
    loadAccount();
}

async function loadAccount() {
    const meRes = await fetch('/api/auth/me');
    const me = await meRes.json();

    if (!me.user) {
        window.location.href = 'login.html?redirect=mi-cuenta.html';
        return;
    }

    document.getElementById('accountGreeting').textContent = `Hola, ${me.user.name}`;
    document.getElementById('accountEmail').textContent = me.user.email;

    const ordersRes = await fetch('/api/orders');
    const data = await ordersRes.json();

    if (data.orders.length === 0) {
        ordersList.innerHTML = '<div class="empty-state">Todavía no tienes pedidos. <a href="catalogo.html" style="color:var(--kaki-dark); font-weight:600;">Ir al catálogo →</a></div>';
        return;
    }

    ordersList.innerHTML = data.orders.map(order => `
        <div class="order-card">
            <div class="order-head">
                <span>Pedido #${order.id} · ${order.created_at}</span>
                <span>${order.status}</span>
            </div>
            ${order.items.map(it => `
                <div class="order-line">
                    <span>${it.product_name} (talla ${it.size}) × ${it.quantity}</span>
                    <span>$${(it.unit_price * it.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
            <div class="order-line" style="font-weight:700; border-top:1px solid var(--border); margin-top:6px; padding-top:6px;">
                <span>Total</span>
                <span>$${order.total.toFixed(2)}</span>
            </div>
        </div>
    `).join('');
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = 'index.html';
    });
}
