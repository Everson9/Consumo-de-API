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
            
            // Pequeno delay (0.5s) para respeitar o limite de requisições da API gratuita
            await new Promise(r => setTimeout(r, 500));
        } catch (err) {
            console.error(`Erro ao carregar categoria ${cat.id}:`, err);
            document.getElementById(cat.id).innerHTML = '<p class="loading">Erro ao carregar dados.</p>';
        }
    }
}

// Renderiza os cards na linha correspondente
function render(animes, containerId) {
    const el = document.getElementById(containerId);
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
    modalTitle.textContent = data.title;
    modalSynopsis.textContent = data.synopsis;
    trailerContainer.innerHTML = ''; // Limpa conteúdo anterior

    if (data.trailer) {
        // Cria o iframe do YouTube (autoplay desativado para não assustar o usuário)
        const iframe = document.createElement('iframe');
        iframe.src = data.trailer.replace('autoplay=1', 'autoplay=0'); // Garante autoplay off
        iframe.allow = "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        trailerContainer.appendChild(iframe);
    } else {
        // Mensagem caso não exista trailer cadastrado
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
    modal.style.display = 'none';
    trailerContainer.innerHTML = ''; // Para o som do vídeo ao fechar
    document.body.style.overflow = 'auto'; // Reativa scroll do fundo
}

// Eventos de fechamento
closeBtn.onclick = closeModal;
window.onclick = (event) => { if (event.target == modal) closeModal(); }; // Fecha ao clicar fora
document.onkeydown = (e) => { if (e.key === 'Escape') closeModal(); }; // Fecha com ESC

// Lógica das setas laterais (Desktop)
function sideScroll(elementId, direction) {
    const el = document.getElementById(elementId);
    const scrollAmount = 350;
    el.scrollLeft += (direction === 'left' ? -scrollAmount : scrollAmount);
}

// Inicia tudo ao carregar a janela
window.onload = init;