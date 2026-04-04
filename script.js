// ==============================
// CONFIGURAÇÃO
// ==============================
const categories = [
    { genres: '1,27', id: 'shounenRow' },
    { genres: '22,23', id: 'romanceRow' },
    { genres: '10',   id: 'fantasyRow'  }
];

// Wake Lock (mantém tela ligada durante trailer)
let wakeLock = null;

// Prompt de instalação PWA
let deferredInstallPrompt = null;

// ==============================
// 1. INICIALIZAÇÃO
// ==============================
window.addEventListener('load', () => {
    init();
    setupInstallPrompt();
});

async function init() {
    for (const cat of categories) {
        // Mostra skeletons enquanto carrega
        renderSkeletons(cat.id);

        try {
            const res = await fetch(
                `https://api.jikan.moe/v4/anime?genres=${cat.genres}&limit=12&order_by=score&sort=desc`
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            render(data.data, cat.id);

        } catch (err) {
            console.error(`Erro ao buscar categoria ${cat.id}:`, err);
            renderError(cat.id);
        }

        // Rate limit da Jikan API (máx 3 req/s)
        await new Promise(r => setTimeout(r, 500));
    }
}

// ==============================
// 2. SKELETONS (Loading)
// ==============================
function renderSkeletons(containerId, count = 8) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = Array(count)
        .fill('<div class="skeleton" aria-hidden="true"></div>')
        .join('');
}

// ==============================
// 3. ERRO DE CARREGAMENTO
// ==============================
function renderError(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
        <p style="color: #64748b; font-size: 0.85rem; padding: 20px 0; font-style: italic;">
            Não foi possível carregar. Verifique sua conexão.
        </p>`;
}

// ==============================
// 4. RENDERIZA CARDS
// ==============================
function render(animes, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';

    animes.forEach((anime, i) => {
        const div = document.createElement('div');
        div.className = 'anime-card';
        div.setAttribute('role', 'listitem');
        div.setAttribute('tabindex', '0');
        div.setAttribute('aria-label', `Ver trailer de ${anime.title}`);
        div.style.animationDelay = `${i * 60}ms`;

        const score  = anime.score ? `★ ${anime.score}` : '★ N/A';
        const imgUrl = anime.images?.jpg?.image_url || '';
        const title  = anime.title || 'Sem título';

        // Cria os elementos sem innerHTML para evitar XSS
        const img = document.createElement('img');
        img.src     = imgUrl;
        img.alt     = title;
        img.loading = 'lazy';
        img.width   = 195;
        img.height  = 280;
        img.onerror = () => {
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="195" height="280" fill="%231e293b"><rect width="195" height="280"/><text x="50%" y="50%" fill="%2364748b" text-anchor="middle" font-size="12" dy=".3em">Sem imagem</text></svg>';
        };

        const info = document.createElement('div');
        info.className = 'anime-info';

        const scoreEl = document.createElement('span');
        scoreEl.className = 'score';
        scoreEl.textContent = score;

        const titleEl = document.createElement('h3');
        titleEl.textContent = title;

        info.appendChild(scoreEl);
        info.appendChild(titleEl);
        div.appendChild(img);
        div.appendChild(info);

        // Clique e teclado
        const animeData = {
            title:    title,
            synopsis: anime.synopsis || 'Sinopse não disponível.',
            trailer:  anime.trailer?.embed_url || null
        };

        div.addEventListener('click', () => openModal(animeData));
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal(animeData);
            }
        });

        el.appendChild(div);
    });
}

// ==============================
// 5. MODAL + HARDWARE
// ==============================
function openModal(anime) {
    const modal = document.getElementById('trailerModal');

    // HARDWARE 1: Vibration API (feedback tátil)
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }

    // Atualiza textos com textContent (seguro contra XSS)
    document.getElementById('modalTitle').textContent    = anime.title;
    document.getElementById('modalSynopsis').textContent = anime.synopsis;

    // Monta o trailer
    const container = document.getElementById('trailerContainer');
    if (anime.trailer) {
        // Remove parâmetros extras e adiciona autoplay + rel=0
        const baseUrl  = anime.trailer.split('?')[0];
        const safeUrl  = `${baseUrl}?autoplay=1&rel=0&modestbranding=1`;
        const iframe   = document.createElement('iframe');
        iframe.src     = safeUrl;
        iframe.title   = `Trailer de ${anime.title}`;
        iframe.allow   = 'autoplay; encrypted-media; fullscreen';
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';
        container.innerHTML = '';
        container.appendChild(iframe);

        // HARDWARE 2: Screen Wake Lock (impede tela apagar durante trailer)
        requestWakeLock();

    } else {
        container.innerHTML = '';
        const noTrailer = document.createElement('div');
        noTrailer.className = 'no-trailer';
        noTrailer.innerHTML = '<span>📺</span><p>Trailer indisponível para este título.</p>';
        container.appendChild(noTrailer);
    }

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Trava scroll do fundo

    // Move foco para o modal (acessibilidade)
    document.querySelector('.close-modal').focus();
}

// ==============================
// 6. FECHAR MODAL
// ==============================
function closeModal() {
    const modal = document.getElementById('trailerModal');
    modal.style.display = 'none';
    document.getElementById('trailerContainer').innerHTML = '';
    document.body.style.overflow = '';

    // Libera Wake Lock
    releaseWakeLock();
}

// Handler do botão X
document.querySelector('.close-modal').addEventListener('click', closeModal);

// Fecha clicando no fundo
window.addEventListener('click', (e) => {
    const modal = document.getElementById('trailerModal');
    if (e.target === modal) closeModal();
});

// Fecha com ESC (acessibilidade)
window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('trailerModal');
    if (e.key === 'Escape' && modal.style.display === 'block') closeModal();
});

// ==============================
// 7. WAKE LOCK API
// ==============================
async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (err) {
        console.log('Wake Lock indisponível:', err.message);
    }
}

async function releaseWakeLock() {
    if (wakeLock) {
        await wakeLock.release();
        wakeLock = null;
    }
}

// Re-adquire wake lock quando a aba voltar ao foco
document.addEventListener('visibilitychange', () => {
    const modal = document.getElementById('trailerModal');
    if (wakeLock === null && document.visibilityState === 'visible' && modal.style.display === 'block') {
        requestWakeLock();
    }
});

// ==============================
// 8. SCROLL HORIZONTAL (SETAS)
// ==============================
function sideScroll(elementId, direction) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const amount = direction === 'left' ? -320 : 320;
    el.scrollBy({ left: amount, behavior: 'smooth' });
}

// ==============================
// 9. PWA - PROMPT DE INSTALAÇÃO
// ==============================
function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;

        const toast   = document.getElementById('installToast');
        const btn     = document.getElementById('installBtn');
        const dismiss = document.querySelector('.toast-dismiss');

        if (!toast) return;

        // Mostra toast após 3s
        setTimeout(() => { toast.hidden = false; }, 3000);

        btn.addEventListener('click', async () => {
            toast.hidden = true;
            if (!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            console.log(`Instalação: ${outcome}`);
            deferredInstallPrompt = null;
        });

        dismiss.addEventListener('click', () => { toast.hidden = true; });
    });

    window.addEventListener('appinstalled', () => {
        console.log('✅ AnimeFlux instalado!');
        deferredInstallPrompt = null;
        const toast = document.getElementById('installToast');
        if (toast) toast.hidden = true;
    });
}