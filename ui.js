// ==========================================
// UI.JS - Renderização, Interface e Gráficos (Otimizado v28.8 - OVERRIDE ABSOLUTO)
// ==========================================

var T_RECEITAS = ['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas', 'estorno', 'saque_poupanca', 'receita', 'emp_pessoal', 'compensacao'];
var T_DESPESAS = ['despesas_gerais', 'emprestei_dinheiro', 'pag_emprestimo', 'dep_poupanca', 'emprestei_cartao', 'despesa', 'emp_concedido', 'emp_cartao'];
var T_DESPESAS_CARTAO = ['despesas_gerais', 'emprestei_cartao', 'despesa', 'emp_cartao'];

window.fmtBR = function(valor) {
    return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);

// ----------------------------------------------------
// 1. CORREÇÕES DE ESTÉTICA E TEMA
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.card-simples[style*="var(--fundo)"]').forEach(el => {
        el.style.background = 'var(--input-bg)';
        el.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)';
    });

    const styleFix = document.createElement('style');
    styleFix.innerHTML = `
        #modal-confirmacao, .swal2-container, .alert-modal { z-index: 999999 !important; }
        
        @media (min-width: 768px) {
            .fab-container, .btn-flutuante { display: none !important; }
            .header-app #btn-add, .header-app .btn-novo-lancamento, .header-app button[onclick*="abrirModalLancamento"] {
                display: inline-flex !important; height: 34px !important; min-height: 34px !important;
                padding: 0 16px !important; border-radius: 34px !important; font-size: 13px !important;
                font-weight: 600 !important; align-items: center !important; justify-content: center !important;
                gap: 6px !important; box-shadow: none !important; margin: 0 !important;
                white-space: nowrap !important; width: max-content !important; position: static !important;
                transform: none !important;
            }
            .header-app #btn-add i, .header-app .btn-novo-lancamento i, .header-app button[onclick*="abrirModalLancamento"] i {
                font-size: 14px !important; margin: 0 !important;
            }
            .header-app { align-items: center !important; }
        }
        
        body.dark-mode input[type="date"]::-webkit-calendar-picker-indicator,
        body.ocean-mode input[type="date"]::-webkit-calendar-picker-indicator,
        body.dark-mode input[type="month"]::-webkit-calendar-picker-indicator,
        body.ocean-mode input[type="month"]::-webkit-calendar-picker-indicator {
            filter: invert(1) brightness(2) !important; opacity: 1 !important; cursor: pointer;
        }

        @keyframes highlightPulse {
            0% { background-color: rgba(245, 158, 11, 0.4) !important; transform: scale(1.02); }
            50% { background-color: rgba(245, 158, 11, 0.1) !important; transform: scale(1); }
            100% { background-color: transparent !important; }
        }
        .fade-highlight {
            animation: highlightPulse 2.5s ease-out forwards !important;
            border-left: 4px solid var(--alerta) !important;
        }
    `;
    document.head.appendChild(styleFix);
});

// ----------------------------------------------------
// 2. FUNÇÕES DE DATA E UTILIDADES
// ----------------------------------------------------
window.getMesFaturaLogico = function(dataLancamento, diaFechamento) { 
    if (!dataLancamento) return ""; 
    const [anoStr, mesStr, diaStr] = dataLancamento.split('T')[0].split('-'); 
    let ano = parseInt(anoStr, 10); let mes = parseInt(mesStr, 10); let dia = parseInt(diaStr, 10); 
    let diaFech = parseInt(diaFechamento, 10) || 1; 
    if (dia >= diaFech) { mes += 1; if (mes > 12) { mes = 1; ano += 1; } } 
    return `${ano}-${mes.toString().padStart(2, '0')}`; 
}

window.formatarMesFaturaLogico = function(mesAnoStr) { 
    const meses = {'01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez'}; 
    const [ano, mes] = mesAnoStr.split('-'); return `${meses[mes]} / ${ano}`; 
}

// ----------------------------------------------------
// 3. MENU SUSPENSO E REGRAS DE EXTRATO/FATURA
// ----------------------------------------------------
let longPressTimer;
let currentLancIdCtx = null;

if (!document.getElementById('context-menu-lancamento')) {
    const menu = document.createElement('div'); menu.id = 'context-menu-lancamento';
    menu.style.cssText = 'display:none; position:fixed; z-index:99999; background:var(--card-bg); border:1px solid var(--linha); border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.5); flex-direction:column; padding:5px; min-width:180px; overflow:hidden;';
    document.body.appendChild(menu);
}

if (!document.getElementById('context-menu-fatura')) {
    const menuFat = document.createElement('div'); menuFat.id = 'context-menu-fatura';
    menuFat.style.cssText = 'display:none; position:fixed; z-index:99999; background:var(--card-bg); border:1px solid var(--linha); border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.5); flex-direction:column; padding:5px; min-width:180px; overflow:hidden;';
    document.body.appendChild(menuFat);
}

window.fecharMenuCtx = function() { 
    const menu = document.getElementById('context-menu-lancamento'); if(menu) menu.style.display = 'none'; 
    const menuFat = document.getElementById('context-menu-fatura'); if(menuFat) menuFat.style.display = 'none'; 
    clearTimeout(longPressTimer); 
};

window.addEventListener('scroll', () => { fecharMenuCtx(); }, true);
document.addEventListener('click', (e) => { 
    const m = document.getElementById('context-menu-lancamento'); const mF = document.getElementById('context-menu-fatura'); 
    if((m && !m.contains(e.target)) || (mF && !mF.contains(e.target))) fecharMenuCtx(); 
});

window.iniciarLongPress = function(e, id, isFatura = false) { 
    longPressTimer = setTimeout(() => { 
        if (isFatura) mostrarContextMenuFatura(e, id); else { currentLancIdCtx = id; mostrarContextMenu(e, id); }
    }, 450); 
};
window.cancelarLongPress = function() { clearTimeout(longPressTimer); };

window.mostrarContextMenuRightClick = function(e, id, isFatura = false) { 
    if(e) { e.preventDefault(); e.stopPropagation(); }
    if (isFatura) mostrarContextMenuFatura(e, id); else { currentLancIdCtx = id; mostrarContextMenu(e, id); }
};

window.criarBotaoCtx = function(onclick, icone, cor, texto) {
    return `<button onclick="${onclick}" style="padding:12px 15px; text-align:left; background:transparent; border:none; color:var(--texto-main); width:100%; font-size:14px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:10px;"><i class="${icone}" style="color:${cor}; width:20px; text-align:center;"></i> ${texto}</button><div style="height:1px; background:var(--linha); margin:0 5px;"></div>`;
};

window.mostrarContextMenu = function(e, id) {
    if ("vibrate" in navigator) navigator.vibrate(50);
    const menu = document.getElementById('context-menu-lancamento'); if(!menu) return;
    const lanc = (db.lancamentos || []).find(x => String(x.id) === String(id)); if (!lanc) return;
    const c = (db.contas || []).find(x => String(x.id) === String(lanc.contaId)); const isCartao = c && c.tipo === 'cartao';
    
    let html = '';
    const isReceita = T_RECEITAS.includes(lanc.tipo); 
    const isDespesa = T_DESPESAS.includes(lanc.tipo);
    const isFixoParcelado = (lanc.idGrupo || lanc.idRecorrencia || lanc.rolagem) && lanc.tipo !== 'rec_emprestimo';
    
    if (String(lanc.id).startsWith('pg_fat_')) {
        html += window.criarBotaoCtx(`acionarEstornoFaturaCtx(event, '${lanc.id.replace('pg_fat_', '')}')`, 'fas fa-undo', 'var(--alerta)', 'Reabrir Fatura');
    } else if (String(lanc.id).startsWith('am_fat_')) {
        const match = String(lanc.id).match(/am_fat_(.+)_(\d+)/);
        html += window.criarBotaoCtx(`acionarEstornoAmortizacaoCtx(event, '${match ? match[1] : ''}')`, 'fas fa-undo', 'var(--alerta)', 'Estornar Amortização');
    } else {
        if (isCartao) {
            const mesFatLogico = window.getMesFaturaLogico(lanc.data, c.fechamento || 1);
            const isFaturaPaga = (db.faturasPagas || []).includes(`${c.id}-${mesFatLogico}`);
            
            html += window.criarBotaoCtx(`acionarVerFaturaCtx(event, '${lanc.contaId}', '${mesFatLogico}')`, 'fas fa-file-invoice', 'var(--azul)', 'Ver fatura');
            
            if (isFixoParcelado) {
                html += window.criarBotaoCtx(`acionarEdicaoParcelamento('${lanc.idGrupo || lanc.idRecorrencia}')`, 'fas fa-boxes', 'var(--alerta)', 'Ver parcelamento');
            } else {
                if (!isFaturaPaga) {
                    if (lanc.tipo === 'rec_emprestimo' && lanc.idOrigem) {
                        html += window.criarBotaoCtx(`acionarVerOrigem('${lanc.idOrigem}')`, 'fas fa-search-dollar', 'var(--azul)', 'Ver origem');
                    }
                    html += window.criarBotaoCtx('acionarAjusteCtx(event)', 'fas fa-edit', 'var(--azul)', 'Ajustes');
                    html += window.criarBotaoCtx('acionarExcluirCtx(event)', 'fas fa-trash', 'var(--perigo)', 'Excluir');
                }
            }
        } else {
            if (lanc.tipo === 'rec_emprestimo') {
                if (!lanc.efetivado) html += window.criarBotaoCtx('acionarPagarCtx(event)', 'fas fa-check-double', 'var(--sucesso)', 'Confirmar recebimento');
                else html += window.criarBotaoCtx('acionarReabrirCtx(event)', 'fas fa-undo', 'var(--alerta)', 'Reabrir');
                if (lanc.idOrigem) html += window.criarBotaoCtx(`acionarVerOrigem('${lanc.idOrigem}')`, 'fas fa-search-dollar', 'var(--azul)', 'Ver origem');
                html += window.criarBotaoCtx('acionarAjusteCtx(event)', 'fas fa-edit', 'var(--azul)', 'Ajustes');
                html += window.criarBotaoCtx('acionarExcluirCtx(event)', 'fas fa-trash', 'var(--perigo)', 'Excluir');
            } 
            else if (isFixoParcelado) {
                html += window.criarBotaoCtx(`acionarEdicaoParcelamento('${lanc.idGrupo || lanc.idRecorrencia}')`, 'fas fa-boxes', 'var(--alerta)', 'Ver parcelamento');
                if (lanc.efetivado) html += window.criarBotaoCtx('acionarReabrirCtx(event)', 'fas fa-undo', 'var(--alerta)', 'Reabrir');
                else html += window.criarBotaoCtx('acionarPagarCtx(event)', 'fas fa-check', 'var(--sucesso)', 'Pagar');
            } 
            else if (isReceita) {
                if (lanc.efetivado) html += window.criarBotaoCtx('acionarReabrirCtx(event)', 'fas fa-undo', 'var(--alerta)', 'Reabrir');
                else {
                    html += window.criarBotaoCtx('acionarPagarCtx(event)', 'fas fa-check-double', 'var(--sucesso)', 'Confirmar recebimento');
                    html += window.criarBotaoCtx('acionarAjusteCtx(event)', 'fas fa-edit', 'var(--azul)', 'Ajustes');
                    html += window.criarBotaoCtx('acionarExcluirCtx(event)', 'fas fa-trash', 'var(--perigo)', 'Excluir');
                }
            } 
            else if (isDespesa) {
                if (lanc.efetivado) html += window.criarBotaoCtx('acionarReabrirCtx(event)', 'fas fa-undo', 'var(--alerta)', 'Reabrir');
                else {
                    html += window.criarBotaoCtx('acionarPagarCtx(event)', 'fas fa-check', 'var(--sucesso)', 'Pagar');
                    html += window.criarBotaoCtx('acionarAjusteCtx(event)', 'fas fa-edit', 'var(--azul)', 'Ajustes');
                    html += window.criarBotaoCtx('acionarExcluirCtx(event)', 'fas fa-trash', 'var(--perigo)', 'Excluir');
                }
            }
        }
    }

    menu.innerHTML = html; menu.style.display = 'flex';
    if (menu.lastChild && menu.lastChild.tagName === 'DIV') menu.lastChild.remove();

    let x = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX; 
    let y = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    const rect = menu.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 10;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 10;
    menu.style.left = `${x}px`; menu.style.top = `${y}px`;
};

window.mostrarContextMenuFatura = function(e, fatID) {
    if ("vibrate" in navigator) navigator.vibrate(50);
    const menu = document.getElementById('context-menu-fatura'); if(!menu) return;
    
    const parts = fatID.split('-'); if (parts.length < 3) return;
    const mesFat = `${parts[parts.length - 2]}-${parts[parts.length - 1]}`;
    const contaId = parts.slice(0, parts.length - 2).join('-');
    const c = (db.contas || []).find(x => String(x.id) === String(contaId)); if (!c) return;
    const isPaga = (db.faturasPagas || []).includes(fatID);
    
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    let anoFat = parseInt(mesFat.split('-')[0], 10); let mesFatNum = parseInt(mesFat.split('-')[1], 10);
    let diaFech = parseInt(c.fechamento, 10) || 1;
    const dataFechamento = new Date(anoFat, mesFatNum - 1, diaFech, 0, 0, 0);
    const isFechada = hoje.getTime() >= dataFechamento.getTime();
    
    let html = '';
    if (isPaga) html += window.criarBotaoCtx(`acionarEstornoFaturaCtx(event, '${fatID}')`, 'fas fa-undo', 'var(--alerta)', 'Reabrir fatura');
    else if (isFechada) {
        html += window.criarBotaoCtx(`acionarAmortizarCtx(event, '${fatID}')`, 'fas fa-hand-holding-usd', 'var(--sucesso)', 'Pagamento parcial');
        html += window.criarBotaoCtx(`acionarQuitarFaturaCtx(event, '${fatID}')`, 'fas fa-check-double', 'var(--esmeralda)', 'Quitar fatura');
    } else html += window.criarBotaoCtx(`acionarAmortizarCtx(event, '${fatID}')`, 'fas fa-forward', 'var(--azul)', 'Adiantamento');

    menu.innerHTML = html; menu.style.display = 'flex';
    if (menu.lastChild && menu.lastChild.tagName === 'DIV') menu.lastChild.remove();

    let x = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX; 
    let y = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    const rect = menu.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 10;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 10;
    menu.style.left = `${x}px`; menu.style.top = `${y}px`;
};

// ==============================================================
// MODAL DE METAS INDIVIDUAIS POR CARTÃO (BLINDAGEM ABSOLUTA)
// ==============================================================
window.abrirModalMetasIndividuais = function() {
    // 1. Cirurgia de DOM: Encontra e extermina modais vazios ou conflitantes advindos do index.html
    const fantasmas = ['modal-metas-individuais', 'modal-metas', 'modal-metas-cartoes'];
    fantasmas.forEach(id => {
        let fantasma = document.getElementById(id);
        if (fantasma) fantasma.remove();
    });
    
    // 2. Cria o modal original, fresco e garantido de ter a estrutura visual
    let modal = document.createElement('div');
    modal.id = 'modal-metas-individuais';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:999999; justify-content:center; align-items:center; opacity:0; transition: opacity 0.3s ease;';
    
    let htmlCartoes = '';
    
    try {
        const cartoes = (db.contas || []).filter(c => c.tipo === 'cartao');
        
        if (cartoes.length === 0) {
            htmlCartoes = '<p class="texto-vazio" style="font-size:13px; text-align:center;">Nenhum cartão de crédito cadastrado.</p>';
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
                        const mesFat = window.getMesFaturaLogico(l.data, diaFech);
                        if (mesFat === strMesAtivo) {
                            const despesasValidas = ['despesas_gerais', 'emprestei_cartao', 'despesa', 'emp_cartao'];
                            const receitasValidas = ['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas', 'estorno', 'saque_poupanca', 'receita', 'emp_pessoal', 'compensacao'];
                            
                            if (despesasValidas.includes(l.tipo)) usoMeta += parseFloat(l.valor) || 0;
                            else if (receitasValidas.includes(l.tipo)) usoMeta -= parseFloat(l.valor) || 0;
                        }
                    }
                });
                
                if (usoMeta < 0) usoMeta = 0;
                const metaDefinida = parseFloat(c.meta) || 0;
                const pMeta = metaDefinida > 0 ? (usoMeta / metaDefinida) * 100 : 0;
                const corBarra = pMeta > 100 ? 'var(--perigo)' : (pMeta > 80 ? 'var(--alerta)' : 'var(--esmeralda)');
                
                const formatoMeta = window.fmtBR ? window.fmtBR(metaDefinida) : metaDefinida.toFixed(2);
                const formatoUso = window.fmtBR ? window.fmtBR(usoMeta) : usoMeta.toFixed(2);
                
                htmlCartoes += `
                <div style="margin-bottom:15px; border-bottom:1px solid var(--linha); padding-bottom:15px;">
                    <div class="flex-between" style="margin-bottom:8px;">
                        <strong style="font-size:14px; color:var(--texto-main);">${c.nome || 'Cartão'}</strong>
                        <span style="font-size:12px; font-weight:bold; color:${corBarra};">${pMeta.toFixed(1)}%</span>
                    </div>
                    <div class="flex-between" style="font-size:12px; color:var(--texto-sec); margin-bottom:6px;">
                        <span>Uso: R$ ${formatoUso}</span>
                        <span>Meta: R$ ${formatoMeta}</span>
                    </div>
                    <div style="background:var(--fundo); height:8px; border-radius:8px; overflow:hidden;">
                        <div style="background:${corBarra}; width:${Math.min(pMeta, 100)}%; height:100%; border-radius:8px; transition: width 0.5s ease;"></div>
                    </div>
                </div>
                `;
            });
        }
    } catch (err) {
        htmlCartoes = `<div style="text-align:center; padding:10px;"><p style="color:var(--perigo); font-size:12px;">Erro: ${err.message}</p></div>`;
    }
    
    // 3. Força a recriação da estrutura inteira do modal (Header, Body, Close Button) para garantir que não será branco
    modal.innerHTML = `
        <div class="modal-content" style="background:var(--card-bg); width:90%; max-width:400px; border-radius:16px; box-shadow:var(--shadow-md); transform: translateY(20px); transition: transform 0.3s ease; display:flex; flex-direction:column; overflow:hidden;">
            <div class="modal-header" style="padding: 20px 25px; border-bottom: 1px solid var(--linha); display:flex; justify-content:space-between; align-items:center; background: var(--card-bg);">
                <h3 style="margin:0; font-size: 16px; color:var(--texto-main); display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-bullseye" style="color:var(--esmeralda);"></i> Metas por Cartão
                </h3>
                <button class="btn-icon" style="color:var(--texto-sec); font-size:18px; cursor:pointer; background:transparent; border:none;" onclick="fecharModalMetasIndividuais()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body" style="padding:25px; max-height:60vh; overflow-y:auto; background: var(--card-bg);">
                ${htmlCartoes}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.style.display = 'flex';
    setTimeout(() => { 
        modal.style.opacity = '1'; 
        modal.querySelector('.modal-content').style.transform = 'translateY(0)'; 
    }, 10);
};

window.fecharModalMetasIndividuais = function() {
    const modal = document.getElementById('modal-metas-individuais');
    if (modal) {
        modal.style.opacity = '0'; 
        const content = modal.querySelector('.modal-content');
        if (content) content.style.transform = 'translateY(20px)';
        setTimeout(() => { modal.remove(); }, 300);
    }
};

// ==============================================================
// MOTOR DE SOBRESCRITA (IGNORA OS ERROS DO INDEX.HTML E APP.JS)
// Executado somente após tudo terminar de carregar na página
// ==============================================================
window.addEventListener('load', function() {
    // Aponta eventuais chamadas obsoletas para a função nova
    window.abrirModalMetas = window.abrirModalMetasIndividuais;
    
    // Procura cartões ou botões que contenham o comando antigo gravado
    document.querySelectorAll('[onclick*="abrirModalMetas"]').forEach(elemento => {
        // Arranca o comando antigo do index.html
        elemento.removeAttribute('onclick');
        // Sobrescreve com o evento puro de clique
        elemento.onclick = function(e) {
            e.preventDefault();
            window.abrirModalMetasIndividuais();
        };
        elemento.style.cursor = 'pointer';
    });
});

// ----------------------------------------------------
// DEMAIS FUNÇÕES DO MOTOR UI
// ----------------------------------------------------

window.estornarAmortizacaoFatura = function(fatID) {
    if(!confirm("Deseja realmente estornar o pagamento parcial desta fatura? O valor voltará para a conta origem e a fatura será reaberta.")) return;

    const valAmortizado = (db.amortizacoesFaturas && db.amortizacoesFaturas[fatID]) || 0;
    if(valAmortizado <= 0) return alert("Não há valor amortizado para estornar.");

    const lancIndex = db.lancamentos.findIndex(l => String(l.id).startsWith(`am_fat_${fatID}`));
    if (lancIndex !== -1) {
        const l = db.lancamentos[lancIndex];
        const contaOrigem = db.contas.find(c => String(c.id) === String(l.contaId));
        if (contaOrigem && contaOrigem.tipo !== 'cartao') contaOrigem.saldo += l.valor; 
        db.lancamentos.splice(lancIndex, 1);
    }

    db.amortizacoesFaturas[fatID] = 0;

    if (db.faturasPagas && db.faturasPagas.includes(fatID)) {
        db.faturasPagas = db.faturasPagas.filter(id => id !== fatID);
        
        let lancQuitacao = db.lancamentos.find(l => String(l.id).startsWith('pg_fat_' + fatID));
        if (lancQuitacao) {
            lancQuitacao.id = lancQuitacao.id.replace('pg_fat_', 'am_fat_');
            lancQuitacao.desc = lancQuitacao.desc.replace('Pagamento Fatura', 'Pag. Parcial Fatura');
            db.amortizacoesFaturas[fatID] = lancQuitacao.valor;
        }
    }

    if(typeof save === 'function') save();
    if(typeof showToast === 'function') showToast("Amortização estornada. Fatura reaberta!", "alerta");
    
    if (typeof fecharMenuCtx === 'function') fecharMenuCtx();
    if(typeof render === 'function') render();
    if(typeof renderHistorico === 'function') renderHistorico();
};

window.acionarEstornoAmortizacaoCtx = function(e, fatID) { if(e) e.stopPropagation(); fecharMenuCtx(); window.estornarAmortizacaoFatura(fatID); };
window.acionarEstornoFaturaCtx = function(e, fatID) { if(e) e.stopPropagation(); fecharMenuCtx(); if(typeof motorEstornarFatura === 'function') motorEstornarFatura(fatID); };
window.acionarAmortizarCtx = function(e, fatID) { if(e) e.stopPropagation(); fecharMenuCtx(); if(typeof amortizarFatura === 'function') amortizarFatura(fatID); };
window.acionarQuitarFaturaCtx = function(e, fatID) { 
    if(e) e.stopPropagation(); fecharMenuCtx(); 
    let totalFat = 0;
    (db.lancamentos || []).forEach(l => {
        if(String(l.contaId) === String(fatID.split('-')[0])) {
            const m = window.getMesFaturaLogico(l.data, db.contas.find(c=>String(c.id) === String(l.contaId)).fechamento||1);
            const refMes = fatID.split('-'); const mesFatFormatado = `${refMes[refMes.length-2]}-${refMes[refMes.length-1]}`;
            if(m === mesFatFormatado) totalFat += T_RECEITAS.includes(l.tipo) ? -l.valor : l.valor;
        }
    });
    const amortizado = (db.amortizacoesFaturas && db.amortizacoesFaturas[fatID]) || 0;
    const restante = totalFat - amortizado;
    if(typeof motorPagarFatura === 'function') motorPagarFatura(fatID, restante);
};

window.acionarPagarCtx = function(e) { 
    if(e) e.stopPropagation(); fecharMenuCtx(); 
    if(!currentLancIdCtx) return;
    if(typeof toggleEfetivado === 'function') toggleEfetivado(currentLancIdCtx); 
};

window.acionarReabrirCtx = function(e) { 
    if(e) e.stopPropagation(); fecharMenuCtx(); 
    if(!currentLancIdCtx) return;
    if(typeof toggleEfetivado === 'function') toggleEfetivado(currentLancIdCtx); 
};

window.acionarEdicaoParcelamento = function(id) {
    fecharMenuCtx();
    if (typeof abrirModalListaContratos === 'function') abrirModalListaContratos();
    setTimeout(() => { if (typeof abrirModalEdicaoContrato === 'function') abrirModalEdicaoContrato(id); }, 400);
};

window.acionarVerOrigem = function(idOrigem) {
    fecharMenuCtx();
    if (!idOrigem) return alert("Este recebimento não possui uma origem rastreável (criado manualmente).");
    
    const l = (db.lancamentos || []).find(x => String(x.id) === String(idOrigem));
    if(l) {
        const c = (db.contas || []).find(x => String(x.id) === String(l.contaId));
        if(c && c.tipo === 'cartao') {
            const mesFatLogico = window.getMesFaturaLogico(l.data, c.fechamento || 1);
            acionarVerFaturaCtx(null, c.id, mesFatLogico);
        } else {
            if (typeof irParaExtratoEMes === 'function') {
                irParaExtratoEMes(l.data.substring(0,7), l.id);
            } else {
                alert("A origem está no extrato de " + l.data.substring(0,7));
            }
        }
    } else {
        alert("O lançamento que originou esta restituição foi excluído ou não foi identificado.");
    }
};

window.acionarVerFaturaCtx = function(e, contaId, mesLogicoFat) {
    if(e) e.stopPropagation(); fecharMenuCtx();
    
    if (typeof fecharPainelNotificacoes === 'function') fecharPainelNotificacoes();
    if (typeof fecharNotificacoes === 'function') fecharNotificacoes();
    const painelNotif = document.getElementById('painel-notificacoes');
    if (painelNotif) painelNotif.classList.remove('active'); 
    
    if (contaId) window.cartaoAtivoFatura = String(contaId);
    
    if (typeof window.irParaFaturas === 'function') window.irParaFaturas();
    else if (typeof navegar === 'function') {
        navegar('faturas'); document.querySelectorAll('#menu-lateral .menu-item').forEach(el => el.classList.remove('active'));
        let itemFaturas = document.querySelectorAll('#menu-lateral .menu-item')[1]; if(itemFaturas) itemFaturas.classList.add('active');
    }

    if(typeof renderAbaFaturas === 'function') renderAbaFaturas();

    setTimeout(() => {
        const fatIDCompleto = `${contaId}-${mesLogicoFat}`;
        const faturaCard = document.getElementById(`fat-card-${fatIDCompleto}`);
        if (faturaCard) {
            faturaCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
            faturaCard.classList.add('fade-highlight');
            const detalhe = document.getElementById(`edit-lanc-det-fat-${fatIDCompleto}`); 
            const icone = document.getElementById(`icon-det-fat-${fatIDCompleto}`);
            if(detalhe && detalhe.style.display === 'none') { detalhe.style.display = 'block'; if(icone) icone.classList.add('open'); }
            setTimeout(() => faturaCard.classList.remove('fade-highlight'), 3000);
        }
    }, 500);
};

window.acionarAjusteCtx = function(e) {
    if(e) e.stopPropagation(); fecharMenuCtx();
    if(currentLancIdCtx) {
        if (typeof window.abrirModalEdicaoLancamento === 'function') window.abrirModalEdicaoLancamento(currentLancIdCtx);
        else {
            const el = document.getElementById(`edit-lanc-${currentLancIdCtx}`);
            if(el) { el.style.display = 'block'; setTimeout(() => { const card = el.closest('.fatura-card'); if(card) card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); }
        }
    }
};
window.acionarExcluirCtx = function(e) { if(e) e.stopPropagation(); fecharMenuCtx(); if(currentLancIdCtx && typeof excluirLancamento === 'function') excluirLancamento(currentLancIdCtx); };

let biInterval, radarInterval;
window.iniciarCarrosselBI = function() { clearInterval(biInterval); const slides = document.querySelectorAll('#carrossel-bi-container .carrossel-slide'); const dots = document.querySelectorAll('.bi-dot'); if(slides.length <= 1) return; let slideIndex = 0; biInterval = setInterval(() => { slides[slideIndex].classList.remove('active'); if(dots[slideIndex]) dots[slideIndex].style.background = 'var(--linha)'; slideIndex = (slideIndex + 1) % slides.length; slides[slideIndex].classList.add('active'); if(dots[slideIndex]) dots[slideIndex].style.background = 'var(--esmeralda)'; }, 9000); };
window.iniciarCarrosselRadar = function() { clearInterval(radarInterval); const slides = document.querySelectorAll('#carrossel-radar-container .radar-slide'); if(slides.length <= 1) return; let slideIndex = 0; radarInterval = setInterval(() => { slides[slideIndex].classList.remove('active'); slideIndex = (slideIndex + 1) % slides.length; slides[slideIndex].classList.add('active'); }, 6000); };

window.render = function() {
    if (typeof db === 'undefined' || !db.contas) return;
    const hoje = new Date(); const mesCorrente = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`; const diaHoje = hoje.getDate();
    
    let calc = { receitasPagas: 0, receitasTotalMes: 0, despesasPagas: 0, despesasTotalMes: 0, faturas: 0, faturasFuturas: 0, saldoLivre: 0, investido: 0, usoMetaCartao: 0, metaTotalCartao: 0, gastosFixos: 0, gastosVariaveis: 0 };
    const catFixas = (db.categorias || []).filter(c => c.fixa).map(c => c.nome);
    let faturasFuturasMapa = {}; 

    (db.contas || []).forEach(c => { 
        if(c.tipo === 'movimentacao') calc.saldoLivre += c.saldo; 
        if(c.tipo === 'investimento') calc.investido += c.saldo; 
        if(c.tipo === 'cartao') calc.metaTotalCartao += c.meta; 
    });

    (db.lancamentos || []).forEach(l => {
        const conta = (db.contas || []).find(c => String(c.id) === String(l.contaId)); if(!conta) return;
        
        if (conta.tipo === 'cartao') {
            const mesFatura = window.getMesFaturaLogico(l.data, conta.fechamento || 1); 
            const fatID = `${conta.id}-${mesFatura}`;
            
            if (!(db.faturasPagas || []).includes(fatID)) {
                const valMutante = T_RECEITAS.includes(l.tipo) ? -l.valor : l.valor;
                if (mesFatura > mesCorrente) faturasFuturasMapa[mesFatura] = (faturasFuturasMapa[mesFatura] || 0) + valMutante;
                else calc.faturas += valMutante;
            }
            
            let mesAtivoFatura = hoje.getMonth() + 1; let anoAtivoFatura = hoje.getFullYear();
            if (diaHoje >= (conta.fechamento || 1)) { mesAtivoFatura += 1; if (mesAtivoFatura > 12) { mesAtivoFatura = 1; anoAtivoFatura += 1; } }
            if (mesFatura === `${anoAtivoFatura}-${mesAtivoFatura.toString().padStart(2, '0')}`) {
                if (['despesas_gerais', 'despesa'].includes(l.tipo)) calc.usoMetaCartao += l.valor;
                else if (T_RECEITAS.includes(l.tipo)) calc.usoMetaCartao -= l.valor;
            }
            if (mesFatura === mesCorrente && ['despesas_gerais', 'despesa', 'emprestei_cartao'].includes(l.tipo)) { 
                if(catFixas.includes(l.cat)) calc.gastosFixos += l.valor; else calc.gastosVariaveis += l.valor; 
            }
        } else {
            if (l.data.substring(0,7) === mesCorrente) {
                if (T_RECEITAS.includes(l.tipo)) { calc.receitasTotalMes += l.valor; if (l.efetivado) calc.receitasPagas += l.valor; }
                if (T_DESPESAS.includes(l.tipo) && !['emprestei_cartao', 'emp_cartao'].includes(l.tipo)) { 
                    calc.despesasTotalMes += l.valor; 
                    if (l.efetivado) { calc.despesasPagas += l.valor; if(catFixas.includes(l.cat)) calc.gastosFixos += l.valor; else calc.gastosVariaveis += l.valor; }
                }
            }
        }
    });

    let mesesFuturosOrdenados = Object.keys(faturasFuturasMapa).sort();
    if (mesesFuturosOrdenados.length > 0) calc.faturasFuturas = faturasFuturasMapa[mesesFuturosOrdenados[0]];

    if (calc.usoMetaCartao < 0) calc.usoMetaCartao = 0;
    if (db.amortizacoesFaturas) {
        Object.keys(db.amortizacoesFaturas).forEach(fatID => {
            if (!(db.faturasPagas || []).includes(fatID)) {
                if (fatID.includes(mesCorrente)) calc.faturas -= db.amortizacoesFaturas[fatID];
                else if (mesesFuturosOrdenados.length > 0 && fatID.includes(mesesFuturosOrdenados[0])) calc.faturasFuturas -= db.amortizacoesFaturas[fatID];
            }
        });
    }

    const setTexto = (id, texto) => { const el = document.getElementById(id); if(el) el.innerText = texto; };
    
    setTexto('dash-receitas', `R$ ${fmtBR(calc.receitasPagas)}`); setTexto('dash-prev-receitas', `R$ ${fmtBR(calc.receitasTotalMes)}`); setTexto('dash-despesas', `R$ ${fmtBR(calc.despesasPagas)}`); setTexto('dash-prev-gastos', `R$ ${fmtBR(calc.despesasTotalMes)}`);  setTexto('dash-faturas', `R$ ${fmtBR(calc.faturas)}`); setTexto('dash-faturas-futuras', `R$ ${fmtBR(calc.faturasFuturas)}`); setTexto('dash-saldo-livre', `R$ ${fmtBR(calc.saldoLivre)}`); setTexto('dash-investido', `R$ ${fmtBR(calc.investido)}`);

    const saldoProjetado = calc.saldoLivre - (calc.despesasTotalMes - calc.despesasPagas) - calc.faturas + (calc.receitasTotalMes - calc.receitasPagas); 
    const projElem = document.getElementById('dash-projecao');
    if(projElem) { projElem.innerText = `R$ ${fmtBR(saldoProjetado)}`; projElem.style.color = saldoProjetado >= 0 ? 'var(--sucesso)' : 'var(--perigo)'; }

    setTexto('uso-meta-texto', `R$ ${fmtBR(calc.usoMetaCartao)} / R$ ${fmtBR(calc.metaTotalCartao)}`);
    const pMeta = calc.metaTotalCartao > 0 ? (calc.usoMetaCartao / calc.metaTotalCartao) * 100 : 0; 
    const metaBar = document.getElementById('meta-bar');
    if(metaBar) { metaBar.style.width = Math.min(pMeta, 100) + "%"; metaBar.style.background = pMeta > 100 ? '#ef4444' : (pMeta > 80 ? '#f59e0b' : '#10b981'); }
    setTexto('meta-percentual', `${pMeta.toFixed(1)}%`);

    const metaTextoElem = document.getElementById('uso-meta-texto');
    if(metaTextoElem) {
        const cardMetas = metaTextoElem.closest('.card-simples');
        if (cardMetas) { 
            cardMetas.style.cursor = 'pointer'; 
            cardMetas.setAttribute('title', 'Clique para ver as metas por cartão'); 
            cardMetas.onclick = function(e) { e.preventDefault(); window.abrirModalMetasIndividuais(); }; 
        }
    }

    const patrimonioLiquido = calc.saldoLivre + calc.investido - calc.faturas; 
    const patElem = document.getElementById('bi-patrimonio');
    if(patElem) { patElem.innerText = `R$ ${fmtBR(patrimonioLiquido)}`; patElem.style.color = patrimonioLiquido >= 0 ? 'var(--sucesso)' : 'var(--perigo)'; }

    const custoMensal = calc.despesasPagas + calc.faturas; 
    setTexto('bi-sobrevivencia', custoMensal > 0 ? `${(calc.investido / custoMensal).toFixed(1)} Meses` : '∞ Meses');

    const taxaPoupanca = calc.receitasPagas > 0 ? ((calc.receitasPagas - custoMensal) / calc.receitasPagas) * 100 : 0;
    setTexto('bi-taxa-poupanca', `${taxaPoupanca.toFixed(1)}%`);
    const barPoupanca = document.getElementById('bar-poupanca'); 
    if(barPoupanca) barPoupanca.style.width = `${Math.min(Math.max(0, taxaPoupanca), 100)}%`;

    const totalGastosBI = calc.gastosFixos + calc.gastosVariaveis; 
    const percFixo = totalGastosBI > 0 ? (calc.gastosFixos / totalGastosBI) * 100 : 0; const percVar = totalGastosBI > 0 ? (calc.gastosVariaveis / totalGastosBI) * 100 : 0;
    setTexto('bi-perc-fixo', `${percFixo.toFixed(0)}%`); setTexto('bi-perc-var', `${percVar.toFixed(0)}%`);
    const barFixo = document.getElementById('bar-fixo'); const barVar = document.getElementById('bar-var');
    if(barFixo) barFixo.style.width = `${percFixo}%`; if(barVar) barVar.style.width = `${percVar}%`;

    window.iniciarCarrosselBI();
    if (typeof renderRadarVencimentos === 'function') renderRadarVencimentos(); 
    if (typeof renderHistorico === 'function') renderHistorico(); 
    if (typeof renderAbaContas === 'function') renderAbaContas(); 
    if (typeof renderAbaFaturas === 'function') renderAbaFaturas(); 
    if (typeof renderListaContratos === 'function') renderListaContratos();
    if (typeof renderListaSalarios === 'function') renderListaSalarios();
    setTimeout(() => { if (typeof renderGrafico === 'function') renderGrafico(); if (typeof renderGraficoEvolucao === 'function') renderGraficoEvolucao(); }, 100);
}

window.renderFiltrosExtratoDinamicamente = function() {
    const selectCat = document.getElementById('filtro-cat'); const selectConta = document.getElementById('filtro-conta');
    if (selectCat) {
        let catAtual = selectCat.value || 'todas'; let catsUnicas = new Set();
        (db.lancamentos || []).forEach(l => { if(l.cat) catsUnicas.add(l.cat); });
        let htmlCat = `<option value="todas">Todas</option>`;
        Array.from(catsUnicas).sort((a,b) => a.localeCompare(b)).forEach(cat => { htmlCat += `<option value="${cat}" ${catAtual === cat ? 'selected' : ''}>${cat}</option>`; });
        selectCat.innerHTML = htmlCat;
    }
    if (selectConta) {
        let contaAtual = selectConta.value || 'todas';
        let htmlConta = `<option value="todas">Todas as Contas e Cartões</option>`;
        (db.contas || []).forEach(c => { htmlConta += `<option value="${c.id}" ${contaAtual === c.id ? 'selected' : ''}>${c.tipo === 'cartao' ? '💳' : (c.tipo === 'investimento' ? '📈' : '🏦')} ${c.nome}</option>`; });
        selectConta.innerHTML = htmlConta;
    }
};

window.renderHistorico = function() {
    const lista = document.getElementById('lista-historico-filtros'); if(!lista) return;
    if (typeof window.renderFiltrosExtratoDinamicamente === 'function') window.renderFiltrosExtratoDinamicamente();

    const inputMes = document.getElementById('filtro-mes'); 
    const mesFiltro = (inputMes && inputMes.value) ? inputMes.value : `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`; 
    const statusFiltro = document.getElementById('filtro-status') ? document.getElementById('filtro-status').value : 'todos';
    const catFiltro = document.getElementById('filtro-cat') ? document.getElementById('filtro-cat').value : 'todas';
    const contaFiltro = document.getElementById('filtro-conta') ? document.getElementById('filtro-conta').value : 'todas';
    
    if (inputMes && !inputMes.value) inputMes.value = mesFiltro;
    const limiteAtencao = new Date(); limiteAtencao.setHours(0,0,0,0); limiteAtencao.setDate(limiteAtencao.getDate() + 7);

    let lancs = (db.lancamentos || []).map(l => {
        if(!l || !l.data) return null; 
        const c = (db.contas || []).find(x => String(x.id) === String(l.contaId)); 
        let dtRef = new Date(l.data + 'T00:00:00'); let status = '';
        
        if (c && c.tipo === 'cartao') { 
            const mesFat = window.getMesFaturaLogico(l.data, c.fechamento || 1); 
            
            let anoFat = parseInt(mesFat.split('-')[0]);
            let mesFatNum = parseInt(mesFat.split('-')[1]);
            let diaFech = parseInt(c.fechamento) || 1;
            let diaVenc = parseInt(c.vencimento) || 1;
            let mesFechamento = mesFatNum; let anoFechamento = anoFat;
            if (diaFech > diaVenc) { mesFechamento -= 1; if (mesFechamento < 1) { mesFechamento = 12; anoFechamento -= 1; } }
            const dataFechamento = new Date(anoFechamento, mesFechamento - 1, diaFech, 0, 0, 0);

            if ((db.faturasPagas || []).includes(`${c.id}-${mesFat}`)) status = 'pago'; 
            else if (new Date() >= dataFechamento) status = 'atencao'; 
            else status = 'em_aberto'; 
        } else { 
            if (l.efetivado) status = T_RECEITAS.includes(l.tipo) ? 'receita' : 'pago'; 
            else if (dtRef < new Date().setHours(0,0,0,0)) status = 'atrasado'; 
            else if (dtRef <= limiteAtencao) status = 'atencao'; 
            else status = 'em_aberto'; 
        }
        return { ...l, statusCalculado: status, contaObj: c, isReceita: T_RECEITAS.includes(l.tipo) };
    }).filter(l => l !== null && l.data.substring(0,7) === mesFiltro && (statusFiltro === 'todos' || l.statusCalculado === statusFiltro) && (catFiltro === 'todas' || l.cat === catFiltro) && (contaFiltro === 'todas' || l.contaId === contaFiltro)).sort((a, b) => new Date(b.data) - new Date(a.data) || b.id - a.id);
    
    if(lancs.length === 0) { lista.innerHTML = "<div class='card texto-vazio'>Nenhum registro encontrado com estes filtros.</div>"; return; }

    const catDBList = [...(db.categorias || [])];
    lista.innerHTML = `<div class="flex-between" style="margin-bottom: 12px; align-items: center; padding: 0 5px;"><span style="font-size: 12px; color: var(--texto-sec); font-weight: 600;"><i class="fas fa-list"></i> ${lancs.length} registros</span></div>` + lancs.map(l => {
        const c = l.contaObj; let chipHtml = ''; 
        const chipStyle = `padding:3px 8px; border-radius:6px; font-size:9px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase; color:#fff; flex-shrink:0;`;
        if (c && c.tipo === 'cartao') chipHtml = `<span style="${chipStyle} background:var(--${l.statusCalculado==='pago'?'sucesso':(l.statusCalculado==='atencao'?'alerta':'azul')});">FATURA ${l.statusCalculado==='pago'?'PAGA':(l.statusCalculado==='atencao'?'FECHADA':'ABERTA')}</span>`; 
        else chipHtml = `<span style="${chipStyle} background:var(--${l.statusCalculado==='receita'?'esmeralda':(l.statusCalculado==='pago'?'sucesso':(l.statusCalculado==='atrasado'?'perigo':(l.statusCalculado==='atencao'?'alerta':'azul')))});">${l.statusCalculado==='receita'?'RECEBIDO':(l.statusCalculado==='pago'?'PAGO':(l.statusCalculado==='atrasado'?'ATRASADO':(l.statusCalculado==='atencao'?'ATENÇÃO':(l.isReceita?'A RECEBER':'EM ABERTO'))))}</span>`; 

        const catDB = catDBList.find(cat => cat.nome === l.cat); 
        let accOpts = c ? (db.contas || []).filter(acc => (acc.tipo === 'cartao') === (c.tipo === 'cartao')).map(acc => `<option value="${acc.id}" ${acc.id === c.id ? 'selected' : ''}>${acc.tipo === 'cartao' ? '💳' : '🏦'} ${acc.nome}</option>`).join('') : `<option value="${l.contaId}">Conta Excluída</option>`;
        let catOpts = '<option value="">Outros</option>' + catDBList.map(cat => `<option value="${cat.nome}" ${l.cat === cat.nome ? 'selected' : ''}>${cat.icone || ''} ${cat.nome}</option>`).join('');

        return `
        <div class="card fatura-card ${!l.efetivado ? 'opacity-90' : ''}" id="lancamento-card-${l.id}" style="padding:0; overflow:hidden; border:1px solid var(--linha); border-left: 4px solid ${c ? c.cor : '#ccc'}; margin-bottom: 12px; transition: 0.3s;">
            <div style="padding:15px; cursor:context-menu; user-select:none;" oncontextmenu="mostrarContextMenuRightClick(event, '${l.id}')" onmousedown="iniciarLongPress(event, '${l.id}')" onmouseup="cancelarLongPress()" onmouseleave="cancelarLongPress()" ontouchstart="iniciarLongPress(event, '${l.id}')" ontouchend="cancelarLongPress()" ontouchmove="cancelarLongPress(); fecharMenuCtx();">
                <div class="flex-between" style="margin-bottom: 8px; gap: 8px;"><strong style="font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${l.desc || 'Sem descrição'}</strong>${chipHtml}</div>
                <div class="flex-between" style="align-items: center; gap: 10px;">
                    <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-width:0;">
                        <small style="color:var(--texto-sec); font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${(l.data || '').split('-').reverse().join('/')} • ${c?c.nome:'Excluída'}</small>
                        <span style="font-size:11px; font-weight:600; color:var(--texto-sec); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${catDB&&catDB.icone?catDB.icone+' ':''}${l.cat || 'Outros'}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; flex-shrink: 0;">
                        <strong style="color: ${T_DESPESAS.includes(l.tipo) ? 'var(--perigo)' : 'var(--sucesso)'}; font-size:16px; white-space: nowrap; flex-shrink: 0;">${l.isReceita ? '+' : '-'} R$ ${fmtBR(l.valor || 0)}</strong>
                        <button class="btn-icon" style="width:30px; height:30px; margin-left: 5px; flex-shrink: 0;" onclick="mostrarContextMenuRightClick(event, '${l.id}')"><i class="fas fa-ellipsis-v" style="color:var(--texto-sec);"></i></button>
                    </div>
                </div>
            </div>
            <div id="edit-lanc-${l.id}" style="display:none; padding:15px; border-top:1px dashed var(--linha); background:var(--input-bg);" onclick="event.stopPropagation()">
                <label class="label-moderno">Editar Descrição</label><input type="text" id="e-lanc-desc-${l.id}" class="input-moderno mb-10" value="${l.desc || ''}">
                <label class="label-moderno">Conta Origem/Destino</label><select id="e-lanc-conta-${l.id}" class="input-moderno mb-10">${accOpts}</select>
                <label class="label-moderno">Categoria</label><select id="e-lanc-cat-${l.id}" class="input-moderno mb-10">${catOpts}</select>
                <div class="grid-inputs mb-10"><div><label class="label-moderno">Data</label><input type="date" id="e-lanc-data-${l.id}" class="input-moderno" value="${l.data || ''}"></div><div><label class="label-moderno">Valor (R$)</label><input type="text" inputmode="numeric" id="e-lanc-val-${l.id}" class="input-moderno" value="${(l.valor || 0).toFixed(2).replace('.', ',')}" oninput="if(typeof mascaraMoeda === 'function') mascaraMoeda(event)"></div></div>
                <div class="flex-between mt-10" style="gap:8px;">
                    <button class="btn-outline" style="flex: 1; padding: 12px; font-size: 13px; border-radius: 10px;" onclick="toggleEditLancamento('${l.id}')">Cancelar</button>
                    <button class="btn-primary" style="flex: 1; padding: 12px; font-size: 13px; border-radius: 10px;" onclick="salvarEdicaoLancamento('${l.id}')">Salvar</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

window.toggleEditLancamento = function(id) { 
    if (typeof id === 'string' && id.includes('det-fat')) {
        const el = document.getElementById(`edit-lanc-${id}`); 
        const icon = document.getElementById(`icon-${id}`); 
        if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; 
        if(icon) icon.classList.toggle('open'); 
        return;
    }
    if (typeof window.abrirModalEdicaoLancamento === 'function') {
        window.abrirModalEdicaoLancamento(id);
    } else {
        const el = document.getElementById(`edit-lanc-${id}`); 
        if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; 
    }
}

window.renderAbaContas = function() {
    const lista = document.getElementById('lista-contas-saldos'); if(!lista) return; lista.innerHTML = ``;
    (db.contas || []).forEach(c => {
        const isCartao = c.tipo === 'cartao'; let extraHtml = ''; let usoLimite = 0; let usoMeta = 0;
        if (isCartao) {
            const hoje = new Date(); const diaHoje = hoje.getDate();
            let mesAtivo = hoje.getMonth() + 1; let anoAtivo = hoje.getFullYear();
            if (diaHoje >= (c.fechamento || 1)) { mesAtivo += 1; if (mesAtivo > 12) { mesAtivo = 1; anoAtivo += 1; } }
            const strMesAtivo = `${anoAtivo}-${mesAtivo.toString().padStart(2, '0')}`;
            
            (db.lancamentos || []).forEach(l => { 
                if (String(l.contaId) === String(c.id)) { 
                    const mesLancLogico = window.getMesFaturaLogico(l.data, c.fechamento || 1); 
                    const isPaga = (db.faturasPagas || []).includes(`${c.id}-${mesLancLogico}`); 
                    let valorCalc = 0; 
                    if (T_DESPESAS_CARTAO.includes(l.tipo)) valorCalc = l.valor; else if (T_RECEITAS.includes(l.tipo)) valorCalc = -l.valor; 
                    if (valorCalc !== 0) { if (mesLancLogico === strMesAtivo) usoMeta += valorCalc; if (!isPaga) usoLimite += valorCalc; } 
                }
            });
            Object.keys(db.amortizacoesFaturas || {}).forEach(fatID => { if (fatID.split('-')[0] === String(c.id) && !(db.faturasPagas || []).includes(fatID)) usoLimite -= db.amortizacoesFaturas[fatID]; });
            if (usoLimite < 0) usoLimite = 0; if (usoMeta < 0) usoMeta = 0;
            const pLimite = c.limite > 0 ? (usoLimite / c.limite) * 100 : 0; const pMeta = c.meta > 0 ? (usoMeta / c.meta) * 100 : 0;
            
            extraHtml = `<div style="margin-top: 15px; padding-right: 5px;"><div class="limite-texto" style="margin-bottom: 4px; opacity: 0.9; font-size: 11px;"><span>Consumo (Limite): R$ ${fmtBR(usoLimite)} (${pLimite.toFixed(1)}%)</span><span>R$ ${fmtBR(c.limite || 0)}</span></div><div class="limite-bg"><div class="limite-fill" style="width:${Math.min(pLimite,100)}%"></div></div><div class="limite-texto" style="margin-bottom: 4px; margin-top: 10px; opacity: 0.9; font-size: 11px;"><span>Consumo Fatura Atual (Meta): R$ ${fmtBR(usoMeta)} (${pMeta.toFixed(1)}%)</span><span>R$ ${fmtBR(c.meta || 0)}</span></div><div class="limite-bg"><div class="limite-fill" style="width:${Math.min(pMeta,100)}%; background: ${pMeta > 100 ? '#ef4444' : (pMeta > 80 ? '#f59e0b' : '#10b981')};"></div></div></div>`;
        }
        lista.innerHTML += `<div class="cartao-banco" style="background: linear-gradient(135deg, ${c.cor}, #1e293b); margin-bottom: 10px;"><div class="cartao-header"><span class="cartao-nome">${c.nome}</span><span class="cartao-tipo">${isCartao ? 'Crédito' : (c.tipo==='investimento' ? 'Investimento' : 'Corrente')}</span></div><div class="cartao-saldo">R$ ${fmtBR(isCartao ? ((c.limite || 0) - usoLimite) : (c.saldo || 0))}</div>${isCartao ? '<small style="display:block; opacity:0.8; font-size:10px; margin-top:5px;">Limite Disponível</small>' : ''} ${extraHtml}<div class="cartao-acoes"><button class="btn-cartao-acao" onclick="abrirModalExtratoConta('${c.id}')"><i class="fas fa-list-ul"></i> Extrato</button><button class="btn-cartao-acao" onclick="abrirModalAjusteConta('${c.id}')"><i class="fas fa-cog"></i> Ajustes</button></div></div>`;
    });
}

window.renderAbaFaturas = function() {
    const abas = document.getElementById('abas-cartoes-fatura'); 
    const lista = document.getElementById('lista-faturas-agrupadas'); 
    if(!abas || !lista) return; 
    
    abas.removeAttribute("style");
    const cartoes = (db.contas || []).filter(c => c.tipo === 'cartao'); 
    if(cartoes.length === 0) { abas.innerHTML = ""; lista.innerHTML = "<div class='card texto-vazio'>Nenhum cartão cadastrado.</div>"; return; }
    if(!window.cartaoAtivoFatura && cartoes.length > 0) window.cartaoAtivoFatura = cartoes[0].id;
    
    abas.innerHTML = `<div class="segmented-control">` + cartoes.map(c => `<button class="segmented-btn ${String(c.id) === String(window.cartaoAtivoFatura) ? 'active' : ''}" onclick="window.cartaoAtivoFatura='${c.id}'; renderAbaFaturas();">${c.nome}</button>`).join('') + `</div>`;
    
    const c = cartoes.find(x => String(x.id) === String(window.cartaoAtivoFatura)); 
    if(!c) return; 

    const hoje = new Date();
    let mesAtivo = hoje.getMonth() + 1; let anoAtivo = hoje.getFullYear();
    if (hoje.getDate() >= (c.fechamento || 1)) { mesAtivo += 1; if (mesAtivo > 12) { mesAtivo = 1; anoAtivo += 1; } }
    const strMesAtivo = `${anoAtivo}-${mesAtivo.toString().padStart(2, '0')}`;
    
    let usoMetaAtual = 0;
    let mesesFatura = {};

    (db.lancamentos || []).forEach(l => { 
        if(String(l.contaId) !== String(c.id)) return; 
        const mesFat = window.getMesFaturaLogico(l.data, c.fechamento || 1); 
        
        if (mesFat === strMesAtivo) {
            if (T_DESPESAS_CARTAO.includes(l.tipo)) usoMetaAtual += l.valor;
            else if (T_RECEITAS.includes(l.tipo)) usoMetaAtual -= l.valor;
        }

        if(!mesesFatura[mesFat]) mesesFatura[mesFat] = { total: 0, lancamentos: [] }; 
        mesesFatura[mesFat].total += T_RECEITAS.includes(l.tipo) ? -l.valor : l.valor; 
        mesesFatura[mesFat].lancamentos.push(l); 
    });

    if(usoMetaAtual < 0) usoMetaAtual = 0;
    const pMeta = c.meta > 0 ? (usoMetaAtual / c.meta) * 100 : 0;
    
    const htmlMetaIndividual = `
        <div style="background:var(--card-bg); border:1px solid var(--linha); border-radius:12px; padding:15px; margin-bottom:15px; box-shadow:var(--shadow-sm);">
            <div class="flex-between" style="margin-bottom:8px;">
                <div>
                    <strong style="display:block; font-size:13px; color:var(--texto-main);"><i class="fas fa-bullseye" style="color:var(--esmeralda);"></i> Meta da Fatura Atual</strong>
                    <small style="color:var(--texto-sec); font-size:11px;">Fatura ${window.formatarMesFaturaLogico(strMesAtivo)}</small>
                </div>
                <div style="text-align:right;">
                    <strong style="color:${pMeta > 100 ? 'var(--perigo)' : 'var(--texto-main)'}; font-size:14px;">R$ ${fmtBR(usoMetaAtual)}</strong>
                    <small style="display:block; color:var(--texto-sec); font-size:11px;">de R$ ${fmtBR(c.meta || 0)}</small>
                </div>
            </div>
            <div style="background:var(--fundo); height:8px; border-radius:8px; overflow:hidden;">
                <div style="background:${pMeta > 100 ? 'var(--perigo)' : (pMeta > 80 ? 'var(--alerta)' : 'var(--esmeralda)')}; width:${Math.min(pMeta, 100)}%; height:100%; border-radius:8px;"></div>
            </div>
        </div>
    `;

    const mesesOrdenados = Object.keys(mesesFatura).sort((a,b) => new Date(b+'-01') - new Date(a+'-01')); 
    if(mesesOrdenados.length === 0) { lista.innerHTML = htmlMetaIndividual + "<div class='card texto-vazio'>Sem faturas registradas.</div>"; return; }

    lista.innerHTML = htmlMetaIndividual + mesesOrdenados.map(mes => {
        const fatID = `${c.id}-${mes}`; const estaPaga = (db.faturasPagas || []).includes(fatID); 
        const jaAmortizado = (db.amortizacoesFaturas && db.amortizacoesFaturas[fatID]) || 0; 
        const totalFinal = mesesFatura[mes].total - jaAmortizado;
        
        let anoFatM = parseInt(mes.split('-')[0]); let mesFatNumM = parseInt(mes.split('-')[1]);
        let diaFechM = parseInt(c.fechamento) || 1;
        const dataFech = new Date(anoFatM, mesFatNumM - 1, diaFechM, 0, 0, 0);
        
        const hojeCompare = new Date(); hojeCompare.setHours(0,0,0,0);
        const isFechadaM = hojeCompare.getTime() >= dataFech.getTime();

        let statusTag = estaPaga ? '<span class="status-badge" style="background:var(--sucesso); color:#fff; font-size:9px; padding:3px 8px; border-radius:6px; font-weight:800;">PAGO</span>' : (isFechadaM ? '<span class="status-badge" style="background:var(--alerta); color:#fff; font-size:9px; padding:3px 8px; border-radius:6px; font-weight:800;">FECHADA</span>' : '<span class="status-badge" style="background:var(--azul); color:#fff; font-size:9px; padding:3px 8px; border-radius:6px; font-weight:800;">EM ABERTO</span>');

        return `
        <div class="card fatura-card ${estaPaga ? 'paga' : ''}" id="fat-card-${fatID}" style="padding:0; overflow:hidden; border:1px solid ${estaPaga?'var(--sucesso)':'var(--linha)'}; margin-bottom: 12px; transition: 0.3s;">
            <div style="padding:15px; cursor:context-menu; user-select:none; background:${estaPaga?'rgba(16,185,129,0.05)':'var(--card-bg)'};" 
                 oncontextmenu="mostrarContextMenuRightClick(event, '${fatID}', true)" 
                 onmousedown="iniciarLongPress(event, '${fatID}', true)" 
                 onmouseup="cancelarLongPress()" 
                 onmouseleave="cancelarLongPress()" 
                 ontouchstart="iniciarLongPress(event, '${fatID}', true)" 
                 ontouchend="cancelarLongPress()" 
                 ontouchmove="cancelarLongPress(); fecharMenuCtx();" 
                 onclick="toggleEditLancamento('det-fat-${fatID}')">
                <div class="flex-between" style="margin-bottom: 8px;"><strong style="font-size:14px;"><i class="fas fa-file-invoice-dollar" style="color:var(--texto-sec);"></i> Fatura ${window.formatarMesFaturaLogico(mes)}</strong>${statusTag}</div>
                <div class="flex-between" style="align-items: center;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <small style="color:var(--texto-sec); font-size:11px;">Venc: ${(c.vencimento||1).toString().padStart(2,'0')}/${mes.split('-')[1]}</small>
                        <div style="display:flex; align-items:center; gap:8px;"><strong class="${estaPaga?'txt-sucesso':'txt-perigo'}" style="font-size:16px;">R$ ${fmtBR(totalFinal)}</strong><i class="fas fa-chevron-down fatura-chevron" id="icon-det-fat-${fatID}" style="font-size:11px; color:var(--texto-sec);"></i></div>
                    </div>
                    <button class="btn-icon" style="width:30px; height:30px; margin-left: 5px; flex-shrink: 0;" onclick="mostrarContextMenuRightClick(event, '${fatID}', true)"><i class="fas fa-ellipsis-v" style="color:var(--texto-sec);"></i></button>
                </div>
                ${jaAmortizado > 0 ? `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--linha);"><div class="flex-between" style="font-size:10px; color:var(--texto-sec); margin-bottom:4px;"><span>Amortizado: R$ ${fmtBR(jaAmortizado)}</span><div style="display:flex; align-items:center; gap:6px;"><span class="txt-sucesso" style="font-weight:bold;">${((jaAmortizado/mesesFatura[mes].total)*100).toFixed(0)}%</span><button class="btn-icon" style="color:var(--perigo); font-size:11px; padding:2px 6px; border-radius:4px; background:rgba(239, 68, 68, 0.1);" onclick="event.stopPropagation(); window.estornarAmortizacaoFatura('${fatID}')" title="Estornar Amortização"><i class="fas fa-undo"></i></button></div></div><div class="micro-bar-bg"><div class="micro-bar-fill" style="width:${(jaAmortizado/mesesFatura[mes].total)*100}%"></div></div></div>` : ''}
            </div>
            <div id="edit-lanc-det-fat-${fatID}" style="display:none; padding:15px; border-top:1px dashed var(--linha); background:var(--input-bg);" onclick="event.stopPropagation()">
                ${mesesFatura[mes].lancamentos.map(l => `<div class="flex-between mb-10" style="font-size:12px; border-bottom:1px solid var(--linha); padding-bottom:5px;"><span>${(l.data || '').split('-').reverse().join('/')} - ${l.desc}</span><strong class="${T_RECEITAS.includes(l.tipo)?'txt-sucesso':'txt-perigo'}">R$ ${fmtBR(l.valor || 0)}</strong></div>`).join('')}
            </div>
        </div>`;
    }).join('');
}

window.renderRadarVencimentos = function() {
    const lista = document.getElementById('lista-radar-vencimentos'); if(!lista) return;
    const tituloRadar = document.querySelector('#carrossel-radar-container').previousElementSibling;
    if (tituloRadar) tituloRadar.innerHTML = '<i class="fas fa-bell"></i> Radar de Vencimentos (7 dias)';

    const hoje = new Date(); hoje.setHours(0,0,0,0); 
    const limite7 = new Date(hoje); limite7.setDate(hoje.getDate() + 7);
    let alertas = [];

    (db.lancamentos || []).forEach(l => {
        const conta = (db.contas || []).find(c => String(c.id) === String(l.contaId)); if (conta && conta.tipo === 'cartao') return; 
        const d = new Date(l.data + 'T00:00:00'); d.setHours(0,0,0,0);
        if (!l.efetivado && T_DESPESAS.includes(l.tipo) && d <= limite7) {
            const dias = Math.round((d - hoje) / 86400000);
            alertas.push({ dataOrd: d, html: `<div class="carrossel-slide radar-slide ${alertas.length===0?'active':''}"><div class="flex-between" style="padding-bottom:5px;"><div><strong style="font-size:14px;">${l.desc}</strong><small style="display:block; color: ${dias < 0 ? 'var(--perigo)' : 'var(--alerta)'}; font-weight:600;">${dias < 0 ? 'Atrasado' : (dias===0?'Vence HOJE':`Vence em ${dias} dia(s)`)}</small></div><b class="txt-perigo val-nowrap-mobile">R$ ${fmtBR(l.valor)}</b></div></div>` });
        }
    });

    (db.contas || []).filter(c => c.tipo === 'cartao').forEach(c => {
        let meses = {};
        (db.lancamentos || []).forEach(l => { if(String(l.contaId) === String(c.id)) { const m = window.getMesFaturaLogico(l.data, c.fechamento || 1); meses[m] = (meses[m]||0) + (T_RECEITAS.includes(l.tipo) ? -l.valor : l.valor); } });
        Object.keys(meses).forEach(m => {
            const fatID = `${c.id}-${m}`; if ((db.faturasPagas || []).includes(fatID)) return;
            const t = meses[m] - ((db.amortizacoesFaturas && db.amortizacoesFaturas[fatID]) || 0); if (t <= 0) return;
            let [a, ms] = m.split('-'); if ((c.vencimento||1) < (c.fechamento||1)) { ms = parseInt(ms)+1; if(ms>12){ms=1;a=parseInt(a)+1;} }
            const dv = new Date(a, ms-1, c.vencimento||1); dv.setHours(0,0,0,0);
            if (dv <= limite7) { const dias = Math.round((dv - hoje) / 86400000); alertas.push({ dataOrd: dv, html: `<div class="carrossel-slide radar-slide ${alertas.length===0?'active':''}"><div class="flex-between" style="padding-bottom:5px;"><div><strong style="font-size:14px;"><i class="fas fa-credit-card"></i> ${c.nome}</strong><small style="display:block; color: ${dias < 0 ? 'var(--perigo)' : 'var(--alerta)'}; font-weight:600;">${dias < 0 ? 'Fatura Atrasada' : (dias===0?'Vence HOJE':`Fatura em ${dias} dia(s)`)}</small></div><b class="txt-perigo val-nowrap-mobile">R$ ${fmtBR(t)}</b></div></div>` }); }
        });
    });

    alertas.sort((a, b) => a.dataOrd - b.dataOrd); 
    lista.innerHTML = alertas.length ? alertas.map(a => a.html).join('') : '<p class="texto-vazio" style="padding: 10px;">Tudo tranquilo por aqui.</p>';
    window.iniciarCarrosselRadar();
}

window.atualizarDiasSalario = function() {
    const freqEl = document.getElementById('sal-freq');
    const container = document.getElementById('sal-dias-container');
    if (!freqEl || !container) return;
    
    const freq = freqEl.value;
    container.innerHTML = '';
    
    if (freq === 'semanal') {
        const diasSemana = [{v:1, l:'Seg'}, {v:2, l:'Ter'}, {v:3, l:'Qua'}, {v:4, l:'Qui'}, {v:5, l:'Sex'}, {v:6, l:'Sáb'}, {v:0, l:'Dom'}];
        let html = '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top: 5px;">';
        diasSemana.forEach(d => { html += `<label style="display:flex; align-items:center; gap:4px; font-size:12px; cursor:pointer;"><input type="checkbox" id="sal-dia-${d.v}" value="${d.v}"> ${d.l}</label>`; });
        html += '</div>';
        container.innerHTML = html;
    } else if (freq === 'quinzenal') {
        container.innerHTML = '<div style="display:flex; gap:10px;"><input type="number" class="input-moderno" placeholder="Dia Ex: 5" min="1" max="31" style="flex:1;"><input type="number" class="input-moderno" placeholder="Dia Ex: 20" min="1" max="31" style="flex:1;"></div>';
    } else {
        container.innerHTML = '<input type="number" class="input-moderno" placeholder="Ex: 5" min="1" max="31">';
    }
};

document.addEventListener('change', function(e) { if (e.target && e.target.id === 'sal-freq') { if (typeof atualizarDiasSalario === 'function') atualizarDiasSalario(); } });

window.salvarNovoSalarioAbsoluto = function() {
    const nomeEl = document.getElementById('sal-nome'); const valorEl = document.getElementById('sal-valor'); const freqEl = document.getElementById('sal-freq'); const contaEl = document.getElementById('sal-conta');
    const nome = nomeEl ? nomeEl.value.trim() : ''; const valStr = valorEl ? valorEl.value : '0'; const frequencia = freqEl ? freqEl.value : 'mensal'; const contaId = contaEl ? contaEl.value : '';
    let valorTotal = 0; const limpo = valStr.replace(/[^\d.,]/g, '');
    if (limpo.includes(',') && limpo.indexOf(',') > limpo.lastIndexOf('.')) valorTotal = parseFloat(limpo.replace(/\./g, '').replace(',', '.')); 
    else if (limpo.includes(',')) valorTotal = parseFloat(limpo.replace(',', '.')); else valorTotal = parseFloat(limpo || 0); 
    const diasSelecionados = []; const containerDias = document.getElementById('sal-dias-container');
    if (containerDias) { containerDias.querySelectorAll('input').forEach(el => { if (el.type === 'checkbox') { if (el.checked) diasSelecionados.push(parseInt(el.value)); } else if (el.value && el.value.trim() !== '') { diasSelecionados.push(parseInt(el.value)); } }); }
    if (!nome || valorTotal <= 0 || diasSelecionados.length === 0) { alert("Preencha o nome, valor e informe pelo menos um dia de recebimento."); return; }
    if (!db.salarios) db.salarios = [];
    db.salarios.push({ id: Date.now() + Math.floor(Math.random() * 1000), nome: nome, valorTotal: valorTotal, frequencia: frequencia, dias: diasSelecionados, contaId: contaId });
    if (typeof save === 'function') save(); if (typeof showToast === 'function') showToast("Novo rendimento criado!", "sucesso");
    toggleFormNovoSalario(); renderListaSalarios();
};

window.toggleFormNovoSalario = function() {
    const f = document.getElementById('form-novo-salario'); if(f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
    const btnSalvar = document.querySelector('#form-novo-salario .btn-primary, #form-novo-salario button.btn-salvar');
    if (btnSalvar) { btnSalvar.innerText = "Salvar Rendimento"; btnSalvar.onclick = function(e) { e.preventDefault(); salvarNovoSalarioAbsoluto(); }; }
    if (document.getElementById('sal-nome')) document.getElementById('sal-nome').value = '';
    if (document.getElementById('sal-valor')) document.getElementById('sal-valor').value = '';
    if (typeof atualizarDiasSalario === 'function') atualizarDiasSalario();
};

window.abrirEdicaoSalario = function(id) {
    if (!db || !db.salarios) return; const sal = db.salarios.find(s => s.id == id); if (!sal) return;
    if (document.getElementById('sal-nome')) document.getElementById('sal-nome').value = sal.nome;
    if (document.getElementById('sal-valor')) document.getElementById('sal-valor').value = parseFloat(sal.valorTotal || 0).toFixed(2).replace('.', ',');
    if (document.getElementById('sal-freq')) document.getElementById('sal-freq').value = sal.frequencia;
    if (document.getElementById('sal-conta')) document.getElementById('sal-conta').value = sal.contaId;
    
    if (typeof atualizarDiasSalario === 'function') {
        atualizarDiasSalario(); 
        setTimeout(() => {
            const inputs = document.querySelectorAll('#sal-dias-container input');
            inputs.forEach(input => { if(input.type === 'checkbox') input.checked = false; else input.value = ''; });
            sal.dias.forEach((d, index) => { let cb = document.getElementById(`sal-dia-${d}`); if (cb && cb.type === 'checkbox') cb.checked = true; else if (inputs[index] && (inputs[index].type === 'number' || inputs[index].type === 'text')) { inputs[index].value = d; } });
        }, 100);
    }
    const form = document.getElementById('form-novo-salario'); if (form) form.style.display = 'block';
    const btnSalvar = document.querySelector('#form-novo-salario .btn-primary, #form-novo-salario button.btn-salvar');
    if (btnSalvar) { btnSalvar.innerText = "Salvar Alterações"; btnSalvar.onclick = function(e) { e.preventDefault(); salvarEdicaoSalarioAcao(id); }; }
};

window.salvarEdicaoSalarioAcao = function(id) {
    const nomeEl = document.getElementById('sal-nome'); const valorEl = document.getElementById('sal-valor'); const freqEl = document.getElementById('sal-freq'); const contaEl = document.getElementById('sal-conta');
    const nome = nomeEl ? nomeEl.value.trim() : ''; const valStr = valorEl ? valorEl.value : '0'; const frequencia = freqEl ? freqEl.value : 'mensal'; const contaId = contaEl ? contaEl.value : '';
    let valorTotal = 0; const limpo = valStr.replace(/[^\d.,]/g, '');
    if (limpo.includes(',') && limpo.indexOf(',') > limpo.lastIndexOf('.')) valorTotal = parseFloat(limpo.replace(/\./g, '').replace(',', '.')); 
    else if (limpo.includes(',')) valorTotal = parseFloat(limpo.replace(',', '.')); else valorTotal = parseFloat(limpo || 0); 
    const diasSelecionados = []; const containerDias = document.getElementById('sal-dias-container');
    if (containerDias) { containerDias.querySelectorAll('input').forEach(el => { if (el.type === 'checkbox') { if (el.checked) diasSelecionados.push(parseInt(el.value)); } else if (el.value && el.value.trim() !== '') { diasSelecionados.push(parseInt(el.value)); } }); }
    if (!nome || valorTotal <= 0 || diasSelecionados.length === 0) { alert("Preencha o nome, valor e informe pelo menos um dia de recebimento."); return; }
    
    let sal = db.salarios.find(s => s.id == id);
    if (sal) {
        sal.nome = nome; sal.valorTotal = valorTotal; sal.frequencia = frequencia; sal.dias = diasSelecionados; sal.contaId = contaId;
        if (typeof save === 'function') save(); if (typeof showToast === 'function') showToast("Rendimento atualizado!", "sucesso");
        toggleFormNovoSalario(); renderListaSalarios();
    }
};

window.renderListaSalarios = function() {
    const lista = document.getElementById('lista-salarios-cadastrados'); if(!lista) return;
    if(!db.salarios || db.salarios.length === 0) { lista.innerHTML = '<p class="texto-vazio" style="font-size:12px; margin-top:10px;">Nenhuma renda automática cadastrada.</p>'; return; }
    lista.innerHTML = db.salarios.map(sal => `<div class="salario-card" style="background: var(--card-bg); border: 1px solid var(--linha); border-radius: 10px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;"><div><strong style="font-size: 14px; color: var(--texto-main); display:block; margin-bottom:4px;">${sal.nome}</strong><small style="color: var(--texto-sec); font-size: 11px; line-height:1.4; display:block;"><i class="fas fa-calendar-alt"></i> ${sal.frequencia.charAt(0).toUpperCase() + sal.frequencia.slice(1)} • Dias: ${sal.dias.join(', ')}<br><i class="fas fa-university"></i> Destino: ${((db.contas || []).find(c => c.id === sal.contaId)||{}).nome || 'Excluída'}</small></div><div style="text-align: right;"><strong class="txt-esmeralda" style="font-size: 16px; display:block; margin-bottom:8px;">R$ ${fmtBR(sal.valorTotal)}</strong><div style="display: flex; gap: 8px; justify-content: flex-end;"><button class="btn-icon" style="color: var(--azul); background: rgba(59,130,246,0.1); padding: 6px 10px; border-radius: 6px;" onclick="abrirEdicaoSalario(${sal.id})"><i class="fas fa-edit"></i></button><button class="btn-icon" style="color: var(--perigo); background: rgba(239,68,68,0.1); padding: 6px 10px; border-radius: 6px;" onclick="if(typeof excluirSalario === 'function') excluirSalario(${sal.id})"><i class="fas fa-trash"></i></button></div></div></div>`).join('');
};

window.excluirSalario = function(id) {
    if(confirm("Excluir este rendimento? Os lançamentos já recebidos não serão afetados.")) {
        db.salarios = db.salarios.filter(s => s.id != id);
        if(typeof save === 'function') save();
        if(typeof showToast === 'function') showToast("Rendimento excluído!", "exclusao");
        renderListaSalarios();
    }
};

window.renderListaContratos = function() {
    const containerFixa = document.getElementById('lista-contas-fixas-ativas');
    const containerParc = document.getElementById('lista-parcelamentos-ativos');
    if (!containerFixa || !containerParc || typeof db === 'undefined') return;

    let seenIds = new Set();
    let listaFixa = [];
    let listaParc = [];

    (db.contratos || []).forEach(c => {
        if(!c || typeof c !== 'object') return;
        const strId = String(c.id);
        seenIds.add(strId);
        if(c.tipo === 'fixa') listaFixa.push({...c, badge: ''});
        else listaParc.push({...c, badge: `(${c.atual||1}/${c.total||1})`});
    });

    (db.recorrencias || []).forEach(r => {
        const strId = String(r.id);
        if (!seenIds.has(strId)) {
            seenIds.add(strId);
            listaFixa.push({ id: r.id, desc: r.desc, valor: r.valor, dia: r.diaVencimento, categoria: r.cat, contaId: r.contaId, badge: '' });
        }
    });

    let gruposParc = {};
    (db.lancamentos || []).forEach(l => {
        if (l.idGrupo && !l.efetivado) {
            if (!gruposParc[l.idGrupo]) {
                gruposParc[l.idGrupo] = { 
                    id: l.idGrupo, desc: l.desc.split(' (')[0], valor: l.valor, 
                    dia: l.data ? l.data.split('-')[2] : '--', categoria: l.cat, 
                    contaId: l.contaId, parcelas: [] 
                };
            }
            gruposParc[l.idGrupo].parcelas.push(l);
        }
    });

    Object.values(gruposParc).forEach(g => {
        const strId = String(g.id);
        if (!seenIds.has(strId)) {
            seenIds.add(strId);
            let match = null;
            if(g.parcelas.length > 0) {
                g.parcelas.sort((a,b) => new Date(a.data) - new Date(b.data));
                match = g.parcelas[0].desc.match(/\(\d+\/\d+\)/);
            }
            listaParc.push({ ...g, badge: match ? match[0] : `(${g.parcelas.length} rest)` });
        }
    });

    const catSafe = db.categorias || [];
    const conSafe = db.contas || [];

    const gerarCard = (item, isParc) => {
        const catObj = catSafe.find(c => c.nome === (item.categoria||item.cat) || String(c.id) === String(item.categoria||item.cat)) || { icone: isParc?'📦':'📌', nome: item.categoria||'Outros' };
        const contaObj = conSafe.find(c => String(c.id) === String(item.contaId || item.conta)) || { nome: 'Conta Excluída', cor: '#ccc' };
        const colorVal = isParc ? 'var(--alerta)' : 'var(--perigo)';
        const badgeHtml = isParc && item.badge ? `<span style="display: inline-block; background: rgba(245, 158, 11, 0.1); color: var(--alerta); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-top: 4px; width: max-content;">Parcela ${item.badge}</span>` : '';

        return `
        <div style="background: var(--input-bg); border: 1px solid var(--linha); border-radius: 12px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; gap: 12px; align-items: center;">
            <div style="display:flex; align-items:flex-start; gap: 12px; flex: 1; min-width: 0;">
                <div style="flex-shrink: 0; width: 42px; height: 42px; border-radius: 10px; background: var(--card-bg); border: 1px solid var(--linha); display: flex; align-items: center; justify-content: center; font-size: 18px;">
                    ${catObj.icone}
                </div>
                <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; min-height: 42px;">
                    <strong style="font-size: 14px; color: var(--texto-main); display: block; margin-bottom: 4px; word-wrap: break-word; white-space: normal; line-height: 1.3;">${item.desc || 'Sem Nome'}</strong>
                    <small style="color: var(--texto-sec); font-size: 11px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${contaObj.cor}; flex-shrink: 0;"></span>
                        <span style="white-space: nowrap;">${contaObj.nome}</span>
                        <span style="white-space: nowrap;">• Dia ${item.dia || '--'}</span>
                    </small>
                    ${badgeHtml}
                </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: center; flex-shrink: 0; gap: 8px;">
                <strong style="color: ${colorVal}; font-size: 15px; white-space: nowrap;">- R$ ${window.fmtBR ? window.fmtBR(item.valor) : parseFloat(item.valor||0).toFixed(2)}</strong>
                <div style="display:flex; gap: 8px;">
                    <button onclick="${isParc ? `abrirEdicaoParcelamento('${item.id}')` : `abrirModalEdicaoContrato('${item.id}')`}" style="background:rgba(59, 130, 246, 0.1); color:var(--azul); border:none; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size:14px; cursor:pointer;" title="Editar"><i class="fas fa-edit"></i></button>
                    <button onclick="if(typeof excluirContrato === 'function') { excluirContrato('${item.id}'); } else if(typeof excluirLancamento === 'function') { excluirLancamento('${item.id}'); }" style="background:rgba(239, 68, 68, 0.1); color:var(--perigo); border:none; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size:14px; cursor:pointer;" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    };

    containerFixa.innerHTML = listaFixa.length > 0 ? listaFixa.map(i => gerarCard(i, false)).join('') : '<p style="text-align:center; padding: 20px; color: var(--texto-sec); font-size: 13px;">Nenhuma conta fixa ativa.</p>';
    containerParc.innerHTML = listaParc.length > 0 ? listaParc.map(i => gerarCard(i, true)).join('') : '<p style="text-align:center; padding: 20px; color: var(--texto-sec); font-size: 13px;">Nenhum parcelamento em andamento.</p>';
};

window.abrirModalEdicaoContrato = function(id) {
    let item = null; let tipoItem = '';

    item = (db.contratos || []).find(c => String(c.id) === String(id));
    if (item) { tipoItem = 'contrato'; item.cat = item.categoria; } 
    else {
        item = (db.recorrencias || []).find(r => String(r.id) === String(id));
        if (item) { tipoItem = 'recorrencia'; item.dia = item.diaVencimento; } 
        else {
            let pendentes = (db.lancamentos || []).filter(l => String(l.idGrupo) === String(id) && !l.efetivado);
            if (pendentes.length > 0) {
                item = { id: id, desc: pendentes[0].desc.split(' (')[0], valor: pendentes[0].valor, dia: parseInt(pendentes[0].data.split('-')[2], 10), cat: pendentes[0].cat || pendentes[0].categoria, contaId: pendentes[0].contaId };
                tipoItem = 'parcelamento';
            }
        }
    }

    if (!item) { alert("Registro não encontrado!"); return; }

    const catOpts = (db.categorias || []).filter(c => c.tipo === 'despesa').map(c => `<option value="${c.nome}" ${item.cat === c.nome || item.categoria === c.nome ? 'selected' : ''}>${c.icone || ''} ${c.nome}</option>`).join('');
    const contaOpts = (db.contas || []).map(c => `<option value="${c.id}" ${item.contaId == c.id || item.conta == c.id ? 'selected' : ''}>${c.nome}</option>`).join('');

    const html = `
        <div style="background: rgba(59, 130, 246, 0.1); padding: 10px; border-radius: 8px; border-left: 3px solid var(--azul); font-size: 11px; color: var(--texto-sec); margin-bottom: 15px;">
            <strong>Aviso:</strong> A alteração será aplicada em todos os lançamentos futuros pendentes na tela inicial (Extrato).
        </div>
        <div class="mb-10"><label class="label-moderno">Descrição</label><input type="text" id="edit-contrato-desc" class="input-moderno" value="${item.desc || ''}"></div>
        <div class="grid-inputs mb-10"><div><label class="label-moderno">Valor (R$)</label><input type="text" inputmode="numeric" id="edit-contrato-valor" class="input-moderno" value="${parseFloat(item.valor || 0).toFixed(2).replace('.', ',')}" oninput="if(typeof mascaraMoeda === 'function') mascaraMoeda(event)"></div><div><label class="label-moderno">Dia Vencimento</label><input type="number" id="edit-contrato-dia" class="input-moderno" min="1" max="31" value="${item.dia || ''}"></div></div>
        <div class="grid-inputs mb-15"><div><label class="label-moderno">Categoria</label><select id="edit-contrato-cat" class="input-moderno">${catOpts}</select></div><div><label class="label-moderno">Conta Base</label><select id="edit-contrato-conta" class="input-moderno">${contaOpts}</select></div></div>
        <div class="flex-between"><button class="btn-outline" onclick="if(typeof fecharModalEdicaoContrato === 'function') fecharModalEdicaoContrato()">Cancelar</button><button class="btn-primary" onclick="salvarEdicaoContrato('${id}', '${tipoItem}')">Salvar Alterações</button></div>
    `;
    const formContainer = document.getElementById('form-edicao-contrato'); if(formContainer) formContainer.innerHTML = html;
    
    const m = document.getElementById('modal-edicao-contrato');
    if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); }
};

window.salvarEdicaoContrato = function(id, tipoItem) {
    const desc = document.getElementById('edit-contrato-desc').value.trim();
    const valStr = document.getElementById('edit-contrato-valor').value;
    const valor = parseFloat(valStr.replace(/\./g, '').replace(',', '.')) || 0;
    const dia = parseInt(document.getElementById('edit-contrato-dia').value) || 1;
    const cat = document.getElementById('edit-contrato-cat').value;
    const contaId = document.getElementById('edit-contrato-conta').value;

    if (!desc || valor <= 0) { alert("Preencha descrição e valor corretamente."); return; }

    let alterou = false;
    const atualizarPendentes = (filtroCondicao) => {
        let pendentes = (db.lancamentos || []).filter(l => filtroCondicao(l) && !l.efetivado);
        pendentes.forEach(p => {
            let match = (p.desc||'').match(/\(\d+\/\d+\)/); 
            p.desc = desc + (match ? ` ${match[0]}` : '');
            p.valor = valor; p.cat = cat; p.categoria = cat; p.contaId = contaId;
            let partes = (p.data||'').split('-');
            if(partes.length === 3) {
                let d = new Date(partes[0], partes[1] - 1, dia);
                if (d.getMonth() + 1 !== parseInt(partes[1])) d = new Date(partes[0], partes[1], 0);
                p.data = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            }
        });
    };

    if (tipoItem === 'recorrencia') {
        let rec = db.recorrencias.find(r => String(r.id) === String(id));
        if (rec) { rec.desc = desc; rec.valor = valor; rec.diaVencimento = dia; rec.cat = cat; rec.contaId = contaId; atualizarPendentes((l) => String(l.idRecorrencia) === String(id)); alterou = true; }
    } else if (tipoItem === 'contrato') {
        let ctr = db.contratos.find(c => String(c.id) === String(id));
        if (ctr) { ctr.desc = desc; ctr.valor = valor; ctr.dia = dia; ctr.categoria = cat; ctr.contaId = contaId; ctr.conta = contaId; atualizarPendentes((l) => String(l.idGrupo) === String(id) || String(l.idRecorrencia) === String(id)); alterou = true; }
    } else if (tipoItem === 'parcelamento') {
        atualizarPendentes((l) => String(l.idGrupo) === String(id)); alterou = true;
    }

    if (alterou) {
        if (typeof save === 'function') save(); 
        const m = document.getElementById('modal-edicao-contrato');
        if(m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); }
        if (typeof renderListaContratos === 'function') renderListaContratos(); 
        if (typeof render === 'function') render();
        if (typeof showToast === 'function') showToast("Registro atualizado!", "sucesso");
    } else alert("Erro ao salvar: Registro não localizado no banco de dados.");
};

window.abrirEdicaoParcelamento = function(idGrupo) {
    if (!idGrupo) return alert("Erro: ID do parcelamento não encontrado.");
    
    const parcelas = (db.lancamentos || []).filter(l => String(l.idGrupo) === String(idGrupo) && !l.efetivado).sort((a,b) => new Date(a.data) - new Date(b.data));
    
    if(parcelas.length === 0) return alert("Não há parcelas pendentes neste grupo para editar (ou elas já foram pagas).");
    
    const lancBase = parcelas[0];
    const nomeBase = (lancBase.desc || '').split(' (')[0].trim();
    const diaBase = lancBase.data && lancBase.data.includes('-') ? lancBase.data.split('-')[2] : '01';

    let catOptions = '<option value="">Outros (Sem categoria)</option>';
    (db.categorias || []).forEach(c => { catOptions += `<option value="${c.nome}" ${lancBase.cat === c.nome ? 'selected' : ''}>${c.icone || ''} ${c.nome}</option>`; });

    let contaOptions = '';
    (db.contas || []).forEach(c => { contaOptions += `<option value="${c.id}" ${String(lancBase.contaId) === String(c.id) ? 'selected' : ''}>${c.tipo === 'cartao' ? '💳' : '🏦'} ${c.nome}</option>`; });

    let html = `
        <div style="background: rgba(59, 130, 246, 0.1); padding: 10px; border-radius: 8px; border-left: 3px solid var(--azul); font-size: 11px; color: var(--texto-sec); margin-bottom: 15px;">
            <strong>Atenção:</strong> Ao alterar as informações abaixo, todas as <strong>${parcelas.length} parcelas restantes</strong> serão atualizadas no extrato.
        </div>
        
        <div class="mb-10">
            <label class="label-moderno">Nome da Compra</label>
            <input type="text" id="edit-parc-desc" class="input-moderno" value="${nomeBase}">
        </div>
        <div class="grid-inputs mb-10">
            <div>
                <label class="label-moderno">Valor da Parcela (R$)</label>
                <input type="text" inputmode="numeric" id="edit-parc-valor" class="input-moderno" value="${parseFloat(lancBase.valor || 0).toFixed(2).replace('.',',')}" oninput="if(typeof mascaraMoeda === 'function') mascaraMoeda(event)">
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
    
    const formContainer = document.getElementById('form-edicao-contrato');
    if(formContainer) formContainer.innerHTML = html;
    
    const m = document.getElementById('modal-edicao-contrato');
    if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); } else alert("Ops! O pop-up de edição não foi encontrado na tela.");
};

window.salvarEdicaoParcelamento = function(idGrupo) {
    const novaDesc = document.getElementById('edit-parc-desc').value.trim();
    
    let elValor = document.getElementById('edit-parc-valor').value.replace(/[^\d.,]/g, '');
    if(elValor.includes('.') && elValor.includes(',')) elValor = elValor.replace(/\./g, '').replace(',', '.');
    else elValor = elValor.replace(',', '.');
    const novoValor = parseFloat(elValor) || 0;
    
    const novoDia = document.getElementById('edit-parc-dia').value.padStart(2, '0');
    const novaCat = document.getElementById('edit-parc-cat').value;
    const novaConta = document.getElementById('edit-parc-conta').value;

    let atualizados = 0;
    
    (db.lancamentos || []).forEach(l => {
        if(String(l.idGrupo) === String(idGrupo) && !l.efetivado) {
            const match = (l.desc || '').match(/\(\d+\/\d+\)/);
            l.desc = novaDesc + (match ? ` ${match[0]}` : ''); l.valor = novoValor; l.cat = novaCat; l.contaId = novaConta;
            if (l.data && l.data.includes('-')) {
                const partes = l.data.split('-'); let ano = parseInt(partes[0]); let mes = parseInt(partes[1]);
                let d = new Date(ano, mes - 1, parseInt(novoDia));
                if (d.getMonth() + 1 !== mes) d = new Date(ano, mes, 0); 
                l.data = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
            }
            atualizados++;
        }
    });

    if (atualizados === 0) return alert("Nenhuma parcela pendente encontrada para atualizar.");
    if(typeof save === 'function') save();
    
    const m = document.getElementById('modal-edicao-contrato');
    if(m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); }
    
    if(typeof renderListaContratos === 'function') renderListaContratos();
    if(typeof render === 'function') render();
    if(typeof showToast === 'function') showToast(`${atualizados} parcelas atualizadas!`, "sucesso");
};

window.abrirModalCategorias = function() { fecharModalListaCat(); fecharModalNovaCat(); const m = document.getElementById('modal-categorias'); if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); } };
window.fecharModalCategorias = function() { const m = document.getElementById('modal-categorias'); if(m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); } };
window.abrirModalNovaCat = function() { fecharModalCategorias(); fecharModalListaCat(); document.getElementById('nova-cat-id').value = ''; document.getElementById('nova-cat-icone').value = ''; document.getElementById('nova-cat-nome').value = ''; document.getElementById('nova-cat-fixa').checked = false; document.getElementById('label-form-cat').innerHTML = "<i class='fas fa-plus' style='color:var(--esmeralda);'></i> Nova Categoria"; document.getElementById('btn-salvar-cat').innerText = "Salvar"; const m = document.getElementById('modal-nova-cat'); if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); } };
window.fecharModalNovaCat = function() { const m = document.getElementById('modal-nova-cat'); if(m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); } };
window.abrirModalListaCat = function() { fecharModalCategorias(); renderModalCategorias(); const m = document.getElementById('modal-lista-cat'); if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); } };
window.fecharModalListaCat = function() { const m = document.getElementById('modal-lista-cat'); if(m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); } };
window.selecionarCorCat = function(cor, elemento) { document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('active')); if(elemento) elemento.classList.add('active'); document.getElementById('nova-cat-cor').value = cor; };
window.removerSelecaoPaleta = function() { document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('active')); };

window.renderModalCategorias = function() {
    const lDespesas = document.getElementById('lista-categorias-despesas'); const lReceitas = document.getElementById('lista-categorias-receitas'); 
    if(lDespesas && lReceitas) {
        const catDesp = (db.categorias || []).filter(c => c.tipo === 'despesa').sort((a,b) => a.nome.localeCompare(b.nome)); 
        const catRec = (db.categorias || []).filter(c => c.tipo === 'receita').sort((a,b) => a.nome.localeCompare(b.nome)); 
        if (document.getElementById('count-cat-desp')) document.getElementById('count-cat-desp').innerText = catDesp.length; 
        if (document.getElementById('count-cat-rec')) document.getElementById('count-cat-rec').innerText = catRec.length;
        
        const gerarCardHTML = (c) => `<div class="salario-card" style="border-left: 4px solid ${c.cor}; border-color: ${c.cor}; background: var(--input-bg); padding: 12px; margin:0; display: flex; flex-direction: column; align-items: flex-start; position: relative; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);"><div style="position: absolute; top: -15px; right: -15px; width: 50px; height: 50px; background: ${c.cor}; opacity: 0.08; border-radius: 50%;"></div><div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 10px; align-items: center;"><div style="width: 32px; height: 32px; border-radius: 8px; background: ${c.cor}20; color: ${c.cor}; display: flex; align-items: center; justify-content: center; font-size: 16px;">${c.icone || '📁'}</div><div style="display: flex; gap: 4px; z-index: 2;"><button class="btn-icon" style="color: var(--azul); background: rgba(59,130,246,0.1); padding: 5px; border-radius: 6px; font-size: 11px;" onclick="editarCategoria('${c.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon" style="color: var(--perigo); background: rgba(239,68,68,0.1); padding: 5px; border-radius: 6px; font-size: 11px;" onclick="excluirCategoria('${c.id}')"><i class="fas fa-trash"></i></button></div></div><strong style="font-size: 13px; color: var(--texto-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; z-index: 2;">${c.nome}</strong><small style="color: var(--texto-sec); font-size: 10px; margin-top: 4px; z-index: 2; display: flex; align-items: center; gap: 4px;">${c.fixa ? `<i class="fas fa-lock" style="color:${c.cor};"></i> Fixo` : `<i class="fas fa-random" style="color:var(--texto-sec);"></i> Variável`}</small></div>`;
        lDespesas.innerHTML = catDesp.length ? catDesp.map(gerarCardHTML).join('') : '<span style="font-size:11px; color:var(--texto-sec); grid-column: span 2;">Nenhuma despesa cadastrada.</span>';
        lReceitas.innerHTML = catRec.length ? catRec.map(gerarCardHTML).join('') : '<span style="font-size:11px; color:var(--texto-sec); grid-column: span 2;">Nenhuma receita cadastrada.</span>';
    }
};

window.editarCategoria = function(id) { 
    const cat = (db.categorias || []).find(c => String(c.id) === String(id)); if(!cat) return; 
    document.getElementById('nova-cat-id').value = cat.id; document.getElementById('nova-cat-icone').value = cat.icone || ''; document.getElementById('nova-cat-nome').value = cat.nome; document.getElementById('nova-cat-tipo').value = cat.tipo; document.getElementById('nova-cat-cor').value = cat.cor || '#94a3b8'; document.getElementById('nova-cat-fixa').checked = !!cat.fixa; 
    removerSelecaoPaleta(); document.getElementById('label-form-cat').innerHTML = "<i class='fas fa-edit' style='color:var(--azul);'></i> Editar Categoria"; document.getElementById('btn-salvar-cat').innerText = "Salvar Alterações"; 
    fecharModalListaCat(); setTimeout(() => { const m = document.getElementById('modal-nova-cat'); if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); } }, 300);
};

window.salvarConfigNovaCategoria = function() { 
    const id = document.getElementById('nova-cat-id').value; const icone = document.getElementById('nova-cat-icone').value.trim(); const nome = document.getElementById('nova-cat-nome').value.trim(); const tipo = document.getElementById('nova-cat-tipo').value; const cor = document.getElementById('nova-cat-cor').value; const fixa = document.getElementById('nova-cat-fixa').checked; 
    if(!nome) { alert("Dê um nome para a categoria."); return; } 
    db.categorias = db.categorias || []; 
    if (id) { 
        const cat = db.categorias.find(c => String(c.id) === String(id)); 
        if (cat) { 
            if (db.categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase() && String(c.id) !== String(id) && c.tipo === tipo)) { alert("Já existe outra categoria com este nome."); return; } 
            if (cat.nome !== nome) db.lancamentos.forEach(l => { if (l.cat === cat.nome) l.cat = nome; }); 
            cat.nome = nome; cat.icone = icone; cat.tipo = tipo; cat.cor = cor; cat.fixa = fixa; 
            save(); if(typeof showToast === 'function') showToast("Categoria atualizada!", "ajuste"); 
        } 
    } else { 
        if (db.categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase() && c.tipo === tipo)) { alert("Já existe uma categoria com este nome."); return; } 
        db.categorias.push({ id: 'cat_' + Date.now(), nome, icone, cor, fixa, tipo }); 
        save(); if(typeof showToast === 'function') showToast("Nova categoria criada!", "sucesso"); 
    } 
    fecharModalNovaCat(); if(typeof render === 'function') render(); 
    if (id) setTimeout(() => { abrirModalListaCat(); }, 300);
};

window.excluirCategoria = function(id) { 
    if(typeof abrirConfirmacao === 'function') {
        abrirConfirmacao("Excluir categoria? Lançamentos antigos perdem a cor, mas o nome fica.", () => {
            db.categorias = db.categorias.filter(c => String(c.id) !== String(id)); 
            save(); renderModalCategorias(); if(typeof render === 'function') render(); if(typeof showToast === 'function') showToast("Categoria excluída!", "exclusao");
        });
    }
};

window.abrirModalExtratoConta = function(id) {
    const c = (db.contas || []).find(x => String(x.id) === String(id)); if (!c) return;
    const isCartao = c.tipo === 'cartao'; let saldoCalc = 0; 
    let lancsAsc = (db.lancamentos || []).filter(l => String(l.contaId) === String(c.id)).sort((a,b) => new Date(a.data) - new Date(b.data) || a.id - b.id); 
    let ledgerItems = [];
    lancsAsc.forEach(l => { 
        if (l.efetivado) { 
            if (isCartao) { if (T_DESPESAS_CARTAO.includes(l.tipo)) saldoCalc += l.valor; else if (T_RECEITAS.includes(l.tipo)) saldoCalc -= l.valor; } 
            else { if (T_RECEITAS.includes(l.tipo)) saldoCalc += l.valor; if (T_DESPESAS.includes(l.tipo)) saldoCalc -= l.valor; } 
        } 
        ledgerItems.push({...l, saldoApos: saldoCalc}); 
    });
    ledgerItems.reverse(); 

    const divAviso = document.getElementById('aviso-saldo-divergente');
    if (!isCartao && ledgerItems.length > 0 && Math.abs(ledgerItems[0].saldoApos - (c.saldo || 0)) > 0.01) { 
        divAviso.innerHTML = `<div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid var(--alerta); padding: 10px; font-size: 11px; color: var(--texto-sec); margin-bottom: 15px; border-radius: 4px;"><strong>Nota de Ajuste:</strong> O saldo editado (R$ ${fmtBR(c.saldo||0)}) diverge do histórico (R$ ${fmtBR(ledgerItems[0].saldoApos)}).</div>`; 
    } else divAviso.innerHTML = '';
    
    document.getElementById('conteudo-extrato-conta').innerHTML = ledgerItems.length ? ledgerItems.map(l => {
        const isDesp = isCartao ? T_DESPESAS_CARTAO.includes(l.tipo) : T_DESPESAS.includes(l.tipo); 
        return `<div class="flex-between mb-10" style="font-size:12px; border-bottom:1px solid var(--linha); padding-bottom:8px;"><div style="flex:1; padding-right:10px;"><strong style="display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${l.desc}</strong><small style="color:var(--texto-sec);">${l.data.split('-').reverse().join('/')}</small></div><div style="text-align:right;"><strong class="${isDesp?'txt-perigo':'txt-sucesso'}">${isDesp?(isCartao?'+':'-'):(isCartao?'-':'+')} R$ ${fmtBR(l.valor)}</strong><small style="display:block; color:var(--texto-sec); font-size:10px;">${isCartao?'Fatura':'Saldo'}: R$ ${fmtBR(l.saldoApos)}</small></div></div>`;
    }).join('') : '<p class="texto-vazio" style="font-size:12px; margin: 10px 0;">Nenhuma movimentação registrada.</p>';
    
    const m = document.getElementById('modal-extrato-conta'); m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10);
}

window.abrirModalAjusteConta = function(id) {
    const c = (db.contas || []).find(x => String(x.id) === String(id)); if (!c) return;
    const isCartao = c.tipo === 'cartao';
    document.getElementById('conteudo-ajuste-conta').innerHTML = `
        <div class="grid-inputs mb-10"><div><label class="label-moderno">Nome da Conta</label><input type="text" id="edit-nome-${c.id}" class="input-moderno" value="${c.nome}"></div><div><label class="label-moderno">Cor Principal</label><input type="color" id="edit-cor-${c.id}" value="${c.cor}" style="width:100%; height:45px; border:none; border-radius:8px;"></div></div>
        ${isCartao ? `<div class="grid-inputs mb-10"><div><label class="label-moderno">Limite Total</label><input type="text" inputmode="numeric" id="edit-limite-${c.id}" class="input-moderno" value="${(c.limite||0).toFixed(2).replace('.',',')}" oninput="if(typeof mascaraMoeda === 'function') mascaraMoeda(event)"></div><div><label class="label-moderno">Meta de Gasto (Mensal)</label><input type="text" inputmode="numeric" id="edit-meta-${c.id}" class="input-moderno" value="${(c.meta||0).toFixed(2).replace('.',',')}" oninput="if(typeof mascaraMoeda === 'function') mascaraMoeda(event)"></div></div><div class="grid-inputs"><div><label class="label-moderno">Dia Fechamento</label><input type="number" id="edit-fecha-${c.id}" class="input-moderno" value="${c.fechamento||1}"></div><div><label class="label-moderno">Dia Vencimento</label><input type="number" id="edit-venc-${c.id}" class="input-moderno" value="${c.vencimento||1}"></div></div>` : `<div class="mb-10"><label class="label-moderno">Ajustar Saldo Atual (R$)</label><input type="text" inputmode="numeric" id="edit-saldo-${c.id}" class="input-moderno" value="${(c.saldo||0).toFixed(2).replace('.',',')}" oninput="if(typeof mascaraMoeda === 'function') mascaraMoeda(event)"></div>`}
        <div class="flex-between mt-20 pt-15" style="border-top: 1px dashed var(--linha);"><button class="btn-outline txt-perigo" style="border-color: var(--perigo);" onclick="fecharModalAjusteConta(); excluirConta('${c.id}')"><i class="fas fa-trash"></i> Excluir</button><button class="btn-primary" onclick="salvarEdicaoConta('${c.id}'); fecharModalAjusteConta();">Salvar Alterações</button></div>`;
    const m = document.getElementById('modal-ajuste-conta'); m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10);
}

window.preencherSelectsContratos = function(tipo) {
    if (typeof db !== 'undefined' && db.categorias) {
        const categoriasValidas = db.categorias.filter(c => c.tipo === 'despesa').sort((a, b) => a.nome.localeCompare(b.nome));
        const catHtml = categoriasValidas.map(c => `<option value="${c.nome}">${c.icone || '🏷️'} ${c.nome}</option>`).join('');
        const selectCat = document.getElementById(`${tipo}-cat`);
        if (selectCat) selectCat.innerHTML = catHtml;
    }
    
    if (typeof db !== 'undefined' && db.contas) {
        const contaHtml = db.contas.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        const selectConta = document.getElementById(`${tipo}-conta`);
        if (selectConta) selectConta.innerHTML = contaHtml;
    }
};

window.abrirModalFixa = function() { 
    const m = document.getElementById('modal-conta-fixa'); 
    if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); } 
    window.preencherSelectsContratos('fixa');
};

window.abrirModalParc = function() { 
    const m = document.getElementById('modal-parcelamento'); 
    if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); } 
    window.preencherSelectsContratos('parc');
};