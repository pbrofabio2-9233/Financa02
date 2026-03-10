// ==========================================
// APP.JS - Lógica de Modais, Navegação, Fixes e CSV
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
    
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'var(--input-bg)';
        btn.style.color = 'var(--texto-sec)';
        btn.style.border = '1px solid var(--linha)';
    });
    
    if(elemento) {
        elemento.classList.add('active');
        elemento.style.background = 'var(--azul)';
        elemento.style.color = '#fff';
        elemento.style.border = 'none';
    }
    
    if(typeof renderHistorico === 'function') renderHistorico();
};

window.mudarFiltroCategoriaExtrato = function(catNome, elemento) {
    const inputCat = document.getElementById('filtro-cat');
    if (inputCat) inputCat.value = catNome;
    
    document.querySelectorAll('.cat-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'var(--input-bg)';
        btn.style.color = 'var(--texto-sec)';
        btn.style.border = '1px solid var(--linha)';
    });
    
    if(elemento) {
        elemento.classList.add('active');
        elemento.style.background = 'var(--esmeralda)';
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

// 4. Modais e Formulários (Aba de Ajustes e Temas)
window.abrirModalCategorias = function() {
    const m = document.getElementById('modal-categorias'); m.style.display = 'flex'; 
    setTimeout(() => m.classList.add('active'), 10);
    if(typeof renderModalCategorias === 'function') renderModalCategorias();
};
window.fecharModalCategorias = function() {
    const m = document.getElementById('modal-categorias'); m.classList.remove('active'); 
    setTimeout(() => m.style.display = 'none', 300);
    const form = document.getElementById('form-nova-categoria');
    if (form) form.style.display = 'none';
};
window.toggleFormNovaCategoria = function() {
    const form = document.getElementById('form-nova-categoria');
    if(!form) return;
    if(form.style.display === 'none' || form.style.display === '') {
        form.style.display = 'block';
        if(typeof window.cancelarEdicaoCategoria === 'function') window.cancelarEdicaoCategoria();
    } else {
        form.style.display = 'none';
    }
};

// --- CONTROLE DE TEMAS EXCLUSIVO ---
window.abrirModalAparencia = function() {
    const m = document.getElementById('modal-aparencia'); 
    m.style.display = 'flex'; 
    setTimeout(() => m.classList.add('active'), 10);
    
    const temaAtual = localStorage.getItem('eco_tema') || 'light';
    document.querySelectorAll('.btn-tema').forEach(btn => {
        btn.classList.remove('active');
        btn.style.borderColor = 'var(--linha)';
    });

    const btnAtivo = document.getElementById('btn-tema-' + temaAtual);
    if(btnAtivo) {
        btnAtivo.classList.add('active');
        btnAtivo.style.borderColor = 'var(--azul)';
    }
};

window.fecharModalAparencia = function() {
    const m = document.getElementById('modal-aparencia'); m.classList.remove('active'); 
    setTimeout(() => m.style.display = 'none', 300);
};

window.selecionarTema = function(tema) {
    localStorage.setItem('eco_tema', tema);

    document.querySelectorAll('.btn-tema').forEach(btn => {
        btn.classList.remove('active');
        btn.style.borderColor = 'var(--linha)';
    });
    const btnAtivo = document.getElementById('btn-tema-' + tema);
    if(btnAtivo) {
        btnAtivo.classList.add('active');
        btnAtivo.style.borderColor = 'var(--azul)';
    }

    // Aplica na hora o CSS
    document.body.classList.remove('dark-mode', 'ocean-mode');
    if (tema === 'dark') document.body.classList.add('dark-mode');
    else if (tema === 'ocean') document.body.classList.add('ocean-mode');

    // Re-renderiza gráficos para cores adaptarem
    if(typeof renderGrafico === 'function') renderGrafico();
    if(typeof renderGraficoEvolucao === 'function') renderGraficoEvolucao();
};
// -----------------------------------

window.abrirModalSistema = function() {
    const m = document.getElementById('modal-sistema'); m.style.display = 'flex'; 
    setTimeout(() => m.classList.add('active'), 10);
    if(typeof renderHistoricoBackups === 'function') renderHistoricoBackups();
};
window.fecharModalSistema = function() {
    const m = document.getElementById('modal-sistema'); m.classList.remove('active'); 
    setTimeout(() => m.style.display = 'none', 300);
};

// 5. Redirecionamento Inteligente das Notificações
window.redirecionarParaLancamento = function(id, data) {
    if(typeof fecharNotificacoes === 'function') fecharNotificacoes();
    const tabHist = document.querySelector('.menu-item[onclick*="historico"]');
    if(tabHist) tabHist.click();
    
    const inputMes = document.getElementById('filtro-mes');
    if(inputMes && data) {
        inputMes.value = data.substring(0,7);
        if(typeof renderHistorico === 'function') renderHistorico();
    }
    
    setTimeout(() => {
        window.abrirModalEdicaoLancamento(id);
    }, 400);
};

window.redirecionarParaFatura = function(contaId, mes) {
    if(typeof fecharNotificacoes === 'function') fecharNotificacoes();
    const tabFat = document.querySelector('.menu-item[onclick*="faturas"]');
    if(tabFat) tabFat.click();
    
    window.cartaoAtivoFatura = contaId;
    if(typeof renderAbaFaturas === 'function') renderAbaFaturas();
    
    setTimeout(() => {
        const fatID = `${contaId}-${mes}`;
        const icon = document.getElementById(`icon-det-fat-${fatID}`);
        const edit = document.getElementById(`edit-lanc-det-fat-${fatID}`);
        const cardFatura = edit ? edit.closest('.fatura-card') : null;
        
        if(icon && edit && cardFatura) {
            edit.style.display = 'block';
            icon.classList.add('open');
            cardFatura.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
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

// 6. Funções de Backup, Importação e Exportação CSV Otimizada
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
    
    let hist = JSON.parse(localStorage.getItem('eco_backups_history') || '[]');
    hist.unshift({ data: new Date().toLocaleString('pt-BR'), nome: nomeArquivo });
    if(hist.length > 5) hist.pop(); 
    localStorage.setItem('eco_backups_history', JSON.stringify(hist));
    
    if(typeof showToast === 'function') showToast("Backup transferido!", "sucesso");
    window.renderHistoricoBackups();
};

window.exportarExtratoCSV = function() {
    const inputMes = document.getElementById('filtro-mes');
    const inputStatus = document.getElementById('filtro-status');
    const inputCat = document.getElementById('filtro-cat');
    
    const mesFiltro = inputMes && inputMes.value ? inputMes.value : `${new Date().getFullYear()}-${(new Date().getMonth()+1).toString().padStart(2,'0')}`;
    const statusFiltro = inputStatus ? inputStatus.value : 'todos';
    const catFiltro = inputCat ? inputCat.value : 'todas';

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const limiteAtencao = new Date(hoje); limiteAtencao.setDate(hoje.getDate() + 7);

    let lancamentosMapeados = (db.lancamentos || []).map(l => {
        if(!l || !l.data) return null;
        const c = (db.contas || []).find(x => x.id === l.contaId);
        let dtReferencia = new Date(l.data + 'T00:00:00');
        const isReceita = window.ecoTiposReceita.includes(l.tipo);
        let statusCalculado = '';
        let statusNome = '';

        if (c && c.tipo === 'cartao') {
            const mesFat = window.getMesFaturaLogico ? window.getMesFaturaLogico(l.data, c.fechamento || 1) : l.data.substring(0,7);
            const fatID = `${c.id}-${mesFat}`;
            const estaPaga = (db.faturasPagas || []).includes(fatID);
            const [anoF, mesF] = mesFat.split('-');
            const dataFechamento = new Date(`${anoF}-${mesF}-${(c.fechamento || 1).toString().padStart(2,'0')}T00:00:00`);
            
            if (estaPaga) { statusCalculado = 'pago'; statusNome = 'Fatura Paga'; }
            else if (hoje >= dataFechamento) { statusCalculado = 'atencao'; statusNome = 'Fatura Fechada'; }
            else { statusCalculado = 'em_aberto'; statusNome = 'Fatura Aberta'; }
        } else {
            if (l.efetivado) {
                statusCalculado = isReceita ? 'receita' : 'pago';
                statusNome = isReceita ? 'Recebido' : 'Pago';
            } else {
                if (dtReferencia < hoje) { statusCalculado = 'atrasado'; statusNome = 'Atrasado'; }
                else if (dtReferencia <= limiteAtencao) { statusCalculado = 'atencao'; statusNome = 'Atenção'; }
                else { statusCalculado = 'em_aberto'; statusNome = isReceita ? 'A Receber' : 'Em Aberto'; }
            }
        }
        return { ...l, statusCalculado, statusNome, contaNome: c ? c.nome : 'Excluída', isReceita };
    }).filter(l => l !== null);

    let lancs = lancamentosMapeados.filter(l => {
        return (l.data.substring(0,7) === mesFiltro) && 
               (statusFiltro === 'todos' || l.statusCalculado === statusFiltro) &&
               (catFiltro === 'todas' || l.cat === catFiltro);
    }).sort((a, b) => new Date(b.data) - new Date(a.data));

    if(lancs.length === 0) { alert("Não há registos com este filtro para exportar."); return; }

    let csvContent = "\uFEFFData;Descrição;Categoria;Conta;Direção;Valor (R$);Status\n";

    lancs.forEach(l => {
        const d = l.data.split('-').reverse().join('/');
        const desc = (l.desc || '').replace(/;/g, ',');
        const cat = (l.cat || 'Outros');
        const conta = l.contaNome;
        const dir = l.isReceita ? 'Entrada' : 'Saida';
        const val = l.valor.toFixed(2).replace('.', ',');
        const stat = l.statusNome;
        
        csvContent += `${d};${desc};${cat};${conta};${dir};${val};${stat}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `Extrato_${mesFiltro}.csv`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    if(typeof showToast === 'function') showToast("Planilha Gerada!", "sucesso");
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
    const form = document.getElementById('form-novo-salario');
    if (form) form.style.display = 'none';
};

window.toggleFormNovoSalario = function() {
    const form = document.getElementById('form-novo-salario');
    if(!form) return;
    form.style.display = form.style.display === 'none' || form.style.display === '' ? 'block' : 'none';
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
    
    if(container) container.innerHTML = inputs; 
    if (resumo) {
        if (valorTotal > 0) { resumo.innerText = `${vezes} recebimento(s) de R$ ${(valorTotal / vezes).toFixed(2)}`; } 
        else { resumo.innerText = ''; } 
    }
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
    window.toggleFormNovoSalario();
    
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

// ----------------------------------------------------
// EDIÇÃO AVANÇADA DE CONTRATOS FIXOS E PARCELAMENTOS
// ----------------------------------------------------
window.abrirEdicaoContaFixa = function(id) {
    const lanc = (db.lancamentos || []).find(l => l.id === id);
    if(!lanc) return;

    const dia = lanc.data.split('-')[2];
    
    let catOptions = '<option value="">Outros (Sem categoria)</option>';
    (db.categorias || []).forEach(c => {
        catOptions += `<option value="${c.nome}" ${lanc.cat === c.nome ? 'selected' : ''}>${c.icone || ''} ${c.nome}</option>`;
    });

    let contaOptions = '';
    (db.contas || []).forEach(c => {
        contaOptions += `<option value="${c.id}" ${lanc.contaId === c.id ? 'selected' : ''}>${c.tipo === 'cartao' ? '💳' : '🏦'} ${c.nome}</option>`;
    });

    let html = `
        <div class="mb-10">
            <label class="label-moderno">Descrição Base</label>
            <input type="text" id="edit-fixa-desc" class="input-moderno" value="${lanc.desc}">
        </div>
        <div class="grid-inputs mb-10">
            <div>
                <label class="label-moderno">Valor Previsto (R$)</label>
                <input type="text" inputmode="numeric" id="edit-fixa-valor" class="input-moderno" value="${lanc.valor.toFixed(2).replace('.',',')}" oninput="mascaraMoeda(event)">
            </div>
            <div>
                <label class="label-moderno">Dia Vencimento</label>
                <input type="number" id="edit-fixa-dia" class="input-moderno" min="1" max="31" value="${dia}">
            </div>
        </div>
        <div class="grid-inputs mb-15">
            <div>
                <label class="label-moderno">Categoria</label>
                <select id="edit-fixa-cat" class="input-moderno">${catOptions}</select>
            </div>
            <div>
                <label class="label-moderno">Conta Pagamento</label>
                <select id="edit-fixa-conta" class="input-moderno">${contaOptions}</select>
            </div>
        </div>
        <button class="btn-primary" style="width:100%; background:var(--alerta);" onclick="salvarEdicaoContaFixa(${id})">Salvar Novo Padrão</button>
    `;
    document.getElementById('form-edicao-contrato').innerHTML = html;
    const m = document.getElementById('modal-edicao-contrato');
    m.style.display = 'flex';
    setTimeout(() => m.classList.add('active'), 10);
};

window.salvarEdicaoContaFixa = function(id) {
    const lanc = (db.lancamentos || []).find(l => l.id === id);
    if(!lanc) return;

    const novaDesc = document.getElementById('edit-fixa-desc').value;
    const novoValor = window.parseMoeda('edit-fixa-valor');
    const novoDia = document.getElementById('edit-fixa-dia').value.padStart(2, '0');
    const novaCat = document.getElementById('edit-fixa-cat').value;
    const novaConta = document.getElementById('edit-fixa-conta').value;

    const descOriginal = lanc.desc;
    const contaOriginal = lanc.contaId;

    db.lancamentos.forEach(l => {
        if(l.fixo && !l.efetivado && l.desc === descOriginal && l.contaId === contaOriginal) {
            l.desc = novaDesc;
            l.valor = novoValor;
            l.cat = novaCat;
            l.contaId = novaConta;
            const partes = l.data.split('-');
            l.data = `${partes[0]}-${partes[1]}-${novoDia}`;
        }
    });

    save();
    window.fecharModalEdicaoContrato();
    if(typeof renderListaContratos === 'function') renderListaContratos();
    if(typeof render === 'function') render();
    if(typeof showToast === 'function') showToast("Conta Fixa atualizada!", "sucesso");
};

window.abrirEdicaoParcelamento = function(idGrupo) {
    const parcelas = (db.lancamentos || []).filter(l => l.idGrupo === idGrupo && !l.efetivado).sort((a,b) => new Date(a.data) - new Date(b.data));
    if(parcelas.length === 0) return;
    
    const lancBase = parcelas[0];
    const nomeBase = lancBase.desc.split(' (')[0].trim();
    const diaBase = lancBase.data.split('-')[2];

    let catOptions = '<option value="">Outros (Sem categoria)</option>';
    (db.categorias || []).forEach(c => {
        catOptions += `<option value="${c.nome}" ${lancBase.cat === c.nome ? 'selected' : ''}>${c.icone || ''} ${c.nome}</option>`;
    });

    let contaOptions = '';
    (db.contas || []).forEach(c => {
        contaOptions += `<option value="${c.id}" ${lancBase.contaId === c.id ? 'selected' : ''}>${c.tipo === 'cartao' ? '💳' : '🏦'} ${c.nome}</option>`;
    });

    let html = `
        <div style="background: rgba(59, 130, 246, 0.1); padding: 10px; border-radius: 8px; border-left: 3px solid var(--azul); font-size: 11px; color: var(--texto-sec); margin-bottom: 15px;">
            <strong>Atenção:</strong> Ao alterar as informações abaixo, todas as <strong>${parcelas.length} parcelas restantes</strong> serão atualizadas. Caso precise alterar a quantidade de meses, cancele o restante no menu anterior e lance novamente.
        </div>
        
        <div class="mb-10">
            <label class="label-moderno">Nome da Compra</label>
            <input type="text" id="edit-parc-desc" class="input-moderno" value="${nomeBase}">
        </div>
        <div class="grid-inputs mb-10">
            <div>
                <label class="label-moderno">Valor da Parcela (R$)</label>
                <input type="text" inputmode="numeric" id="edit-parc-valor" class="input-moderno" value="${lancBase.valor.toFixed(2).replace('.',',')}" oninput="mascaraMoeda(event)">
            </div>
            <div>
                <label class="label-moderno">Dia Vencimento</label>
                <input type="number" id="edit-parc-dia" class="input-moderno" min="1" max="31" value="${diaBase}">
            </div>
        </div>
        <div class="grid-inputs mb-15">
            <div>
                <label class="label-moderno">Categoria</label>
                <select id="edit-parc-cat" class="input-moderno">${catOptions}</select>
            </div>
            <div>
                <label class="label-moderno">Conta Origem</label>
                <select id="edit-parc-conta" class="input-moderno">${contaOptions}</select>
            </div>
        </div>
        <button class="btn-primary" style="width:100%;" onclick="salvarEdicaoParcelamento('${idGrupo}')">Atualizar Restantes</button>
    `;
    document.getElementById('form-edicao-contrato').innerHTML = html;
    const m = document.getElementById('modal-edicao-contrato');
    m.style.display = 'flex';
    setTimeout(() => m.classList.add('active'), 10);
};

window.salvarEdicaoParcelamento = function(idGrupo) {
    const novaDesc = document.getElementById('edit-parc-desc').value.trim();
    const novoValor = window.parseMoeda('edit-parc-valor');
    const novoDia = document.getElementById('edit-parc-dia').value.padStart(2, '0');
    const novaCat = document.getElementById('edit-parc-cat').value;
    const novaConta = document.getElementById('edit-parc-conta').value;

    db.lancamentos.forEach(l => {
        if(l.idGrupo === idGrupo && !l.efetivado) {
            const numPart = l.desc.match(/\(\d+\/\d+\)/);
            l.desc = novaDesc + (numPart ? ` ${numPart[0]}` : '');
            l.valor = novoValor;
            l.cat = novaCat;
            l.contaId = novaConta;
            const partes = l.data.split('-');
            l.data = `${partes[0]}-${partes[1]}-${novoDia}`;
        }
    });

    save();
    window.fecharModalEdicaoContrato();
    if(typeof renderListaContratos === 'function') renderListaContratos();
    if(typeof render === 'function') render();
    if(typeof showToast === 'function') showToast("Parcelamento atualizado!", "sucesso");
};

// ----------------------------------------------------
// NOVO: MODAL DE EDIÇÃO DE LANÇAMENTO (Substitui o Acordeão)
// ----------------------------------------------------
window.idLancamentoEmEdicao = null;

// Intercepta os cliques antigos para abrir o novo modal
window.toggleEditLancamento = function(id) {
    // Se for uma fatura, mantemos o acordeão, pois ele mostra a lista de compras
    if (typeof id === 'string' && id.startsWith('det-fat-')) {
        const el = document.getElementById(`edit-lanc-${id}`);
        const icon = document.getElementById(`icon-${id}`);
        if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
        if(icon) icon.classList.toggle('open');
        return;
    }
    // Se for lançamento normal do extrato, abre o Modal
    window.abrirModalEdicaoLancamento(id);
};

// Intercepta o menu de contexto (Long press / Botão direito)
window.acionarAjusteCtx = function(e) {
    if(e) e.stopPropagation();
    if(currentLancIdCtx) window.abrirModalEdicaoLancamento(currentLancIdCtx);
    if(typeof fecharMenuCtx === 'function') fecharMenuCtx();
};

window.abrirModalEdicaoLancamento = function(id) {
    const l = (db.lancamentos || []).find(x => x.id === id);
    if(!l) return;
    window.idLancamentoEmEdicao = id;

    document.getElementById('edit-modal-desc').value = l.desc || '';
    document.getElementById('edit-modal-data').value = l.data || '';
    document.getElementById('edit-modal-valor').value = (l.valor || 0).toFixed(2).replace('.', ',');

    const selectConta = document.getElementById('edit-modal-conta');
    selectConta.innerHTML = '';
    (db.contas || []).forEach(c => {
        selectConta.options.add(new Option(`${c.tipo === 'cartao' ? '💳' : '🏦'} ${c.nome}`, c.id));
    });
    selectConta.value = l.contaId;

    const selectCat = document.getElementById('edit-modal-cat');
    selectCat.innerHTML = '<option value="">Outros</option>';
    (db.categorias || []).forEach(cat => {
        selectCat.options.add(new Option(`${cat.icone || ''} ${cat.nome}`, cat.nome));
    });
    selectCat.value = l.cat || '';

    const m = document.getElementById('modal-edicao-lancamento');
    m.style.display = 'flex';
    setTimeout(() => m.classList.add('active'), 10);
};

window.fecharModalEdicaoLancamento = function() {
    const m = document.getElementById('modal-edicao-lancamento');
    m.classList.remove('active');
    setTimeout(() => m.style.display = 'none', 300);
    window.idLancamentoEmEdicao = null;
};

window.salvarEdicaoLancamentoModal = function() {
    if(!window.idLancamentoEmEdicao) return;
    const l = db.lancamentos.find(x => x.id === window.idLancamentoEmEdicao);
    if(!l) return;

    l.desc = document.getElementById('edit-modal-desc').value;
    l.contaId = document.getElementById('edit-modal-conta').value;
    l.data = document.getElementById('edit-modal-data').value;
    l.valor = window.parseMoeda('edit-modal-valor');
    l.cat = document.getElementById('edit-modal-cat').value || "Outros";

    save();
    fecharModalEdicaoLancamento();
    
    if(typeof render === 'function') render();
    if(typeof showToast === 'function') showToast("Lançamento atualizado!", "sucesso");
};

// ----------------------------------------------------
// PREPARAÇÃO: MODAL PAGAMENTO DE FATURA
// ----------------------------------------------------
window.abrirModalPagamentoFatura = function(fatID, valor) {
    document.getElementById('hidden-pagar-fat-id').value = fatID;
    document.getElementById('hidden-pagar-fat-val').value = valor;
    document.getElementById('txt-pagar-fat-valor').innerText = 'R$ ' + (typeof fmtBR === 'function' ? fmtBR(valor) : valor.toFixed(2).replace('.', ','));

    const selectConta = document.getElementById('select-conta-pagar-fat');
    selectConta.innerHTML = '';
    (db.contas || []).filter(c => c.tipo !== 'cartao').forEach(c => {
        selectConta.options.add(new Option(`${c.nome} (Saldo: R$ ${typeof fmtBR === 'function' ? fmtBR(c.saldo) : c.saldo})`, c.id));
    });

    const m = document.getElementById('modal-pagar-fatura');
    m.style.display = 'flex';
    setTimeout(() => m.classList.add('active'), 10);
};

window.fecharModalPagamentoFatura = function() {
    const m = document.getElementById('modal-pagar-fatura');
    m.classList.remove('active');
    setTimeout(() => m.style.display = 'none', 300);
};
