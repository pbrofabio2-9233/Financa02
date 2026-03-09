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
// ==========================================
// FUNÇÕES DE INTERFACE E NAVEGAÇÃO EM FALTA
// ==========================================

// 1. Filtros de Mês no Extrato
window.mudarMesFiltro = function(direcao) {
    const input = document.getElementById('filtro-mes');
    if(!input || !input.value) return;
    
    let [ano, mes] = input.value.split('-').map(Number);
    mes += direcao;
    
    if(mes > 12) { mes = 1; ano += 1; }
    else if(mes < 1) { mes = 12; ano -= 1; }
    
    input.value = `${ano}-${mes.toString().padStart(2, '0')}`;
    
    if(typeof renderHistorico === 'function') renderHistorico();
    if(typeof renderGrafico === 'function') renderGrafico();
};

// 2. Filtros de Status no Extrato (Botões coloridos)
window.mudarFiltroStatus = function(status, elemento) {
    const inputStatus = document.getElementById('filtro-status');
    if (inputStatus) inputStatus.value = status;
    
    document.querySelectorAll('.status-btn').forEach(btn => btn.classList.remove('active'));
    if(elemento) elemento.classList.add('active');
    
    if(typeof renderHistorico === 'function') renderHistorico();
};

// 3. Área de Nova Conta
window.toggleNovaContaArea = function() {
    const area = document.getElementById('area-nova-conta');
    if(area) area.style.display = area.style.display === 'none' ? 'block' : 'none';
};

// 4. Modais da Aba de Ajustes
window.abrirModalCategorias = function() {
    const m = document.getElementById('modal-categorias');
    m.style.display = 'flex'; 
    setTimeout(() => m.classList.add('active'), 10);
    if(typeof renderModalCategorias === 'function') renderModalCategorias();
};

window.fecharModalCategorias = function() {
    const m = document.getElementById('modal-categorias');
    m.classList.remove('active'); 
    setTimeout(() => m.style.display = 'none', 300);
};

window.abrirModalAparencia = function() {
    const m = document.getElementById('modal-aparencia');
    m.style.display = 'flex'; 
    setTimeout(() => m.classList.add('active'), 10);
};

window.fecharModalAparencia = function() {
    const m = document.getElementById('modal-aparencia');
    m.classList.remove('active'); 
    setTimeout(() => m.style.display = 'none', 300);
};

window.abrirModalSistema = function() {
    const m = document.getElementById('modal-sistema');
    m.style.display = 'flex'; 
    setTimeout(() => m.classList.add('active'), 10);
};

window.fecharModalSistema = function() {
    const m = document.getElementById('modal-sistema');
    m.classList.remove('active'); 
    setTimeout(() => m.style.display = 'none', 300);
};

// 5. Redirecionamento Inteligente das Notificações
window.redirecionarParaLancamento = function(id, data) {
    if(typeof fecharNotificacoes === 'function') fecharNotificacoes();
    
    const inputMes = document.getElementById('filtro-mes');
    if(inputMes && data) {
        inputMes.value = data.substring(0,7);
    }
    
    const tabHist = document.querySelector('.menu-item[onclick*="historico"]');
    if(tabHist) tabHist.click();
    
    setTimeout(() => {
        const icon = document.getElementById(`icon-${id}`);
        const edit = document.getElementById(`edit-lanc-${id}`);
        if(icon && edit) {
            edit.style.display = 'block';
            icon.classList.add('open');
            edit.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 400);
};

window.redirecionarParaFatura = function(contaId, mes) {
    if(typeof fecharNotificacoes === 'function') fecharNotificacoes();
    
    window.cartaoAtivoFatura = contaId;
    const tabFat = document.querySelector('.menu-item[onclick*="faturas"]');
    if(tabFat) tabFat.click();
    
    setTimeout(() => {
        const fatID = `${contaId}-${mes}`;
        const icon = document.getElementById(`icon-det-fat-${fatID}`);
        const edit = document.getElementById(`edit-lanc-det-fat-${fatID}`);
        if(icon && edit) {
            edit.style.display = 'block';
            icon.classList.add('open');
            edit.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 400);
};

// 6. Funções de Backup e Sistema
window.exportarBackup = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `EcoFinance_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if(typeof showToast === 'function') showToast("Backup transferido!", "sucesso");
};

window.importarArquivoJSON = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedDb = JSON.parse(e.target.result);
            if(importedDb.contas && importedDb.lancamentos) {
                db = importedDb;
                if(typeof save === 'function') save();
                alert("Dados restaurados com sucesso! O aplicativo será recarregado.");
                location.reload();
            } else {
                alert("Este ficheiro não parece ser um backup válido do EcoFinance.");
            }
        } catch (err) {
            alert("Erro ao ler o ficheiro.");
        }
    };
    reader.readAsText(file);
};

window.confirmarReset = function() {
    if(typeof abrirConfirmacao === 'function') {
        abrirConfirmacao("CUIDADO: Isto vai apagar TODOS os seus dados irremediavelmente. Tem a certeza?", () => {
            localStorage.removeItem('eco_db');
            location.reload();
        });
    } else {
        if(confirm("CUIDADO: Isto vai apagar TODOS os dados. Continuar?")) {
            localStorage.removeItem('eco_db');
            location.reload();
        }
    }
};
