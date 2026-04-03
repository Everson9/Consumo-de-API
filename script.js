// Configuração das categorias (IDs das fileiras e IDs dos gêneros na Jikan API)
const categories = [
    { genres: '1,27', id: 'shounenRow' },
    { genres: '22,23', id: 'romanceRow' },
    { genres: '10', id: 'fantasyRow' }
];

// 1. Inicialização ao carregar a página
async function init() {
    for (const cat of categories) {
        try {
            // Busca animes por gênero, ordenados por nota
            const res = await fetch(`https://api.jikan.moe/v4/anime?genres=${cat.genres}&limit=12&order_by=score&sort=desc`);
            const data = await res.json();
            render(data.data, cat.id);
            
            // Delay de 500ms entre as chamadas para não dar erro de "Rate Limit" na API
            await new Promise(r => setTimeout(r, 500));
        } catch (err) {
            console.error("Erro ao buscar dados da API:", err);
        }
    }
}

// 2. Renderiza os cards de anime no HTML
function render(animes, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = ''; 

    animes.forEach(anime => {
        const div = document.createElement('div');
        div.className = 'anime-card';
        
        // Evento de clique para abrir o modal com os dados do anime
        div.onclick = () => {
            openModal({
                title: anime.title,
                synopsis: anime.synopsis || 'Sinopse não disponível.',
                trailer: anime.trailer?.embed_url || null
            });
        };

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

// 3. Função do Modal com Recurso de Hardware (Vibration API)
function openModal(anime) {
    const modal = document.getElementById('trailerModal');
    
    // STRIKE: Uso de recurso de hardware (Vibração)
    if ("vibrate" in navigator) {
        navigator.vibrate(50); // Vibra por 50ms ao clicar
    }

    document.getElementById('modalTitle').innerText = anime.title;
    document.getElementById('modalSynopsis').innerText = anime.synopsis;
    
    const container = document.getElementById('trailerContainer');
    if (anime.trailer) {
        // Adiciona o trailer do YouTube se disponível
        container.innerHTML = `<iframe src="${anime.trailer}" allowfullscreen></iframe>`;
    } else {
        container.innerHTML = `<div class="no-trailer"><p>Trailer indisponível para este título.</p></div>`;
    }
    
    modal.style.display = 'block';
}

// 4. Fechar o Modal
document.querySelector('.close-modal').onclick = function() {
    const modal = document.getElementById('trailerModal');
    modal.style.display = 'none';
    document.getElementById('trailerContainer').innerHTML = ''; // Para o vídeo ao fechar
};

// Fecha se clicar fora da caixa branca
window.onclick = function(event) {
    const modal = document.getElementById('trailerModal');
    if (event.target == modal) {
        modal.style.display = 'none';
        document.getElementById('trailerContainer').innerHTML = '';
    }
};

// 5. Função das setas de navegação (Scroll Horizontal)
function sideScroll(elementId, direction) {
    const el = document.getElementById(elementId);
    const scrollAmount = 300;
    if (direction === 'left') {
        el.scrollLeft -= scrollAmount;
    } else {
        el.scrollLeft += scrollAmount;
    }
}

// Inicia o projeto
window.onload = init;