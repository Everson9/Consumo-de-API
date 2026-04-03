// Configuração das categorias (IDs de gênero da Jikan API)
const categories = [
    { genres: '1,27', id: 'shounenRow' }, // Adventure, Shounen
    { genres: '22,23', id: 'romanceRow' }, // Romance, School
    { genres: '10', id: 'fantasyRow' }    // Fantasy
];

// Gerenciador do Modal
const modal = document.getElementById('trailerModal');
const trailerContainer = document.getElementById('trailerContainer');
const modalTitle = document.getElementById('modalTitle');
const modalSynopsis = document.getElementById('modalSynopsis');
const closeBtn = document.querySelector('.close-modal');

// Inicialização: Carrega as categorias sequencialmente
async function init() {
    for (const cat of categories) {
        try {
            // Busca animes bem avaliados do gênero
            const res = await fetch(`https://api.jikan.moe/v4/anime?genres=${cat.genres}&limit=12&order_by=score&sort=desc`);
            const data = await res.json();
            render(data.data, cat.id);
            
            // Pequeno delay (0.5s) para respeitar o limite de requisições da API gratuita (Rate Limit)
            await new Promise(r => setTimeout(r, 500));
        } catch (err) {
            console.error(`Erro ao carregar categoria ${cat.id}:`, err);
            const container = document.getElementById(cat.id);
            if (container) {
                container.innerHTML = '<p class="loading">Erro ao carregar dados.</p>';
            }
        }
    }
}

// Renderiza os cards na linha correspondente
function render(animes, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    
    el.innerHTML = ''; // Limpa o texto de carregando

    animes.forEach(anime => {
        const div = document.createElement('div');
        div.className = 'anime-card';
        
        // Armazena os dados necessários no próprio elemento para usar no modal
        div.dataset.title = anime.title;
        div.dataset.synopsis = anime.synopsis || 'Sinopse não disponível.';
        div.dataset.trailer = anime.trailer?.embed_url || ''; // URL de embed do YT

        // Injeta o clique para abrir o modal
        div.onclick = () => openModal(div.dataset);

        div.innerHTML = `
            <img src="${anime.images.jpg.image_url}" alt="${anime.title}" loading="lazy">
            <div class="anime-info">
                <span class="score">★ ${anime.score || 'N/A'}</span>
                <h3>${anime.title}</h3>
            </div>
        `;
        el.appendChild(div);
    });
}

// Lógica para abrir o Modal e carregar o trailer
function openModal(data) {
    // RECURSO DE HARDWARE: Feedback tátil (vibração curta)
    if (navigator.vibrate) {
        navigator.vibrate(40); 
    }

    modalTitle.textContent = data.title;
    modalSynopsis.textContent = data.synopsis;
    trailerContainer.innerHTML = ''; // Limpa conteúdo anterior

    if (data.trailer) {
        const iframe = document.createElement('iframe');
        // Garante autoplay off e remove controles desnecessários
        iframe.src = data.trailer.replace('autoplay=1', 'autoplay=0'); 
        iframe.allow = "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        trailerContainer.appendChild(iframe);
    } else {
        trailerContainer.innerHTML = `
            <div class="no-trailer">
                <p>🎬 Trailer não disponível para este título.</p>
            </div>
        `;
    }

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Impede scroll do fundo
}

// Função para fechar o Modal
function closeModal() {
    // RECURSO DE HARDWARE: Vibração bem curta ao fechar
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }

    modal.style.display = 'none';
    trailerContainer.innerHTML = ''; // Para o som do vídeo ao fechar
    document.body.style.overflow = 'auto'; // Reativa scroll do fundo
}

// Eventos de fechamento
if (closeBtn) closeBtn.onclick = closeModal;

window.onclick = (event) => { 
    if (event.target == modal) closeModal(); 
};

document.onkeydown = (e) => { 
    if (e.key === 'Escape') closeModal(); 
};

// Lógica das setas laterais (Desktop)
function sideScroll(elementId, direction) {
    const el = document.getElementById(elementId);
    if (!el) return;

    // RECURSO DE HARDWARE: Vibração leve ao navegar via botão
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }

    const scrollAmount = 350;
    el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
    });
}

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registrado com sucesso!', reg))
            .catch(err => console.warn('Erro ao registrar SW:', err));
    });
}

// Inicia tudo ao carregar a janela
window.onload = init;