// Se incluye en TODAS las páginas (y se carga antes que los demás scripts).

// Convierte texto en algo seguro para insertar dentro de HTML.
// Úsalo siempre que metas datos (nombres, descripciones, etc.) en un innerHTML.
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Solo permite redirigir a páginas del propio sitio (ej: "carrito.html").
// Evita que alguien arme un enlace de login que mande al usuario a otro sitio.
function safeRedirect(target, fallback = 'index.html') {
    return /^[a-z0-9-]+\.html$/i.test(target || '') ? target : fallback;
}

// Fecha legible en español
function formatDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('es-PA', { dateStyle: 'medium', timeStyle: 'short' });
}

// Mantiene el header al día:
// - Si hay sesión iniciada, el ícono de cuenta lleva a "Mi cuenta"; si no, a "Iniciar sesión".
// - Muestra cuántas unidades hay en el carrito.

async function refreshHeaderState() {
    try {
        const [meRes, cartRes] = await Promise.all([
            fetch('/api/auth/me'),
            fetch('/api/cart')
        ]);

        const me = await meRes.json();
        const cart = await cartRes.json();

        const accountLink = document.getElementById('navAccountLink');
        if (accountLink) {
            if (me.user) {
                accountLink.href = 'mi-cuenta.html';
                accountLink.setAttribute('aria-label', `Mi cuenta (${me.user.name})`);
            } else {
                accountLink.href = 'login.html';
                accountLink.setAttribute('aria-label', 'Iniciar sesión');
            }
        }

        const cartCount = document.getElementById('navCartCount');
        if (cartCount) {
            if (cart.count > 0) {
                cartCount.textContent = cart.count;
                cartCount.style.display = 'flex';
            } else {
                cartCount.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('No se pudo actualizar el estado del header:', err);
    }
}

document.addEventListener('DOMContentLoaded', refreshHeaderState);
