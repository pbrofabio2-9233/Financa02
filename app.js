// ==========================================
// APP.JS - Inicialização, Navegação e Tema (v25.8.1)
// ==========================================

function navegar(idSecao, elementoClicado) {
    document.querySelectorAll('.secao-app').forEach(secao => {
        secao.classList.remove('active');
    });

    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    const abaAlvo = document.getElementById(`aba-${idSecao}`);
    if (abaAlvo) abaAlvo.classList.add('active');

    if (elementoClicado) elementoClicado.classList.add('active');

    // MÁGICA DO CABEÇALHO DINÂMICO
    const titulos = {
        'dashboard': { titulo: 'Visão Geral', sub: 'O seu copiloto financeiro' },
        'faturas': { titulo: 'Faturas e Cartões', sub: 'Gestão de Crédito e Limites' },
        'historico': { titulo: 'Extrato', sub: 'Histórico de Movimentações' },
        'contas': { titulo: 'Minhas Contas', sub: 'Saldos, Poupança e Cartões' },
        'config': { titulo: 'Ajustes', sub: 'Preferências e Segurança' },
        'roadmap': { titulo: 'Mapa de Evolução', sub: 'O futuro do app' }
    };
    
    const headerTitulo = document.getElementById('titulo-aba');
    const headerSub = document.getElementById('subtitulo-header');
    
    if (headerTitulo && titulos[idSecao]) {
        headerTitulo.innerText = titulos[idSecao].titulo;
        if(headerSub) headerSub.innerText = titulos[idSecao].sub;
    }

    if (typeof render === 'function') render();
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('ecoDB_theme', isDark ? 'dark' : 'light');
    
    // CORREÇÃO UX: Força o navegador a inverter ícones nativos (como o calendário) e barras de rolagem
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    
    const toggleAjustes = document.getElementById('toggle-tema-ajustes');
    if (toggleAjustes) toggleAjustes.checked = isDark;
    
    setTimeout(() => {
        if (typeof renderGrafico === 'function') renderGrafico();
        if (typeof renderGraficoEvolucao === 'function') renderGraficoEvolucao();
    }, 50);
}

window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('ecoDB_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
        document.documentElement.style.colorScheme = 'dark'; // Aplica no load
        const toggleAjustes = document.getElementById('toggle-tema-ajustes');
        if (toggleAjustes) toggleAjustes.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.style.colorScheme = 'light';
    }
    
    if (typeof render === 'function') render();
});
