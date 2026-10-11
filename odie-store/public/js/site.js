// Se incluye en TODAS las páginas. Mantiene el header al día:
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
