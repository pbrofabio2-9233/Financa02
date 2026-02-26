// ==========================================
// APP.JS - Inicialização, Navegação e Tema
// ==========================================

// --- 1. NAVEGAÇÃO DE ABAS (MENU INFERIOR) ---
function navegar(idSecao, elementoClicado) {
    // Esconde todas as abas
    document.querySelectorAll('.secao-app').forEach(secao => {
        secao.classList.remove('active');
    });

    // Remove o status de "ativo" de todos os botões do menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // Mostra a aba correta
    const abaAlvo = document.getElementById(`aba-${idSecao}`);
    if (abaAlvo) {
        abaAlvo.classList.add('active');
    }

    // Destaca o botão clicado
    if (elementoClicado) {
        elementoClicado.classList.add('active');
    }

    // Força uma re-renderização para garantir que os dados estejam atualizados na aba
    if (typeof render === 'function') {
        render();
    }
}

// --- 2. GESTÃO DO TEMA ESCURO (DARK MODE) ---
function toggleDarkMode() {
    // Alterna a classe global no corpo da página
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    
    // Salva a preferência no armazenamento do celular/navegador
    localStorage.setItem('ecoDB_theme', isDark ? 'dark' : 'light');
    
    // Sincroniza visualmente o botão (checkbox) lá na aba de Ajustes
    const toggleAjustes = document.getElementById('toggle-tema-ajustes');
    if (toggleAjustes) {
        toggleAjustes.checked = isDark;
    }
    
    // Pede para os gráficos se redesenharem com as novas cores (linha clara ou escura)
    setTimeout(() => {
        if (typeof renderGrafico === 'function') renderGrafico();
        if (typeof renderGraficoEvolucao === 'function') renderGraficoEvolucao();
    }, 50);
}

// --- 3. INICIALIZAÇÃO DO SISTEMA (BOOT) ---
window.addEventListener('DOMContentLoaded', () => {
    // A. Verifica a preferência de Tema do usuário
    const savedTheme = localStorage.getItem('ecoDB_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
        // Deixa o toggle da aba Ajustes marcado, se já estiver na tela
        const toggleAjustes = document.getElementById('toggle-tema-ajustes');
        if (toggleAjustes) toggleAjustes.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
    }

    // B. Dá a partida no motor principal (Puxa os dados e desenha a tela)
    if (typeof render === 'function') {
        render();
    }
});