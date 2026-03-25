const categories = [
    { genres: '1,27', id: 'shounenRow' },
    { genres: '22,23', id: 'romanceRow' },
    { genres: '10', id: 'fantasyRow' }
];

// Função principal de carregar dados
async function init() {
    for (const cat of categories) {
        try {
            const res = await fetch(`https://api.jikan.moe/v4/anime?genres=${cat.genres}&limit=12&order_by=score&sort=desc`);
            const data = await res.json();
            render(data.data, cat.id);
           
            await new Promise(r => setTimeout(r, 500));
        } catch (err) {
            console.error("Erro na API:", err);
        }
    }
}

// Renderiza os cards no HTML
function render(animes, containerId) {
    const el = document.getElementById(containerId);
    el.innerHTML = ''; //remover

    animes.forEach(anime => {
        const div = document.createElement('div');
        div.className = 'anime-card';
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

// Função das setas laterais
function sideScroll(elementId, direction) {
    const el = document.getElementById(elementId);
    const scrollAmount = 300;
    if (direction === 'left') {
        el.scrollLeft -= scrollAmount;
    } else {
        el.scrollLeft += scrollAmount;
    }
}

window.onload = init;