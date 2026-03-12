// ==========================================
// APP.JS - Navegação, Temas e Sistema (Limpo e Otimizado)
// ==========================================

// ----------------------------------------------------
// 1. GESTÃO DE MODAIS E SALÁRIOS
// ----------------------------------------------------
window.abrirModalSalarios = function() {
    const m = document.getElementById('modal-salarios');
    if (m) {
        m.style.display = 'flex';
        setTimeout(() => m.classList.add('active'), 10);
        if(typeof renderListaSalarios === 'function') renderListaSalarios();
    }
};

window.fecharModalSalarios = function() {
    const m = document.getElementById('modal-salarios');
    if (m) {
        m.classList.remove('active');
        setTimeout(() => m.style.display = 'none', 300);
    }
};

// ----------------------------------------------------
// 2. GESTÃO DE TEMAS E APARÊNCIA
// ----------------------------------------------------
window.abrirModalAparencia = function() {
    const m = document.getElementById('modal-aparencia');
    if (m) {
        m.style.display = 'flex';
        setTimeout(() => m.classList.add('active'), 10);
    }
};

window.fecharModalAparencia = function() {
    const m = document.getElementById('modal-aparencia');
    if (m) {
        m.classList.remove('active');
        setTimeout(() => m.style.display = 'none', 300);
    }
};

window.selecionarTema = function(tema) {
    document.body.classList.remove('dark-mode', 'ocean-mode');
    
    if (tema === 'dark') document.body.classList.add('dark-mode');
    else if (tema === 'ocean') document.body.classList.add('ocean-mode');
    
    // Salva na memória correta
    localStorage.setItem('eco_tema', tema);
    
    // Força o redesenho dos gráficos para adaptarem a cor das fontes
    if (typeof window.renderGrafico === 'function') window.renderGrafico();
    if (typeof window.renderGraficoEvolucao === 'function') window.renderGraficoEvolucao();
    
    fecharModalAparencia();
};

// ----------------------------------------------------
// 3. SISTEMA, BACKUPS E RESET
// ----------------------------------------------------
window.abrirModalSistema = function() {
    const m = document.getElementById('modal-sistema');
    if (m) {
        m.style.display = 'flex';
        setTimeout(() => m.classList.add('active'), 10);
    }
};

window.fecharModalSistema = function() {
    const m = document.getElementById('modal-sistema');
    if (m) {
        m.classList.remove('active');
        setTimeout(() => m.style.display = 'none', 300);
    }
};

window.exportarBackup = function() {
    if (!window.db) return alert("Erro: Banco de dados não encontrado.");
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.db));
    const downloadNode = document.createElement('a');
    const dataHoje = new Date().toISOString().split('T')[0];
    
    downloadNode.setAttribute("href", dataStr);
    downloadNode.setAttribute("download", `EcoFinance_Backup_${dataHoje}.json`);
    document.body.appendChild(downloadNode);
    downloadNode.click();
    downloadNode.remove();
    
    if (typeof showToast === 'function') showToast("Backup realizado com sucesso!", "sucesso");
};

window.importarArquivoJSON = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedDB = JSON.parse(e.target.result);
            if (importedDB && importedDB.contas) {
                localStorage.setItem('eco_db', JSON.stringify(importedDB));
                alert("Backup restaurado com sucesso! O aplicativo será reiniciado para aplicar os dados.");
                location.reload();
            } else {
                alert("O arquivo selecionado não é um backup válido do EcoFinance.");
            }
        } catch (err) {
            alert("Erro ao ler o arquivo. Certifique-se de que é um formato .json válido.");
        }
    };
    reader.readAsText(file);
};

window.confirmarReset = function() {
    const mensagem = "CUIDADO: Isso apagará TODOS os seus dados, contas e históricos do celular. Esta ação é irreversível. Deseja continuar?";
    
    const acaoApagar = () => {
        localStorage.removeItem('eco_db');
        localStorage.removeItem('ecoDB'); // Apaga o legado também por segurança
        location.reload();
    };

    if (typeof abrirConfirmacao === 'function') {
        abrirConfirmacao(mensagem, acaoApagar);
    } else if (confirm(mensagem)) {
        acaoApagar();
    }
};

// ----------------------------------------------------
// 4. NAVEGAÇÃO E FILTROS DE INTERFACE
// ----------------------------------------------------
window.navegar = function(idSecao, elemento) {
    document.querySelectorAll('.secao-app').forEach(s => s.classList.remove('active'));
    
    const secaoAlvo = document.getElementById('aba-' + idSecao);
    if (secaoAlvo) secaoAlvo.classList.add('active');
    
    if (elemento) {
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        elemento.classList.add('active');
    }
    
    window.scrollTo({top: 0, behavior: 'smooth'});
    
    if (idSecao === 'dashboard' && typeof window.iniciarCarrosselBI === 'function') {
        window.iniciarCarrosselBI();
        window.iniciarCarrosselRadar();
    }
};

window.toggleNovaContaArea = function() {
    const div = document.getElementById('area-nova-conta');
    if (div) div.style.display = div.style.display === 'none' ? 'block' : 'none';
};

window.mudarFiltroStatus = function(status, elemento) {
    const inputStatus = document.getElementById('filtro-status');
    if (inputStatus) inputStatus.value = status;
    
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'var(--input-bg)';
        btn.style.color = 'var(--texto-sec)';
        btn.style.border = '1px solid var(--linha)';
    });
    
    if (elemento) {
        elemento.classList.add('active');
        elemento.style.background = 'var(--azul)';
        elemento.style.color = '#fff';
        elemento.style.border = 'none';
    }
    
    if (typeof window.renderHistorico === 'function') window.renderHistorico();
};

window.mudarFiltroCategoriaExtrato = function(cat, elemento) {
    const inputCat = document.getElementById('filtro-cat');
    if (inputCat) inputCat.value = cat;
    
    if (typeof window.renderHistorico === 'function') window.renderHistorico();
};

window.mudarMesFiltro = function(delta) {
    const input = document.getElementById('filtro-mes');
    if (!input) return;
    
    let val = input.value;
    if (!val) val = new Date().toISOString().substring(0,7);
    
    let [ano, mes] = val.split('-').map(Number);
    mes += delta;
    
    if (mes > 12) { mes = 1; ano += 1; }
    else if (mes < 1) { mes = 12; ano -= 1; }
    
    input.value = `${ano}-${mes.toString().padStart(2, '0')}`;
    
    if (typeof window.renderHistorico === 'function') window.renderHistorico();
    if (typeof window.renderGrafico === 'function') window.renderGrafico();
};

// ----------------------------------------------------
// 5. FUNÇÕES TEMPORÁRIAS/EM DESENVOLVIMENTO
// ----------------------------------------------------
window.fecharModalImportarCSV = function() {
    const m = document.getElementById('modal-importar-csv');
    if (m) m.style.display = 'none';
};

window.confirmarImportacaoCSV = function() {
    alert("Função de leitura e inserção de CSV está em fase de implementação!");
    fecharModalImportarCSV();
};
