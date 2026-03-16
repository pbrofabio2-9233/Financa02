// ==========================================
// APP.JS - Navegação, Temas e Sistema (Correção de Backup)
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

// MODAL DE PAGAMENTO DE FATURA (Injetado para correção do Item 1)
window.alternarPagamentoFatura = function(idFatura, valorFatura) {
    document.getElementById('hidden-pagar-fat-id').value = idFatura;
    
    if(valorFatura !== undefined) {
        document.getElementById('txt-pagar-fat-valor').innerText = "R$ " + (typeof fmtBR === 'function' ? fmtBR(valorFatura) : valorFatura.toFixed(2).replace('.', ','));
        document.getElementById('hidden-pagar-fat-val').value = valorFatura;
    }
    
    // Carrega dinamicamente as contas de onde o dinheiro pode sair
    let selectConta = document.getElementById('select-conta-pagar-fat');
    if(selectConta && typeof db !== 'undefined' && db.contas) {
        selectConta.innerHTML = '';
        let contasValidas = db.contas.filter(c => c.tipo !== 'cartao'); // Só pode pagar com dinheiro/conta corrente
        contasValidas.forEach(c => {
            selectConta.innerHTML += `<option value="${c.id}">${c.nome} (Saldo: R$ ${typeof fmtBR === 'function' ? fmtBR(c.saldo) : c.saldo})</option>`;
        });
    }
    
    const modal = document.getElementById('modal-pagar-fatura');
    if(modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }
};

window.fecharModalPagamentoFatura = function() {
    const m = document.getElementById('modal-pagar-fatura');
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
    // CORREÇÃO PONTO 1: Busca o banco de dados independente de como o navegador o alocou na memória
    const bancoDados = (typeof window.db !== 'undefined' && window.db) ? window.db : (typeof db !== 'undefined' ? db : null);
    
    if (!bancoDados) return alert("Erro: Banco de dados não encontrado na memória atual.");
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bancoDados));
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

// Roteadores Rápidos Injetados
window.irParaExtrato = function() {
    if (typeof fecharNotificacoes === 'function') fecharNotificacoes();
    window.navegar('historico');
    
    // Atualiza o menu visualmente
    document.querySelectorAll('#menu-lateral .menu-item').forEach(el => el.classList.remove('active'));
    let itensMenu = document.querySelectorAll('#menu-lateral .menu-item');
    if (itensMenu.length >= 3) itensMenu[2].classList.add('active'); // O índice 2 normalmente é o Extrato
};

window.irParaFaturas = function() {
    window.navegar('faturas');
    
    // Atualiza o menu visualmente
    document.querySelectorAll('#menu-lateral .menu-item').forEach(el => el.classList.remove('active'));
    let itensMenu = document.querySelectorAll('#menu-lateral .menu-item');
    if (itensMenu.length >= 2) itensMenu[1].classList.add('active'); // O índice 1 normalmente é o de Faturas
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
// ==============================================================
// CORREÇÕES ABSOLUTAS - COLE NO FINAL DO ARQUIVO APP.JS
// ==============================================================

// 1. CORREÇÃO DA EDIÇÃO DE LANÇAMENTOS EM FATURA FECHADA (MAS NÃO PAGA)
window.abrirModalEdicaoLancamento = function(id) {
    const l = (db.lancamentos || []).find(x => String(x.id) === String(id));
    if (!l) return;

    const c = (db.contas || []).find(acc => String(acc.id) === String(l.contaId));

    // NOVA REGRA DE BLOQUEIO:
    if (l.efetivado) {
        let bloqueado = true;
        
        // Se for um cartão de crédito...
        if (c && c.tipo === 'cartao') {
            const mesFat = window.getMesFaturaLogico ? window.getMesFaturaLogico(l.data, c.fechamento || 1) : "";
            // ...e a fatura NÃO estiver na lista de pagas, nós LIBERAMOS a edição!
            if (mesFat && !(db.faturasPagas || []).includes(`${c.id}-${mesFat}`)) {
                bloqueado = false; 
            }
        }
        
        if (bloqueado) {
            if (typeof showToast === 'function') showToast("Bloqueado: Reabra este lançamento antes de editá-lo.", "alerta");
            else alert("Bloqueado: Para evitar erros de saldo, reabra este lançamento antes de editá-lo.");
            return;
        }
    }

    // Preenche os dados no modal padrão de edição
    if(document.getElementById('edit-lanc-id')) document.getElementById('edit-lanc-id').value = l.id;
    if(document.getElementById('edit-lanc-desc')) document.getElementById('edit-lanc-desc').value = l.desc;
    if(document.getElementById('edit-lanc-valor')) document.getElementById('edit-lanc-valor').value = parseFloat(l.valor || 0).toFixed(2).replace('.', ',');
    if(document.getElementById('edit-lanc-data')) document.getElementById('edit-lanc-data').value = l.data;

    if(document.getElementById('edit-lanc-cat')) {
        let catOpts = '<option value="">Outros</option>';
        (db.categorias || []).forEach(cat => {
            catOpts += `<option value="${cat.nome}" ${l.cat === cat.nome ? 'selected' : ''}>${cat.icone || ''} ${cat.nome}</option>`;
        });
        document.getElementById('edit-lanc-cat').innerHTML = catOpts;
    }

    if(document.getElementById('edit-lanc-conta')) {
        let contaOpts = '';
        (db.contas || []).forEach(acc => {
            contaOpts += `<option value="${acc.id}" ${String(l.contaId) === String(acc.id) ? 'selected' : ''}>${acc.nome}</option>`;
        });
        document.getElementById('edit-lanc-conta').innerHTML = contaOpts;
    }

    // Abre o modal
    const m = document.getElementById('modal-edicao-lancamento');
    if(m) { 
        m.style.display = 'flex'; 
        setTimeout(() => m.classList.add('active'), 10); 
    } else {
        // Fallback: se não achar o modal principal, tenta abrir inline no extrato
        const elInline = document.getElementById(`edit-lanc-${id}`);
        if(elInline) elInline.style.display = 'block';
    }
};


// 2. CORREÇÃO DO MODAL DE METAS (DESTRÓI O ANTIGO E CRIA UM BLINDADO)
window.abrirModalMetasForcado = function() {
    // Remove qualquer modal fantasma que esteja escondido no HTML
    document.querySelectorAll('#modal-metas-individuais, #modal-metas-individuais-super').forEach(el => el.remove());
    
    // Cria um contêiner novo, com ID diferente para evitar conflito com código velho
    let modal = document.createElement('div');
    modal.id = 'modal-metas-individuais-super';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999999; justify-content:center; align-items:center; padding:20px; opacity:0; transition: opacity 0.3s ease;';
    
    let html = `
        <div class="modal-content" style="background:var(--card-bg); width:100%; max-width:400px; border-radius:16px; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,0.3); position:relative; transform: translateY(20px); transition: transform 0.3s ease;">
            <button class="btn-icon" style="position:absolute; top:15px; right:15px; font-size:18px; color:var(--texto-sec); background:none; border:none; cursor:pointer;" onclick="fecharModalMetasForcado()"><i class="fas fa-times"></i></button>
            <h3 style="margin-bottom:20px; color:var(--texto-main); font-size: 16px;"><i class="fas fa-bullseye" style="color:var(--esmeralda);"></i> Metas por Cartão</h3>
            <div id="conteudo-metas-blindado" style="max-height:60vh; overflow-y:auto; padding-right:5px;">`;

    try {
        const cartoes = (db.contas || []).filter(c => c.tipo === 'cartao');
        if (cartoes.length === 0) {
            html += '<p class="texto-vazio" style="font-size:13px; text-align:center;">Nenhum cartão de crédito cadastrado.</p>';
        } else {
            const hoje = new Date();
            cartoes.forEach(c => {
                let diaFech = parseInt(c.fechamento, 10) || 1;
                let mesAtivo = hoje.getMonth() + 1; 
                let anoAtivo = hoje.getFullYear();
                
                if (hoje.getDate() >= diaFech) { 
                    mesAtivo += 1; 
                    if (mesAtivo > 12) { mesAtivo = 1; anoAtivo += 1; } 
                }
                const strMesAtivo = `${anoAtivo}-${mesAtivo.toString().padStart(2, '0')}`;
                
                let usoMeta = 0;
                (db.lancamentos || []).forEach(l => {
                    if (String(l.contaId) === String(c.id)) {
                        const mesFat = window.getMesFaturaLogico ? window.getMesFaturaLogico(l.data, diaFech) : "";
                        if (mesFat === strMesAtivo) {
                            if (['despesas_gerais', 'emprestei_cartao', 'despesa', 'emp_cartao'].includes(l.tipo)) usoMeta += parseFloat(l.valor) || 0;
                            else if (['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas', 'estorno', 'saque_poupanca', 'receita', 'emp_pessoal', 'compensacao'].includes(l.tipo)) usoMeta -= parseFloat(l.valor) || 0;
                        }
                    }
                });
                
                if (usoMeta < 0) usoMeta = 0;
                const metaDefinida = parseFloat(c.meta) || 0;
                const pMeta = metaDefinida > 0 ? (usoMeta / metaDefinida) * 100 : 0;
                const corBarra = pMeta > 100 ? '#ef4444' : (pMeta > 80 ? '#f59e0b' : '#10b981');
                
                html += `
                <div style="margin-bottom:15px; border-bottom:1px solid var(--linha); padding-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <strong style="font-size:14px; color:var(--texto-main);">${c.nome || 'Cartão'}</strong>
                        <span style="font-size:12px; font-weight:bold; color:${corBarra};">${pMeta.toFixed(1)}%</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--texto-sec); margin-bottom:6px;">
                        <span>Uso: R$ ${(usoMeta).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                        <span>Meta: R$ ${(metaDefinida).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>
                    <div style="background:var(--fundo); height:8px; border-radius:8px; overflow:hidden;">
                        <div style="background:${corBarra}; width:${Math.min(pMeta, 100)}%; height:100%; border-radius:8px;"></div>
                    </div>
                </div>`;
            });
        }
    } catch (err) {
        html += `<p style="color:red; font-size:12px;">Erro interno: ${err.message}</p>`;
    }

    html += `</div></div>`;
    modal.innerHTML = html;
    document.body.appendChild(modal);

    setTimeout(() => {
        modal.style.opacity = '1';
        modal.querySelector('.modal-content').style.transform = 'translateY(0)';
    }, 10);
};

window.fecharModalMetasForcado = function() {
    const modal = document.getElementById('modal-metas-individuais-super');
    if (modal) {
        modal.style.opacity = '0';
        modal.querySelector('.modal-content').style.transform = 'translateY(20px)';
        setTimeout(() => modal.remove(), 300);
    }
};

// ==============================================================
// CORREÇÕES CIRÚRGICAS BASEADAS NO INDEX.HTML (V28.5)
// ==============================================================

// 1. RESOLVER O MODAL DE METAS (Preencher a lista corretamente)
window.renderMetasIndividuais = function() {
    const container = document.getElementById('lista-metas-detalhadas');
    if (!container) return;

    const cartoes = (db.contas || []).filter(c => c.tipo === 'cartao');
    let htmlLista = '';

    if (cartoes.length === 0) {
        htmlLista = '<p style="text-align:center; padding:20px; color:var(--texto-sec); font-size: 13px;">Nenhum cartão de crédito cadastrado.</p>';
    } else {
        const hoje = new Date();
        cartoes.forEach(c => {
            let diaFech = parseInt(c.fechamento, 10) || 1;
            let mesAtivo = hoje.getMonth() + 1;
            let anoAtivo = hoje.getFullYear();

            if (hoje.getDate() >= diaFech) {
                mesAtivo += 1;
                if (mesAtivo > 12) { mesAtivo = 1; anoAtivo += 1; }
            }
            const strMesAtivo = `${anoAtivo}-${mesAtivo.toString().padStart(2, '0')}`;

            let usoMeta = 0;
            (db.lancamentos || []).forEach(l => {
                if (String(l.contaId) === String(c.id)) {
                    let mesFat = "";
                    if (l.data) {
                        const partes = l.data.split('T')[0].split('-');
                        let anoF = parseInt(partes[0], 10); let mesF = parseInt(partes[1], 10); let diaF = parseInt(partes[2], 10);
                        if (diaF >= diaFech) { mesF += 1; if (mesF > 12) { mesF = 1; anoF += 1; } }
                        mesFat = `${anoF}-${mesF.toString().padStart(2, '0')}`;
                    }
                    if (mesFat === strMesAtivo) {
                        if (['despesas_gerais', 'emprestei_cartao', 'despesa', 'emp_cartao'].includes(l.tipo)) usoMeta += parseFloat(l.valor) || 0;
                        else if (['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas', 'estorno', 'saque_poupanca', 'receita', 'emp_pessoal', 'compensacao'].includes(l.tipo)) usoMeta -= parseFloat(l.valor) || 0;
                    }
                }
            });

            if (usoMeta < 0) usoMeta = 0;
            const metaDefinida = parseFloat(c.meta) || 0;
            const pMeta = metaDefinida > 0 ? (usoMeta / metaDefinida) * 100 : 0;
            const corBarra = pMeta > 100 ? '#ef4444' : (pMeta > 80 ? '#f59e0b' : '#10b981');
            
            const valUsoStr = Number(usoMeta).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
            const valMetaStr = Number(metaDefinida).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});

            htmlLista += `
            <div style="margin-bottom:15px; border-bottom:1px solid var(--linha); padding-bottom:15px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <strong style="font-size:14px; color:var(--texto-main);">${c.nome || 'Cartão'}</strong>
                    <span style="font-size:12px; font-weight:bold; color:${corBarra};">${pMeta.toFixed(1)}%</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--texto-sec); margin-bottom:6px;">
                    <span>Uso: R$ ${valUsoStr}</span>
                    <span>Meta: R$ ${valMetaStr}</span>
                </div>
                <div style="background:var(--fundo); height:8px; border-radius:8px; overflow:hidden;">
                    <div style="background:${corBarra}; width:${Math.min(pMeta, 100)}%; height:100%; border-radius:8px;"></div>
                </div>
            </div>`;
        });
    }
    container.innerHTML = htmlLista;
};


// 2. RESOLVER A EDIÇÃO DA FATURA FECHADA (Liberando bloqueio e preenchendo IDs certos)
window.idLancamentoEdicaoAtual = null;

window.abrirModalEdicaoLancamento = function(id) {
    const l = (db.lancamentos || []).find(x => String(x.id) === String(id));
    if (!l) return;

    // Regra correta: Bloquear só se a fatura já estiver PAGA (não apenas fechada)
    if (l.efetivado) {
        let bloqueado = true;
        const c = (db.contas || []).find(acc => String(acc.id) === String(l.contaId));
        
        if (c && c.tipo === 'cartao') {
            let mesFat = "";
            if (l.data) {
                const [anoStr, mesStr, diaStr] = l.data.split('T')[0].split('-');
                let anoF = parseInt(anoStr, 10); let mesF = parseInt(mesStr, 10); let diaF = parseInt(diaStr, 10);
                let diaFech = parseInt(c.fechamento, 10) || 1;
                if (diaF >= diaFech) { mesF += 1; if (mesF > 12) { mesF = 1; anoF += 1; } }
                mesFat = `${anoF}-${mesF.toString().padStart(2, '0')}`;
            }
            // Verifica se está na lista de pagas
            if (mesFat && !(db.faturasPagas || []).includes(`${c.id}-${mesFat}`)) {
                bloqueado = false; 
            }
        } else {
            bloqueado = true; // Se for conta corrente normal efetivada, mantém bloqueio padrão
        }
        
        if (bloqueado && (!c || c.tipo !== 'cartao')) {
             if(typeof showToast === 'function') showToast("Bloqueado: Reabra o lançamento antes de editar.", "alerta");
             return;
        } else if (bloqueado) {
             if(typeof showToast === 'function') showToast("Fatura Paga: Não é possível editar.", "alerta");
             return;
        }
    }

    window.idLancamentoEdicaoAtual = id;

    // Preenche os dados usando os IDs CORRETOS do seu index.html
    const descEl = document.getElementById('edit-modal-desc');
    const valorEl = document.getElementById('edit-modal-valor');
    const dataEl = document.getElementById('edit-modal-data');
    const catEl = document.getElementById('edit-modal-cat');
    const contaEl = document.getElementById('edit-modal-conta');

    if(descEl) descEl.value = l.desc || '';
    if(valorEl) valorEl.value = parseFloat(l.valor || 0).toFixed(2).replace('.', ',');
    if(dataEl) dataEl.value = l.data || '';

    if(catEl) {
        catEl.innerHTML = '<option value="">Outros</option>' + (db.categorias || []).map(cat => 
            `<option value="${cat.nome}" ${l.cat === cat.nome ? 'selected' : ''}>${cat.icone || ''} ${cat.nome}</option>`
        ).join('');
    }

    if(contaEl) {
        contaEl.innerHTML = (db.contas || []).map(acc => 
            `<option value="${acc.id}" ${String(l.contaId) === String(acc.id) ? 'selected' : ''}>${acc.nome}</option>`
        ).join('');
    }

    // Abre o modal
    const m = document.getElementById('modal-edicao-lancamento');
    if(m) {
        m.style.display = 'flex';
        setTimeout(() => m.classList.add('active'), 10);
    }
};

// 3. SALVAR A EDIÇÃO COM O NOME EXATO DO BOTÃO NO HTML
window.salvarEdicaoLancamentoModal = function() {
    if (!window.idLancamentoEdicaoAtual) return;
    
    const l = db.lancamentos.find(x => String(x.id) === String(window.idLancamentoEdicaoAtual));
    if (!l) return;

    const desc = document.getElementById('edit-modal-desc').value;
    const valStr = document.getElementById('edit-modal-valor').value;
    const data = document.getElementById('edit-modal-data').value;
    const cat = document.getElementById('edit-modal-cat').value;
    const contaId = document.getElementById('edit-modal-conta').value;

    l.desc = desc;
    l.valor = parseFloat(valStr.replace(/\./g, '').replace(',', '.')) || 0;
    l.data = data;
    l.cat = cat;
    l.contaId = contaId;
    
    if(typeof save === 'function') save();
    
    // Fecha o modal após salvar
    const m = document.getElementById('modal-edicao-lancamento');
    if(m) {
        m.classList.remove('active');
        setTimeout(() => m.style.display = 'none', 300);
    }
    
    if (typeof showToast === 'function') showToast("Lançamento atualizado!", "sucesso");
    
    // Atualiza a tela
    if (typeof render === 'function') render();
    if (typeof renderHistorico === 'function') renderHistorico();
    
    window.idLancamentoEdicaoAtual = null; 
};