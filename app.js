// ==========================================
// APP.JS - Navegação, Temas e Sistema (Limpo e Unificado v28.5)
// ==========================================

// ----------------------------------------------------
// 1. GESTÃO DE MODAIS GERAIS
// ----------------------------------------------------
window.abrirModalSalarios = function() {
    const m = document.getElementById('modal-salarios');
    if (m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); if(typeof renderListaSalarios === 'function') renderListaSalarios(); }
};
window.fecharModalSalarios = function() {
    const m = document.getElementById('modal-salarios');
    if (m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); }
};

window.alternarPagamentoFatura = function(idFatura, valorFatura) {
    document.getElementById('hidden-pagar-fat-id').value = idFatura;
    if(valorFatura !== undefined) {
        document.getElementById('txt-pagar-fat-valor').innerText = "R$ " + (typeof fmtBR === 'function' ? fmtBR(valorFatura) : valorFatura.toFixed(2).replace('.', ','));
        document.getElementById('hidden-pagar-fat-val').value = valorFatura;
    }
    let selectConta = document.getElementById('select-conta-pagar-fat');
    if(selectConta && typeof db !== 'undefined' && db.contas) {
        selectConta.innerHTML = '';
        let contasValidas = db.contas.filter(c => c.tipo !== 'cartao'); 
        contasValidas.forEach(c => { selectConta.innerHTML += `<option value="${c.id}">${c.nome} (Saldo: R$ ${typeof fmtBR === 'function' ? fmtBR(c.saldo) : c.saldo})</option>`; });
    }
    const modal = document.getElementById('modal-pagar-fatura');
    if(modal) { modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10); }
};
window.fecharModalPagamentoFatura = function() {
    const m = document.getElementById('modal-pagar-fatura');
    if (m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); }
};

window.abrirModalAparencia = function() { const m = document.getElementById('modal-aparencia'); if (m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); } };
window.fecharModalAparencia = function() { const m = document.getElementById('modal-aparencia'); if (m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); } };

window.selecionarTema = function(tema) {
    document.body.classList.remove('dark-mode', 'ocean-mode');
    if (tema === 'dark') document.body.classList.add('dark-mode');
    else if (tema === 'ocean') document.body.classList.add('ocean-mode');
    localStorage.setItem('eco_tema', tema);
    if (typeof window.renderGrafico === 'function') window.renderGrafico();
    if (typeof window.renderGraficoEvolucao === 'function') window.renderGraficoEvolucao();
    fecharModalAparencia();
};

window.abrirModalSistema = function() { const m = document.getElementById('modal-sistema'); if (m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); } };
window.fecharModalSistema = function() { const m = document.getElementById('modal-sistema'); if (m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); } };

// ----------------------------------------------------
// 2. SISTEMA, BACKUPS E RESET
// ----------------------------------------------------
window.exportarBackup = function() {
    const bancoDados = (typeof window.db !== 'undefined' && window.db) ? window.db : null;
    if (!bancoDados) return alert("Erro: Banco de dados não encontrado.");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bancoDados));
    const downloadNode = document.createElement('a');
    const dataHoje = new Date().toISOString().split('T')[0];
    downloadNode.setAttribute("href", dataStr);
    downloadNode.setAttribute("download", `EcoFinance_Backup_${dataHoje}.json`);
    document.body.appendChild(downloadNode); downloadNode.click(); downloadNode.remove();
    if (typeof showToast === 'function') showToast("Backup exportado!", "sucesso");
};

window.importarArquivoJSON = function(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedDB = JSON.parse(e.target.result);
            if (importedDB && importedDB.contas) {
                localStorage.setItem('eco_db', JSON.stringify(importedDB));
                alert("Backup restaurado! O aplicativo será reiniciado.");
                location.reload();
            } else alert("Arquivo inválido.");
        } catch (err) { alert("Erro ao ler o arquivo."); }
    };
    reader.readAsText(file);
};

window.confirmarReset = function() {
    const msg = "CUIDADO: Isso apagará TODOS os dados. Deseja continuar?";
    const acaoApagar = () => { localStorage.removeItem('eco_db'); localStorage.removeItem('ecoDB'); location.reload(); };
    if (typeof abrirConfirmacao === 'function') abrirConfirmacao(msg, acaoApagar); else if (confirm(msg)) acaoApagar();
};

// ----------------------------------------------------
// 3. NAVEGAÇÃO E FILTROS DE INTERFACE
// ----------------------------------------------------
window.navegar = function(idSecao, elemento) {
    document.querySelectorAll('.secao-app').forEach(s => s.classList.remove('active'));
    const secaoAlvo = document.getElementById('aba-' + idSecao);
    if (secaoAlvo) secaoAlvo.classList.add('active');
    if (elemento) { document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active')); elemento.classList.add('active'); }
    window.scrollTo({top: 0, behavior: 'smooth'});
    if (idSecao === 'dashboard' && typeof window.iniciarCarrosselBI === 'function') { window.iniciarCarrosselBI(); window.iniciarCarrosselRadar(); }
};

window.irParaExtrato = function() {
    if (typeof fecharNotificacoes === 'function') fecharNotificacoes();
    window.navegar('historico');
    document.querySelectorAll('#menu-lateral .menu-item').forEach(el => el.classList.remove('active'));
    let itens = document.querySelectorAll('#menu-lateral .menu-item'); if (itens.length >= 3) itens[2].classList.add('active');
};

window.irParaFaturas = function() {
    window.navegar('faturas');
    document.querySelectorAll('#menu-lateral .menu-item').forEach(el => el.classList.remove('active'));
    let itens = document.querySelectorAll('#menu-lateral .menu-item'); if (itens.length >= 2) itens[1].classList.add('active');
};

window.toggleNovaContaArea = function() { const div = document.getElementById('area-nova-conta'); if (div) div.style.display = div.style.display === 'none' ? 'block' : 'none'; };

window.mudarFiltroStatus = function(status, elemento) {
    const inputStatus = document.getElementById('filtro-status'); if (inputStatus) inputStatus.value = status;
    document.querySelectorAll('.status-btn').forEach(btn => { btn.classList.remove('active'); btn.style.background = 'var(--input-bg)'; btn.style.color = 'var(--texto-sec)'; btn.style.border = '1px solid var(--linha)'; });
    if (elemento) { elemento.classList.add('active'); elemento.style.background = 'var(--azul)'; elemento.style.color = '#fff'; elemento.style.border = 'none'; }
    if (typeof window.renderHistorico === 'function') window.renderHistorico();
};

window.mudarFiltroCategoriaExtrato = function(cat) {
    const inputCat = document.getElementById('filtro-cat'); if (inputCat) inputCat.value = cat;
    if (typeof window.renderHistorico === 'function') window.renderHistorico();
};

window.mudarMesFiltro = function(delta) {
    const input = document.getElementById('filtro-mes'); if (!input) return;
    let val = input.value; if (!val) val = new Date().toISOString().substring(0,7);
    let [ano, mes] = val.split('-').map(Number); mes += delta;
    if (mes > 12) { mes = 1; ano += 1; } else if (mes < 1) { mes = 12; ano -= 1; }
    input.value = `${ano}-${mes.toString().padStart(2, '0')}`;
    if (typeof window.renderHistorico === 'function') window.renderHistorico();
    if (typeof window.renderGrafico === 'function') window.renderGrafico();
};

// ----------------------------------------------------
// 4. LÓGICA DE EDIÇÃO DE LANÇAMENTOS (UNIFICADA)
// ----------------------------------------------------
window.idLancamentoEdicaoAtual = null;

window.fecharModalEdicaoLancamento = function() {
    const m = document.getElementById('modal-edicao-lancamento');
    if (m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); }
    window.idLancamentoEdicaoAtual = null;
};

window.abrirModalEdicaoLancamento = function(id) {
    const l = (db.lancamentos || []).find(x => String(x.id) === String(id));
    if (!l) return;

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
            if (mesFat && !(db.faturasPagas || []).includes(`${c.id}-${mesFat}`)) bloqueado = false; 
        }
        
        if (bloqueado) {
            if(typeof showToast === 'function') showToast("Reabra o lançamento antes de editar.", "alerta");
            else alert("Bloqueado: Para evitar erros de saldo, reabra este lançamento antes de editá-lo.");
            return;
        }
    }

    window.idLancamentoEdicaoAtual = id;

    const descEl = document.getElementById('edit-modal-desc'); const valorEl = document.getElementById('edit-modal-valor');
    const dataEl = document.getElementById('edit-modal-data'); const catEl = document.getElementById('edit-modal-cat'); const contaEl = document.getElementById('edit-modal-conta');

    if(descEl) descEl.value = l.desc || '';
    if(valorEl) valorEl.value = parseFloat(l.valor || 0).toFixed(2).replace('.', ',');
    if(dataEl) dataEl.value = l.data || '';

    if(catEl) catEl.innerHTML = '<option value="">Outros</option>' + (db.categorias || []).map(cat => `<option value="${cat.nome}" ${l.cat === cat.nome ? 'selected' : ''}>${cat.icone || ''} ${cat.nome}</option>`).join('');
    if(contaEl) contaEl.innerHTML = (db.contas || []).map(acc => `<option value="${acc.id}" ${String(l.contaId) === String(acc.id) ? 'selected' : ''}>${acc.nome}</option>`).join('');

    const m = document.getElementById('modal-edicao-lancamento');
    if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); }
};

window.salvarEdicaoLancamentoModal = function() {
    if (!window.idLancamentoEdicaoAtual) return;
    const l = db.lancamentos.find(x => String(x.id) === String(window.idLancamentoEdicaoAtual));
    if (!l) return;

    l.desc = document.getElementById('edit-modal-desc').value;
    l.valor = parseFloat(document.getElementById('edit-modal-valor').value.replace(/\./g, '').replace(',', '.')) || 0;
    l.data = document.getElementById('edit-modal-data').value;
    l.cat = document.getElementById('edit-modal-cat').value;
    l.contaId = document.getElementById('edit-modal-conta').value;
    
    if(typeof save === 'function') save();
    fecharModalEdicaoLancamento();
    if (typeof showToast === 'function') showToast("Lançamento atualizado!", "sucesso");
    
    if (typeof render === 'function') render();
    if (typeof renderHistorico === 'function') renderHistorico();
};

// ----------------------------------------------------
// 5. EFETIVAÇÃO E CÁLCULO DE SALDO (UNIFICADO)
// ----------------------------------------------------
window.toggleEfetivado = function(id) {
    const l = (db.lancamentos || []).find(x => String(x.id) === String(id));
    if (!l) return;

    const isReceita = (window.ecoTiposReceita && window.ecoTiposReceita.includes(l.tipo)) || (typeof T_RECEITAS !== 'undefined' && T_RECEITAS.includes(l.tipo)) || l.tipo === 'salario';
    const isDespesa = (window.ecoTiposDespesa && window.ecoTiposDespesa.includes(l.tipo)) || (typeof T_DESPESAS !== 'undefined' && T_DESPESAS.includes(l.tipo)) || (!isReceita && (l.fixo || l.parcelas || l.tipo === 'conta_fixa'));

    const conta = (db.contas || []).find(c => String(c.id) === String(l.contaId));
    l.efetivado = !l.efetivado;

    // Se confirmou pagamento de salário, força pra receita
    if (l.efetivado && ['salario', 'outras_receitas', 'compensacao'].includes(l.tipo)) l.tipo = 'receita'; 

    if (conta && conta.tipo !== 'cartao') {
        let valorNum = parseFloat(l.valor) || 0;
        if (l.efetivado) {
            if (isReceita) conta.saldo += valorNum;
            else if (isDespesa) conta.saldo -= valorNum;
        } else {
            if (isReceita) conta.saldo -= valorNum;
            else if (isDespesa) conta.saldo += valorNum;
        }
    }

    if (typeof save === 'function') save();
    if (typeof showToast === 'function') showToast(l.efetivado ? "✅ Efetivado!" : "⏳ Marcado como pendente.", "sucesso");
    if (typeof render === 'function') render(); 
    if (typeof renderHistorico === 'function') renderHistorico();
};

// ----------------------------------------------------
// 6. INICIALIZAÇÃO VISUAL (POP-UPS E OBSERVERS)
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Humanização de Notificações
    const obsNotificacoes = new MutationObserver(() => {
        const notifTexts = document.querySelectorAll('#lista-notificacoes, .notificacao-card, .drawer-body');
        notifTexts.forEach(el => {
            if (el.innerHTML.includes('em 1 dias')) el.innerHTML = el.innerHTML.replace(/em 1 dias/g, '<b>amanhã</b>');
            if (el.innerHTML.includes('em 0 dias')) el.innerHTML = el.innerHTML.replace(/em 0 dias/g, '<b>hoje</b>');
            if (el.innerHTML.includes('-1 dias')) el.innerHTML = el.innerHTML.replace(/-1 dias/g, '<b>ontem</b>');
        });
    });
    const gavetaNotificacoes = document.getElementById('gaveta-notificacoes');
    if (gavetaNotificacoes) obsNotificacoes.observe(gavetaNotificacoes, { childList: true, subtree: true });

    // Popup de Contas do Dia
    setTimeout(() => {
        const hojeObj = new Date();
        const strHoje = `${hojeObj.getFullYear()}-${(hojeObj.getMonth()+1).toString().padStart(2,'0')}-${hojeObj.getDate().toString().padStart(2,'0')}`;
        const vencendoHoje = (db.lancamentos || []).filter(l => l.data === strHoje && !l.efetivado && (l.tipo === 'despesa' || l.tipo === 'despesas_gerais' || l.fixa || l.parcelas));

        if (vencendoHoje.length > 0) {
            const popupAviso = document.createElement('div');
            popupAviso.className = 'modal-overlay active';
            popupAviso.style.cssText = 'display:flex; z-index:9999999;';
            let htmlContas = vencendoHoje.map(c => `<div style="background:var(--input-bg); padding:10px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid var(--perigo);"><div><strong style="font-size:13px; color:var(--texto-main); display:block;">${c.desc}</strong><small style="color:var(--texto-sec); font-size:11px;">Vence Hoje!</small></div><strong style="color:var(--perigo); font-size:14px;">R$ ${parseFloat(c.valor).toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></div>`).join('');
            popupAviso.innerHTML = `<div class="modal-content" style="max-width: 320px; text-align: center;"><div style="font-size: 40px; color: var(--perigo); margin-bottom: 10px;"><i class="fas fa-calendar-times"></i></div><h3 style="margin-bottom: 5px; color: var(--texto-main);">Contas Vencendo Hoje</h3><p style="font-size: 12px; color: var(--texto-sec); margin-bottom: 15px;">Você tem ${vencendoHoje.length} lançamento(s) pendente(s) hoje.</p><div style="text-align:left; max-height:150px; overflow-y:auto; margin-bottom:15px;">${htmlContas}</div><div class="flex-between"><button class="btn-outline" style="width:48%" onclick="this.parentElement.parentElement.parentElement.remove()">Fechar</button><button class="btn-primary" style="width:48%; background:var(--perigo);" onclick="this.parentElement.parentElement.parentElement.remove(); document.getElementById('filtro-status').value = 'em_aberto'; navegar('historico'); document.querySelector('.menu-item:nth-child(3)').classList.add('active'); if(typeof renderHistorico === 'function') renderHistorico();">Ir para Extrato</button></div></div>`;
            document.body.appendChild(popupAviso);
        }
    }, 1500);

    // Touch em Carrosséis
    document.querySelectorAll('.carrossel-wrapper').forEach(wrapper => {
        let startX = 0; let finalX = 0;
        wrapper.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive: true});
        wrapper.addEventListener('touchmove', e => { finalX = e.touches[0].clientX; }, {passive: true});
        wrapper.addEventListener('touchend', e => {
            const diff = startX - finalX;
            if (Math.abs(diff) > 40) { 
                const slides = wrapper.querySelectorAll('.carrossel-slide');
                if (slides.length < 2) return;
                let idxAtual = Array.from(slides).findIndex(s => s.classList.contains('active'));
                slides[idxAtual].classList.remove('active');
                if (diff > 0) idxAtual = (idxAtual + 1) % slides.length; else idxAtual = (idxAtual - 1 + slides.length) % slides.length;
                slides[idxAtual].classList.add('active');
            }
        });
    });
    
    // Ligações Físicas dos Modais
    setTimeout(() => {
        const modalEdicao = document.getElementById('modal-edicao-lancamento');
        if (modalEdicao) {
            const btnFecharX = modalEdicao.querySelector('.modal-header .btn-icon'); const btnCancelar = modalEdicao.querySelector('.btn-outline');
            if (btnFecharX) btnFecharX.onclick = window.fecharModalEdicaoLancamento; if (btnCancelar) btnCancelar.onclick = window.fecharModalEdicaoLancamento;
        }
    }, 500);
});