// ==========================================
// APP.JS - Lógica de Modais, Navegação e Fixes
// ==========================================

// 1. Filtros de Mês e Status no Extrato
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

window.mudarFiltroStatus = function(status, elemento) {
    const inputStatus = document.getElementById('filtro-status');
    if (inputStatus) inputStatus.value = status;
    
    // Força a remoção dos estilos embutidos dos outros botões
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'var(--input-bg)';
        btn.style.color = 'var(--texto-sec)';
        btn.style.border = '1px solid var(--linha)';
    });
    
    // Aplica os estilos no botão clicado
    if(elemento) {
        elemento.classList.add('active');
        elemento.style.background = 'var(--azul)';
        elemento.style.color = '#fff';
        elemento.style.border = 'none';
    }
    
    if(typeof renderHistorico === 'function') renderHistorico();
};

// 2. Navegação Básica das Abas do App
window.navegar = function(abaId, elementoMenu) {
    document.querySelectorAll('.secao-app').forEach(s => s.classList.remove('active'));
    const secao = document.getElementById('aba-' + abaId);
    if(secao) secao.classList.add('active');
    
    if (elementoMenu) {
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        elementoMenu.classList.add('active');
    }
};

// 3. Área de Nova Conta
window.toggleNovaContaArea = function() {
    const area = document.getElementById('area-nova-conta');
    if(area) area.style.display = area.style.display === 'none' ? 'block' : 'none';
};
window.toggleCamposCartao = function() {
    const tipo = document.getElementById('nova-conta-tipo').value;
    const campos = document.getElementById('campos-cartao-add');
    if(campos) campos.style.display = tipo === 'cartao' ? 'block' : 'none';
};

// 4. Modais da Aba de Ajustes
window.abrirModalCategorias = function() {
    const m = document.getElementById('modal-categorias'); m.style.display = 'flex'; 
    setTimeout(() => m.classList.add('active'), 10);
    if(typeof renderModalCategorias === 'function') renderModalCategorias();
};
window.fecharModalCategorias = function() {
    const m = document.getElementById('modal-categorias'); m.classList.remove('active'); 
    setTimeout(() => m.style.display = 'none', 300);
};

window.abrirModalAparencia = function() {
    const m = document.getElementById('modal-aparencia'); m.style.display = 'flex'; 
    setTimeout(() => m.classList.add('active'), 10);
};
window.fecharModalAparencia = function() {
    const m = document.getElementById('modal-aparencia'); m.classList.remove('active'); 
    setTimeout(() => m.style.display = 'none', 300);
};

window.abrirModalSistema = function() {
    const m = document.getElementById('modal-sistema'); m.style.display = 'flex'; 
    setTimeout(() => m.classList.add('active'), 10);
    if(typeof renderHistoricoBackups === 'function') renderHistoricoBackups();
};
window.fecharModalSistema = function() {
    const m = document.getElementById('modal-sistema'); m.classList.remove('active'); 
    setTimeout(() => m.style.display = 'none', 300);
};

// // 5. Redirecionamento Inteligente das Notificações (COM GLOW UP)
window.redirecionarParaLancamento = function(id, data) {
    if(typeof fecharNotificacoes === 'function') fecharNotificacoes();
    
    // 1. Navega para a aba de Extrato
    const tabHist = document.querySelector('.menu-item[onclick*="historico"]');
    if(tabHist) tabHist.click();
    
    // 2. Altera o mês e FORÇA o extrato a ser desenhado novamente
    const inputMes = document.getElementById('filtro-mes');
    if(inputMes && data) {
        inputMes.value = data.substring(0,7);
        if(typeof renderHistorico === 'function') renderHistorico();
    }
    
    // 3. Aguarda o desenho e aplica o Glow Up
    setTimeout(() => {
        const icon = document.getElementById(`icon-${id}`);
        const edit = document.getElementById(`edit-lanc-${id}`);
        const cardLancamento = edit ? edit.closest('.fatura-card') : null;
        
        if(icon && edit && cardLancamento) {
            edit.style.display = 'block';
            icon.classList.add('open');
            cardLancamento.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Efeito Glow Up
            const oldBorder = cardLancamento.style.borderColor;
            cardLancamento.style.transition = 'all 0.5s ease';
            cardLancamento.style.borderColor = 'var(--alerta)';
            cardLancamento.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.6)';
            
            setTimeout(() => {
                cardLancamento.style.borderColor = oldBorder;
                cardLancamento.style.boxShadow = 'var(--shadow-sm)';
            }, 2000);
        }
    }, 400);
};

window.redirecionarParaFatura = function(contaId, mes) {
    if(typeof fecharNotificacoes === 'function') fecharNotificacoes();
    
    // 1. Navega para a aba de Faturas
    const tabFat = document.querySelector('.menu-item[onclick*="faturas"]');
    if(tabFat) tabFat.click();
    
    // 2. Define o cartão com a dívida e FORÇA a aba de faturas a ser desenhada
    window.cartaoAtivoFatura = contaId;
    if(typeof renderAbaFaturas === 'function') renderAbaFaturas();
    
    // 3. Aguarda o desenho e aplica o Glow Up
    setTimeout(() => {
        const fatID = `${contaId}-${mes}`;
        const icon = document.getElementById(`icon-det-fat-${fatID}`);
        const edit = document.getElementById(`edit-lanc-det-fat-${fatID}`);
        const cardFatura = edit ? edit.closest('.fatura-card') : null;
        
        if(icon && edit && cardFatura) {
            edit.style.display = 'block';
            icon.classList.add('open');
            cardFatura.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Efeito Glow Up
            const oldBorder = cardFatura.style.borderColor;
            cardFatura.style.transition = 'all 0.5s ease';
            cardFatura.style.borderColor = 'var(--alerta)';
            cardFatura.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.6)';
            
            setTimeout(() => {
                cardFatura.style.borderColor = oldBorder;
                cardFatura.style.boxShadow = 'var(--shadow-sm)';
            }, 2000);
        }
    }, 400);
};

// 6. Funções de Backup e Histórico
window.renderHistoricoBackups = function() {
    const lista = document.getElementById('lista-backups');
    if(!lista) return;
    let hist = JSON.parse(localStorage.getItem('eco_backups_history') || '[]');
    if(hist.length === 0) {
        lista.innerHTML = '<p class="texto-vazio">Nenhum backup gerado recentemente.</p>';
    } else {
        lista.innerHTML = hist.map(b => `
            <div class="flex-between mb-10" style="background: var(--input-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--linha);">
                <div>
                    <strong style="font-size: 13px; display: block;">${b.nome}</strong>
                    <small style="color: var(--texto-sec); font-size: 11px;"><i class="fas fa-clock"></i> ${b.data}</small>
                </div>
                <i class="fas fa-check-circle txt-sucesso" style="font-size: 18px;"></i>
            </div>
        `).join('');
    }
};

window.exportarBackup = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const a = document.createElement('a');
    const dataHoje = new Date().toISOString().split('T')[0];
    const nomeArquivo = `EcoFinance_Backup_${dataHoje}.json`;
    
    a.href = dataStr; 
    a.download = nomeArquivo;
    document.body.appendChild(a); 
    a.click(); 
    a.remove();
    
    // Grava no histórico local
    let hist = JSON.parse(localStorage.getItem('eco_backups_history') || '[]');
    hist.unshift({ data: new Date().toLocaleString('pt-BR'), nome: nomeArquivo });
    if(hist.length > 5) hist.pop(); // Mantém apenas os 5 mais recentes
    localStorage.setItem('eco_backups_history', JSON.stringify(hist));
    
    if(typeof showToast === 'function') showToast("Backup transferido!", "sucesso");
    window.renderHistoricoBackups();
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
            } else { alert("Este ficheiro não parece ser um backup válido."); }
        } catch (err) { alert("Erro ao ler o ficheiro."); }
    };
    reader.readAsText(file);
};

window.confirmarReset = function() {
    if(typeof abrirConfirmacao === 'function') {
        abrirConfirmacao("CUIDADO: Isto vai apagar TODOS os seus dados. Tem a certeza?", () => {
            localStorage.removeItem('eco_db');
            localStorage.removeItem('eco_backups_history');
            location.reload();
        });
    }
};

// 7. Salários e Rendas Automáticas
window.abrirModalSalarios = function() { 
    const m = document.getElementById('modal-salarios'); m.style.display = 'flex'; 
    setTimeout(() => m.classList.add('active'), 10); 
    const selectConta = document.getElementById('sal-conta'); selectConta.options.length = 0; 
    const contasCC = (db.contas || []).filter(c => c.tipo !== 'cartao'); 
    contasCC.forEach(c => selectConta.options.add(new Option(c.nome, c.id))); 
    if(contasCC.length === 0) selectConta.options.add(new Option('Crie uma conta corrente', '')); 
    if(typeof window.atualizarDiasSalario === 'function') window.atualizarDiasSalario(); 
    if(typeof window.renderListaSalarios === 'function') window.renderListaSalarios(); 
};

window.fecharModalSalarios = function() { 
    const m = document.getElementById('modal-salarios'); m.classList.remove('active'); 
    setTimeout(() => m.style.display = 'none', 300); 
};

window.atualizarDiasSalario = function() { 
    const freq = document.getElementById('sal-freq').value; 
    const container = document.getElementById('sal-dias-container'); 
    const resumo = document.getElementById('sal-resumo-calculo'); 
    const valorTotal = window.parseMoeda('sal-valor'); 
    let inputs = ''; let vezes = 1; 
    
    if (freq === 'mensal') { 
        inputs = '<div><input type="number" id="sal-dia-1" class="input-moderno" placeholder="Dia" min="1" max="31"></div>'; 
        vezes = 1; 
    } else if (freq === 'quinzenal') { 
        inputs = '<div><input type="number" id="sal-dia-1" class="input-moderno" placeholder="1º Dia"></div><div><input type="number" id="sal-dia-2" class="input-moderno" placeholder="2º Dia"></div>'; 
        vezes = 2; 
    } else if (freq === 'semanal') { 
        inputs = '<div><input type="number" id="sal-dia-1" class="input-moderno" placeholder="1º"></div><div><input type="number" id="sal-dia-2" class="input-moderno" placeholder="2º"></div><div><input type="number" id="sal-dia-3" class="input-moderno" placeholder="3º"></div><div><input type="number" id="sal-dia-4" class="input-moderno" placeholder="4º"></div>'; 
        vezes = 4; 
    } 
    
    container.innerHTML = inputs; 
    if (valorTotal > 0) { resumo.innerText = `${vezes} recebimento(s) de R$ ${(valorTotal / vezes).toFixed(2)}`; } 
    else { resumo.innerText = ''; } 
};

window.renderListaSalarios = function() { 
    const lista = document.getElementById('lista-salarios-cadastrados'); 
    if (!db.salarios || db.salarios.length === 0) { 
        lista.innerHTML = '<p class="texto-vazio" style="font-size:12px;">Nenhum salário cadastrado.</p>'; 
        return; 
    } 
    lista.innerHTML = db.salarios.map(s => { 
        const c = (db.contas || []).find(x => x.id === s.contaId); 
        return `
        <div class="salario-card">
            <div>
                <strong style="font-size: 13px; color: var(--texto-main);">${s.nome}</strong>
                <small style="display:block; font-size: 11px; color: var(--texto-sec);">${s.frequencia.toUpperCase()} • R$ ${s.valorTotal.toFixed(2)} (${c?c.nome:'S/ Conta'})</small>
                <span class="salario-badge mt-10">Dias: ${s.dias.join(', ')}</span>
            </div>
            <button class="btn-icon txt-perigo" onclick="excluirSalario(${s.id})"><i class="fas fa-trash"></i></button>
        </div>`; 
    }).join(''); 
};

window.salvarNovoSalario = function() { 
    const nome = document.getElementById('sal-nome').value; 
    const valorTotal = window.parseMoeda('sal-valor'); 
    const freq = document.getElementById('sal-freq').value; 
    const contaId = document.getElementById('sal-conta').value; 
    
    if (!nome || valorTotal <= 0 || !contaId) return alert("Preencha Nome, Valor e Conta."); 
    
    let dias = []; 
    let qtdDias = freq === 'mensal' ? 1 : (freq === 'quinzenal' ? 2 : 4); 
    for(let i=1; i<=qtdDias; i++) { 
        const d = parseInt(document.getElementById(`sal-dia-${i}`).value); 
        if(!d || d < 1 || d > 31) return alert(`Preencha o ${i}º Dia corretamente.`); 
        dias.push(d); 
    } 
    
    if(!db.salarios) db.salarios = [];
    db.salarios.push({ id: Date.now(), nome, valorTotal, frequencia: freq, dias, contaId }); 
    save(); 
    
    document.getElementById('sal-nome').value = ''; 
    document.getElementById('sal-valor').value = ''; 
    window.atualizarDiasSalario(); 
    window.renderListaSalarios(); 
    
    if(typeof showToast === 'function') showToast("Salário adicionado!", "sucesso"); 
    if(typeof verificarNotificacoesMotor === 'function') verificarNotificacoesMotor(); 
};

window.excluirSalario = function(id) { 
    if(typeof abrirConfirmacao === 'function') {
        abrirConfirmacao("Remover este salário automático?", () => {
            db.salarios = db.salarios.filter(s => s.id !== id);
            save();
            window.renderListaSalarios();
            if(typeof showToast === 'function') showToast("Salário removido!", "exclusao");
        });
    }
};
