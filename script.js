// ==============================
// CONFIGURAÇÃO
// ==============================
const categories = [
    { genres: '1,27',  id: 'shounenRow', label: 'Shounen & Aventura' },
    { genres: '22,23', id: 'romanceRow', label: 'Romance & Escolar'  },
    { genres: '10',    id: 'fantasyRow', label: 'Fantasia & Isekai'  }
];

let wakeLock              = null;
let deferredInstallPrompt = null;
let notificationTimer     = null;

// Pool de animes para notificações periódicas
const notificationAnimes = [
    { title: 'Fullmetal Alchemist: Brotherhood', emoji: '⚗️' },
    { title: 'Steins;Gate',                      emoji: '⏳' },
    { title: 'Violet Evergarden',                emoji: '💌' },
    { title: 'Attack on Titan',                  emoji: '⚔️' },
    { title: 'Your Lie in April',                emoji: '🎹' },
    { title: 'Demon Slayer',                     emoji: '🔥' },
];

// ==============================
// 1. INICIALIZAÇÃO
// ==============================
window.addEventListener('load', () => {
    init();
    setupInstallPrompt();
    setupNotificationButton();
});

async function init() {
    for (const cat of categories) {
        renderSkeletons(cat.id);
        try {
            const res = await fetch(
                `https://api.jikan.moe/v4/anime?genres=${cat.genres}&limit=12&order_by=score&sort=desc`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            render(data.data, cat.id, cat.label);
        } catch (err) {
            console.error(`Erro ao buscar ${cat.id}:`, err);
            renderError(cat.id);
        }
        await new Promise(r => setTimeout(r, 500));
    }

    // Notifica quando tudo carregou
    notifyIfPermitted(
        '✅ AnimeFlux atualizado!',
        'Todos os animes foram carregados. Confira as novidades!'
    );
}

// ==============================
// 2. SKELETONS
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
    el.innerHTML = `<p style="color:#64748b;font-size:0.85rem;padding:20px 0;font-style:italic;">
        Não foi possível carregar. Verifique sua conexão.</p>`;
}

// ==============================
// 4. RENDERIZA CARDS
// ==============================
function render(animes, containerId, categoryLabel) {
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

        const img       = document.createElement('img');
        img.src         = imgUrl;
        img.alt         = title;
        img.loading     = 'lazy';
        img.width       = 195;
        img.height      = 280;
        img.onerror     = () => {
            img.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="195" height="280" fill="%231e293b"><rect width="195" height="280"/><text x="50%" y="50%" fill="%2364748b" text-anchor="middle" font-size="12" dy=".3em">Sem imagem</text></svg>`;
        };

        const info      = document.createElement('div');
        info.className  = 'anime-info';

        const scoreEl       = document.createElement('span');
        scoreEl.className   = 'score';
        scoreEl.textContent = score;

        const titleEl       = document.createElement('h3');
        titleEl.textContent = title;

        info.appendChild(scoreEl);
        info.appendChild(titleEl);
        div.appendChild(img);
        div.appendChild(info);

        const animeData = {
            title:    title,
            synopsis: anime.synopsis || 'Sinopse não disponível.',
            trailer:  anime.trailer?.embed_url || null,
            category: categoryLabel
        };

        div.addEventListener('click',   () => openModal(animeData));
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
// 5. MODAL
// ==============================
function openModal(anime) {
    const modal     = document.getElementById('trailerModal');
    const container = document.getElementById('trailerContainer');

    document.getElementById('modalTitle').textContent    = anime.title;
    document.getElementById('modalSynopsis').textContent = anime.synopsis;

    if (anime.trailer) {
        const baseUrl          = anime.trailer.split('?')[0];
        const safeUrl          = `${baseUrl}?autoplay=1&rel=0&modestbranding=1`;
        const iframe           = document.createElement('iframe');
        iframe.src             = safeUrl;
        iframe.title           = `Trailer de ${anime.title}`;
        iframe.allow           = 'autoplay; encrypted-media; fullscreen';
        iframe.allowFullscreen = true;
        iframe.loading         = 'lazy';
        container.innerHTML    = '';
        container.appendChild(iframe);
        requestWakeLock();
    } else {
        container.innerHTML = '';
        const noTrailer     = document.createElement('div');
        noTrailer.className = 'no-trailer';
        noTrailer.innerHTML = '<span>📺</span><p>Trailer indisponível para este título.</p>';
        container.appendChild(noTrailer);
    }

    modal.style.display          = 'block';
    document.body.style.overflow = 'hidden';
    document.querySelector('.close-modal').focus();
}

// ==============================
// 6. FECHAR MODAL
// ==============================
function closeModal() {
    document.getElementById('trailerModal').style.display = 'none';
    document.getElementById('trailerContainer').innerHTML = '';
    document.body.style.overflow = '';
    releaseWakeLock();
}

document.querySelector('.close-modal').addEventListener('click', closeModal);

window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('trailerModal')) closeModal();
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('trailerModal').style.display === 'block') {
        closeModal();
    }
});

// ==============================
// 7. WAKE LOCK
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
    if (wakeLock) { await wakeLock.release(); wakeLock = null; }
}

document.addEventListener('visibilitychange', () => {
    const modal = document.getElementById('trailerModal');
    if (!wakeLock && document.visibilityState === 'visible' && modal.style.display === 'block') {
        requestWakeLock();
    }
});

// ==============================
// 8. SCROLL HORIZONTAL
// ==============================
function sideScroll(elementId, direction) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
}

// ==============================
// 9. 🔔 NOTIFICAÇÕES (Hardware)
// ==============================
function setupNotificationButton() {
    const btn = document.getElementById('notifyBtn');
    if (!btn) return;

    updateNotifyButton(btn);

    btn.addEventListener('click', async () => {
        if (!('Notification' in window)) {
            alert('Seu navegador não suporta notificações.');
            return;
        }

        // Se já tem permissão → dispara demo imediata
        if (Notification.permission === 'granted') {
            showDemoNotification();
            return;
        }

        if (Notification.permission === 'denied') {
            alert('Notificações bloqueadas. Habilite nas configurações do seu navegador/celular.');
            return;
        }

        // Pede permissão ao usuário
        const permission = await Notification.requestPermission();
        updateNotifyButton(btn);

        if (permission === 'granted') {
            notifyIfPermitted(
                '🎌 AnimeFlux ativado!',
                'Você receberá alertas sobre animes em destaque.'
            );
            startPeriodicNotifications();
        }
    });

    // Se já tinha permissão de uma sessão anterior, retoma as periódicas
    if (Notification.permission === 'granted') {
        startPeriodicNotifications();
    }
}

function updateNotifyButton(btn) {
    if (!btn) return;
    if (Notification.permission === 'granted') {
        btn.textContent = '🔔 Notificações ativas';
        btn.classList.add('notify-active');
        btn.classList.remove('notify-blocked');
    } else if (Notification.permission === 'denied') {
        btn.textContent = '🔕 Bloqueadas';
        btn.classList.add('notify-blocked');
        btn.classList.remove('notify-active');
    } else {
        btn.textContent = '🔔 Ativar alertas';
    }
}

// Envia a notificação via Service Worker (funciona em background no mobile)
async function notifyIfPermitted(title, body) {
    if (Notification.permission !== 'granted') return;

    const icon = '/public/icons/android/mipmap-xxxhdpi/ic_launcher.png';

    try {
        if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification(title, {
                body,
                icon,
                badge:   '/public/icons/android/mipmap-mdpi/ic_launcher.png',
                vibrate: [100, 50, 100],
                tag:     'animeflux-alert',
                renotify: true,
                data:    { url: '/' }
            });
        } else {
            new Notification(title, { body, icon });
        }
    } catch (err) {
        console.warn('Erro ao enviar notificação:', err);
    }
}

// Demonstração imediata (botão clicado com permissão já ativa)
function showDemoNotification() {
    const random = notificationAnimes[Math.floor(Math.random() * notificationAnimes.length)];
    notifyIfPermitted(
        `${random.emoji} Destaque AnimeFlux`,
        `"${random.title}" está entre os mais assistidos agora!`
    );
}

// Notificações periódicas a cada 2 minutos (demo)
function startPeriodicNotifications() {
    if (notificationTimer) return;
    notificationTimer = setInterval(() => {
        if (Notification.permission !== 'granted') {
            clearInterval(notificationTimer);
            return;
        }
        const random = notificationAnimes[Math.floor(Math.random() * notificationAnimes.length)];
        notifyIfPermitted(
            `${random.emoji} Em alta agora`,
            `"${random.title}" está bombando no AnimeFlux!`
        );
    }, 2 * 60 * 1000);
}

// ==============================
// 10. PWA - INSTALL PROMPT
// ==============================
function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        const toast   = document.getElementById('installToast');
        const btn     = document.getElementById('installBtn');
        const dismiss = document.querySelector('.toast-dismiss');
        if (!toast) return;
        setTimeout(() => { toast.hidden = false; }, 4000);
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
        deferredInstallPrompt = null;
        const toast = document.getElementById('installToast');
        if (toast) toast.hidden = true;
    });
}