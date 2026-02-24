// ==========================================
// APP.JS - Inicialização e Controladores de UI
// ==========================================

// --- 1. INICIALIZAÇÃO DO SISTEMA (BOOTSTRAP) ---
window.onload = () => {
    // 1.1 Configurar Tema Salvo (Dark/Light Mode)
    if (localStorage.getItem('ecoTheme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('btn-theme').classList.replace('fa-moon', 'fa-sun');
    }

    // 1.2 Definir Datas Padrão (Hoje / Mês Atual)
    const hoje = new Date();
    document.getElementById('lanc-data').valueAsDate = hoje;
    
    // Formata YYYY-MM
    const mesAtualFormatado = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
    document.getElementById('filtro-mes').value = mesAtualFormatado;
    
    // 1.3 Inicializar Componentes e Motor Lógico
    if (typeof atualizarRegrasLancamento === 'function') atualizarRegrasLancamento();
    if (typeof verificarDataFutura === 'function') verificarDataFutura();
    if (typeof processarRecorrencias === 'function') processarRecorrencias();
    
    // 1.4 Renderizar Tela Inicial
    if (typeof render === 'function') render();
};

// --- 2. CONTROLADOR DE TEMA (DARK MODE) ---
function toggleDarkMode() {
    const body = document.body; 
    const icone = document.getElementById('btn-theme');
    
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    
    // Salva a preferência
    localStorage.setItem('ecoTheme', isDark ? 'dark' : 'light');
    icone.classList.replace(isDark ? 'fa-moon' : 'fa-sun', isDark ? 'fa-sun' : 'fa-moon');
    
    // Re-renderizar gráficos para ajustar as cores ao novo fundo
    if (typeof renderGrafico === 'function') { 
        renderGrafico(); 
        renderGraficoEvolucao(); 
    }
}

// --- 3. CONTROLADOR DE NAVEGAÇÃO (TABS) ---
function navegar(idAba, elementoClicado) {
    // Esconder todas as seções ativas
    document.querySelectorAll('.secao-app').forEach(secao => {
        secao.classList.remove('active');
    });
    
    // Mostrar a nova aba correspondente
    const abaAlvo = document.getElementById('aba-' + idAba);
    if(abaAlvo) abaAlvo.classList.add('active');
    
    // Atualizar classe visual no menu inferior
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (elementoClicado) {
        elementoClicado.classList.add('active');
    } else {
        // Fallback caso a navegação seja acionada por código interno
        const mapaId = {'dashboard':0, 'faturas':1, 'historico':2, 'contas':3, 'config':4}; 
        if (mapaId[idAba] !== undefined) {
            document.querySelectorAll('.menu-item')[mapaId[idAba]].classList.add('active'); 
        }
    }
    
    // Atualizar Título do Cabeçalho
    const itemAtivo = document.querySelector('.menu-item.active span');
    if (itemAtivo) {
        document.getElementById('titulo-aba').innerText = itemAtivo.innerText;
    }
    
    // Rolar página para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Atualizar dados visuais ao trocar de aba
    if (typeof render === 'function') render();
}
