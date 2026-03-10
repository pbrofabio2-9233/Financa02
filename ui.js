// ==========================================
// UI.JS - Renderização, Interface e Formatação BR (v27.4.0)
// ==========================================

// ----------------------------------------------------
// 1. CONFIGURAÇÕES GERAIS E INICIAIS
// ----------------------------------------------------
const T_RECEITAS = ['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas', 'estorno', 'saque_poupanca', 'receita', 'emp_pessoal', 'compensacao'];
const T_DESPESAS = ['despesas_gerais', 'emprestei_dinheiro', 'pag_emprestimo', 'dep_poupanca', 'emprestei_cartao', 'despesa', 'emp_concedido', 'emp_cartao'];
const T_DESPESAS_CARTAO = ['despesas_gerais', 'emprestei_cartao', 'despesa', 'emp_cartao'];

window.fmtBR = function(valor) {
    return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);

// Injeção de CSS para Mobile via JS
if (!document.getElementById('css-extrato-mobile')) {
    const style = document.createElement('style'); 
    style.id = 'css-extrato-mobile';
    style.innerHTML = `
        @media (max-width: 768px) { 
            .cat-break-mobile { display: block !important; margin-top: 4px; color: var(--texto-sec); } 
            .val-nowrap-mobile { white-space: nowrap !important; } 
        }
    `;
    document.head.appendChild(style);
}

// ----------------------------------------------------
// 2. ESCUDO GLOBAL E PREVENÇÃO DE CLIQUES FANTASMAS
// ----------------------------------------------------
const aplicarTravaModais = () => {
    document.querySelectorAll('.modal-content').forEach(box => {
        box.addEventListener('click', e => e.stopPropagation());
        box.addEventListener('mousedown', e => e.stopPropagation());
        box.addEventListener('touchstart', e => e.stopPropagation(), {passive: false});
        box.addEventListener('touchend', e => e.stopPropagation(), {passive: false});
    });
};

// Aplica a trava agora e garante que aplica depois do DOM carregar
aplicarTravaModais();
document.addEventListener('DOMContentLoaded', aplicarTravaModais);

document.addEventListener('touchend', function(e) {
    const tocouNoBotao = e.target.closest('button, .cat-chip, .color-swatch');
    const tocouNoModal = e.target.closest('.modal-content');

    if (tocouNoModal && tocouNoBotao) {
        let shield = document.getElementById('ghost-click-shield');
        if (!shield) {
            shield = document.createElement('div');
            shield.id = 'ghost-click-shield';
            shield.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999999; background:transparent; touch-action:none;';
            document.body.appendChild(shield);
        }
        shield.style.display = 'block';
        setTimeout(() => shield.style.display = 'none', 450); 
    }
}, { passive: true });

// ----------------------------------------------------
// 3. MENU SUSPENSO (CONTEXT MENU / LONG PRESS)
// ----------------------------------------------------
let longPressTimer;
let isLongPress = false;
let currentLancIdCtx = null;

if (!document.getElementById('context-menu-lancamento')) {
    const menu = document.createElement('div');
    menu.id = 'context-menu-lancamento';
    menu.style.cssText = 'display:none; position:fixed; z-index:99999; background:var(--card-bg); border:1px solid var(--linha); border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.5); flex-direction:column; padding:5px; min-width:160px; overflow:hidden;';
    menu.innerHTML = `
        <button onclick="acionarAjusteCtx()" style="padding:12px 15px; text-align:left; background:transparent; border:none; color:var(--texto-main); width:100%; font-size:14px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:10px;"><i class="fas fa-edit" style="color:var(--azul);"></i> Ajustar Lançamento</button>
        <div style="height:1px; background:var(--linha); margin:0 5px;"></div>
        <button onclick="acionarExcluirCtx()" style="padding:12px 15px; text-align:left; background:transparent; border:none; color:var(--texto-main); width:100%; font-size:14px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:10px;"><i class="fas fa-trash" style="color:var(--perigo);"></i> Excluir</button>
    `;
    document.body.appendChild(menu);
    document.addEventListener('click', () => { if (menu.style.display !== 'none') menu.style.display = 'none'; });
}

window.iniciarLongPress = function(e, id) {
    isLongPress = false;
    longPressTimer = setTimeout(() => { isLongPress = true; currentLancIdCtx = id; mostrarContextMenu(e, id); }, 500); 
};
window.cancelarLongPress = function() { clearTimeout(longPressTimer); };
window.mostrarContextMenuRightClick = function(e, id) { e.preventDefault(); isLongPress = true; currentLancIdCtx = id; mostrarContextMenu(e, id); };

window.mostrarContextMenu = function(e, id) {
    if ("vibrate" in navigator) navigator.vibrate(50);
    const menu = document.getElementById('context-menu-lancamento');
    if(!menu) return;
    menu.style.display = 'flex';
    
    let x = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    let y = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    
    const rect = menu.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 10;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 10;
    
    menu.style.left = `${x}px`; menu.style.top = `${y}px`;
};

window.handleLancamentoClick = function(e, id) {
    if (isLongPress) { isLongPress = false; e.preventDefault(); return; }
    toggleEditLancamento(id);
};

window.acionarAjusteCtx = function() {
    if(currentLancIdCtx) {
        const el = document.getElementById(`edit-lanc-${currentLancIdCtx}`);
        if(el && el.style.display === 'none') toggleEditLancamento(currentLancIdCtx);
        setTimeout(() => { const card = el.closest('.fatura-card'); if(card) card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    }
};

window.acionarExcluirCtx = function() {
    if(currentLancIdCtx && typeof excluirLancamento === 'function') excluirLancamento(currentLancIdCtx);
};

// ----------------------------------------------------
// 4. MOTOR PRINCIPAL DE RENDERIZAÇÃO
// ----------------------------------------------------
window.render = function() {
    const hoje = new Date(); 
    const mesCorrente = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
    const diaHoje = hoje.getDate();
    
    let calc = { 
        receitas: 0, prevReceitas: 0, despesas: 0, prevGastos: 0, 
        faturas: 0, faturasFuturas: 0, saldoLivre: 0, investido: 0, 
        usoMetaCartao: 0, metaTotalCartao: 0, gastosFixos: 0, gastosVariaveis: 0 
    };
    
    const catFixas = (db.categorias || []).filter(c => c.fixa).map(c => c.nome);

    (db.contas || []).forEach(c => { 
        if(c.tipo === 'movimentacao') calc.saldoLivre += c.saldo; 
        if(c.tipo === 'investimento') calc.investido += c.saldo; 
        if(c.tipo === 'cartao') calc.metaTotalCartao += c.meta; 
    });

    (db.lancamentos || []).forEach(l => {
        const conta = (db.contas || []).find(c => c.id === l.contaId); 
        if(!conta) return;
        
        if (conta.tipo === 'cartao') {
            const mesFatura = getMesFaturaLogico(l.data, conta.fechamento || 1); 
            const fatID = `${conta.id}-${mesFatura}`;
            
            if (!(db.faturasPagas || []).includes(fatID)) {
                const valMutante = T_RECEITAS.includes(l.tipo) ? -l.valor : l.valor;
                if (mesFatura > mesCorrente) calc.faturasFuturas += valMutante; 
                else calc.faturas += valMutante;
            }
            
            let mesAtivoFatura = hoje.getMonth() + 1;
            let anoAtivoFatura = hoje.getFullYear();
            if (diaHoje >= (conta.fechamento || 1)) {
                mesAtivoFatura += 1;
                if (mesAtivoFatura > 12) { mesAtivoFatura = 1; anoAtivoFatura += 1; }
            }
            const strMesAtivo = `${anoAtivoFatura}-${mesAtivoFatura.toString().padStart(2, '0')}`;

            if (mesFatura === strMesAtivo) {
                if (['despesas_gerais', 'despesa', 'emprestei_cartao'].includes(l.tipo)) calc.usoMetaCartao += l.valor;
                else if (T_RECEITAS.includes(l.tipo)) calc.usoMetaCartao -= l.valor;
            }
            
            if (mesFatura === mesCorrente) {
                if (['despesas_gerais', 'despesa'].includes(l.tipo)) { 
                    if(catFixas.includes(l.cat)) calc.gastosFixos += l.valor; 
                    else calc.gastosVariaveis += l.valor; 
                }
            }
        } else {
            if (l.data.substring(0,7) === mesCorrente) {
                if (l.efetivado) { 
                    if (T_RECEITAS.includes(l.tipo)) calc.receitas += l.valor; 
                    if (T_DESPESAS.includes(l.tipo) && !['emprestei_cartao', 'emp_cartao'].includes(l.tipo)) { 
                        calc.despesas += l.valor; 
                        if(catFixas.includes(l.cat)) calc.gastosFixos += l.valor; 
                        else calc.gastosVariaveis += l.valor; 
                    } 
                } else { 
                    if (T_RECEITAS.includes(l.tipo)) calc.prevReceitas += l.valor; 
                    if (T_DESPESAS.includes(l.tipo) && !['emprestei_cartao', 'emp_cartao'].includes(l.tipo)) calc.prevGastos += l.valor; 
                }
            }
        }
    });

    if (calc.usoMetaCartao < 0) calc.usoMetaCartao = 0;

    if (db.amortizacoesFaturas) {
        Object.keys(db.amortizacoesFaturas).forEach(fatID => {
            if (!(db.faturasPagas || []).includes(fatID)) {
                const mesFatura = fatID.split('-')[1];
                if (mesFatura > mesCorrente) calc.faturasFuturas -= db.amortizacoesFaturas[fatID]; 
                else calc.faturas -= db.amortizacoesFaturas[fatID];
            }
        });
    }

    const painelInsights = document.getElementById('painel-insights');
    if (painelInsights && typeof window.obterInsightsFinanceiros === 'function') {
        const insightsGerados = window.obterInsightsFinanceiros();
        if (insightsGerados.length > 0) {
            painelInsights.innerHTML = insightsGerados.map(i => `
                <div class="insight-card ${i.tipo}">
                    <div style="font-size: 18px; margin-right: 5px; color: inherit; align-self: flex-start;"><i class="fas ${i.icon}"></i></div>
                    <div style="flex: 1;">${i.texto}</div>
                </div>
            `).join('');
            painelInsights.style.display = 'flex';
        } else painelInsights.style.display = 'none';
    }

    const setTexto = (id, texto) => { const el = document.getElementById(id); if(el) el.innerText = texto; };
    
    setTexto('dash-receitas', `R$ ${fmtBR(calc.receitas)}`); 
    setTexto('dash-prev-receitas', `R$ ${fmtBR(calc.prevReceitas)}`); 
    setTexto('dash-despesas', `R$ ${fmtBR(calc.despesas)}`); 
    setTexto('dash-prev-gastos', `R$ ${fmtBR(calc.prevGastos)}`);
    setTexto('dash-faturas', `R$ ${fmtBR(calc.faturas)}`); 
    setTexto('dash-faturas-futuras', `R$ ${fmtBR(calc.faturasFuturas)}`); 
    setTexto('dash-saldo-livre', `R$ ${fmtBR(calc.saldoLivre)}`); 
    setTexto('dash-investido', `R$ ${fmtBR(calc.investido)}`);

    const saldoProjetado = calc.saldoLivre - calc.prevGastos - calc.faturas + calc.prevReceitas; 
    const projElem = document.getElementById('dash-projecao');
    if(projElem) { 
        projElem.innerText = `R$ ${fmtBR(saldoProjetado)}`; 
        projElem.style.color = saldoProjetado >= 0 ? 'var(--sucesso)' : 'var(--perigo)'; 
    }

    setTexto('uso-meta-texto', `R$ ${fmtBR(calc.usoMetaCartao)} / R$ ${fmtBR(calc.metaTotalCartao)}`);
    const pMeta = calc.metaTotalCartao > 0 ? (calc.usoMetaCartao / calc.metaTotalCartao) * 100 : 0; 
    const metaBar = document.getElementById('meta-bar');
    if(metaBar) { 
        metaBar.style.width = Math.min(pMeta, 100) + "%"; 
        metaBar.style.background = pMeta > 100 ? '#ef4444' : (pMeta > 80 ? '#f59e0b' : '#10b981'); 
    }
    setTexto('meta-percentual', `${pMeta.toFixed(1)}%`);

    const patrimonioLiquido = calc.saldoLivre + calc.investido - calc.faturas; 
    const patElem = document.getElementById('bi-patrimonio');
    if(patElem) { 
        patElem.innerText = `R$ ${fmtBR(patrimonioLiquido)}`; 
        patElem.style.color = patrimonioLiquido >= 0 ? 'var(--sucesso)' : 'var(--perigo)'; 
    }

    const custoMensal = calc.despesas + calc.faturas; 
    const sobrevivencia = custoMensal > 0 ? (calc.investido / custoMensal) : 0;
    setTexto('bi-sobrevivencia', custoMensal > 0 ? `${sobrevivencia.toFixed(1)} Meses` : '∞ Meses');

    const sobra = calc.receitas - custoMensal; 
    const taxaPoupanca = calc.receitas > 0 ? (sobra / calc.receitas) * 100 : 0;
    setTexto('bi-taxa-poupanca', `${taxaPoupanca.toFixed(1)}%`);
    const barPoupanca = document.getElementById('bar-poupanca'); 
    if(barPoupanca) barPoupanca.style.width = `${Math.min(Math.max(0, taxaPoupanca), 100)}%`;

    const totalGastosBI = calc.gastosFixos + calc.gastosVariaveis; 
    const percFixo = totalGastosBI > 0 ? (calc.gastosFixos / totalGastosBI) * 100 : 0; 
    const percVar = totalGastosBI > 0 ? (calc.gastosVariaveis / totalGastosBI) * 100 : 0;
    
    setTexto('bi-perc-fixo', `${percFixo.toFixed(0)}%`); setTexto('bi-perc-var', `${percVar.toFixed(0)}%`);
    const barFixo = document.getElementById('bar-fixo'); const barVar = document.getElementById('bar-var');
    if(barFixo) barFixo.style.width = `${percFixo}%`; if(barVar) barVar.style.width = `${percVar}%`;

    if (typeof renderRadarVencimentos === 'function') renderRadarVencimentos(); 
    if (typeof renderHistorico === 'function') renderHistorico(); 
    if (typeof renderAbaContas === 'function') renderAbaContas(); 
    if (typeof renderAbaFaturas === 'function') renderAbaFaturas(); 
    if (typeof renderListaContratos === 'function') renderListaContratos();
    if (typeof renderListaSalarios === 'function') renderListaSalarios();
    
    setTimeout(() => { 
        if (typeof renderGrafico === 'function') renderGrafico(); 
        if (typeof renderGraficoEvolucao === 'function') renderGraficoEvolucao(); 
    }, 100);
}

// ----------------------------------------------------
// 5. ABAS, LISTAS E EXTRATOS (UI SECUNDÁRIA)
// ----------------------------------------------------
window.renderAbaContas = function() {
    const lista = document.getElementById('lista-contas-saldos'); 
    if(!lista) return; 
    lista.innerHTML = ``;
    
    (db.contas || []).forEach(c => {
        const isCartao = c.tipo === 'cartao'; 
        let extraHtml = ''; let usoLimite = 0; let usoMeta = 0;
        
        if (isCartao) {
            const hoje = new Date(); const diaHoje = hoje.getDate();
            let mesAtivo = hoje.getMonth() + 1; let anoAtivo = hoje.getFullYear();
            if (diaHoje >= (c.fechamento || 1)) { mesAtivo += 1; if (mesAtivo > 12) { mesAtivo = 1; anoAtivo += 1; } }
            const strMesAtivo = `${anoAtivo}-${mesAtivo.toString().padStart(2, '0')}`;
            
            (db.lancamentos || []).forEach(l => { 
                if (l.contaId === c.id) { 
                    const mesLancLogico = getMesFaturaLogico(l.data, c.fechamento || 1); 
                    const isPaga = (db.faturasPagas || []).includes(`${c.id}-${mesLancLogico}`); 
                    let valorCalc = 0; 
                    if (T_DESPESAS_CARTAO.includes(l.tipo)) valorCalc = l.valor; 
                    else if (T_RECEITAS.includes(l.tipo)) valorCalc = -l.valor; 
                    if (valorCalc !== 0) { 
                        if (mesLancLogico === strMesAtivo) usoMeta += valorCalc; 
                        if (!isPaga) usoLimite += valorCalc; 
                    } 
                }
            });
            
            Object.keys(db.amortizacoesFaturas || {}).forEach(fatID => { 
                if (fatID.split('-')[0] === c.id && !(db.faturasPagas || []).includes(fatID)) usoLimite -= db.amortizacoesFaturas[fatID]; 
            });
            
            if (usoLimite < 0) usoLimite = 0; if (usoMeta < 0) usoMeta = 0;
            const pLimite = c.limite > 0 ? (usoLimite / c.limite) * 100 : 0; 
            const pMeta = c.meta > 0 ? (usoMeta / c.meta) * 100 : 0;
            
            extraHtml = `
            <div style="margin-top: 15px; padding-right: 5px;">
                <div class="limite-texto" style="margin-bottom: 4px; opacity: 0.9; font-size: 11px;"><span>Consumo (Limite): R$ ${fmtBR(usoLimite)} (${pLimite.toFixed(1)}%)</span><span>R$ ${fmtBR(c.limite || 0)}</span></div>
                <div class="limite-bg"><div class="limite-fill" style="width:${Math.min(pLimite,100)}%"></div></div>
                <div class="limite-texto" style="margin-bottom: 4px; margin-top: 10px; opacity: 0.9; font-size: 11px;"><span>Consumo Fatura Atual (Meta): R$ ${fmtBR(usoMeta)} (${pMeta.toFixed(1)}%)</span><span>R$ ${fmtBR(c.meta || 0)}</span></div>
                <div class="limite-bg"><div class="limite-fill" style="width:${Math.min(pMeta,100)}%; background: ${pMeta > 100 ? '#ef4444' : (pMeta > 80 ? '#f59e0b' : '#10b981')};"></div></div>
            </div>`;
        }
        
        lista.innerHTML += `
            <div class="cartao-banco" style="background: linear-gradient(135deg, ${c.cor}, #1e293b); margin-bottom: 10px;">
                <div class="cartao-header"><span class="cartao-nome">${c.nome}</span><span class="cartao-tipo">${isCartao ? 'Crédito' : (c.tipo==='investimento' ? 'Investimento' : 'Corrente')}</span></div>
                <div class="cartao-saldo">R$ ${fmtBR(isCartao ? ((c.limite || 0) - usoLimite) : (c.saldo || 0))}</div>
                ${isCartao ? '<small style="display:block; opacity:0.8; font-size:10px; margin-top:5px;">Limite Disponível</small>' : ''} 
                ${extraHtml}
                <div class="cartao-acoes">
                    <button class="btn-cartao-acao" onclick="abrirModalExtratoConta('${c.id}')"><i class="fas fa-list-ul"></i> Extrato</button>
                    <button class="btn-cartao-acao" onclick="abrirModalAjusteConta('${c.id}')"><i class="fas fa-cog"></i> Ajustes</button>
                </div>
            </div>`;
    });
}

window.renderFiltroCategoriasExtrato = function() {
    const container = document.getElementById('filtro-categoria-container'); if(!container) return;
    let catAtual = document.getElementById('filtro-cat') ? document.getElementById('filtro-cat').value || 'todas' : 'todas';
    
    let catsUnicas = new Set();
    (db.lancamentos || []).forEach(l => { if(l.cat) catsUnicas.add(l.cat); });
    let arrayCats = Array.from(catsUnicas).sort((a,b) => a.localeCompare(b));

    let html = `<input type="hidden" id="filtro-cat" value="${catAtual}">`;
    html += `<button class="cat-filter-btn ${catAtual === 'todas' ? 'active' : ''}" onclick="mudarFiltroCategoriaExtrato('todas', this)" style="flex: 0 0 auto; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; border: ${catAtual === 'todas' ? 'none' : '1px solid var(--linha)'}; background: ${catAtual === 'todas' ? 'var(--esmeralda)' : 'var(--input-bg)'}; color: ${catAtual === 'todas' ? '#fff' : 'var(--texto-sec)'}; cursor: pointer;">Todas</button>`;

    arrayCats.forEach(cat => {
        const isActive = catAtual === cat;
        html += `<button class="cat-filter-btn ${isActive ? 'active' : ''}" onclick="mudarFiltroCategoriaExtrato('${cat}', this)" style="flex: 0 0 auto; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; border: ${isActive ? 'none' : '1px solid var(--linha)'}; background: ${isActive ? 'var(--esmeralda)' : 'var(--input-bg)'}; color: ${isActive ? '#fff' : 'var(--texto-sec)'}; cursor: pointer;">${cat}</button>`;
    });
    container.innerHTML = html;
};

window.renderHistorico = function() {
    const lista = document.getElementById('lista-historico-filtros'); if(!lista) return;
    if (typeof window.renderFiltroCategoriasExtrato === 'function') window.renderFiltroCategoriasExtrato();

    const inputMes = document.getElementById('filtro-mes'); 
    const inputStatus = document.getElementById('filtro-status');
    const inputCat = document.getElementById('filtro-cat');
    
    const hojeLocal = new Date(); 
    const mesFiltro = (inputMes && inputMes.value) ? inputMes.value : `${hojeLocal.getFullYear()}-${(hojeLocal.getMonth() + 1).toString().padStart(2, '0')}`; 
    const statusFiltro = (inputStatus && inputStatus.value) ? inputStatus.value : 'todos';
    const catFiltro = (inputCat && inputCat.value) ? inputCat.value : 'todas';
    
    if (inputMes && !inputMes.value) inputMes.value = mesFiltro;
    const limiteAtencao = new Date(); limiteAtencao.setHours(0,0,0,0); limiteAtencao.setDate(limiteAtencao.getDate() + 7);

    let lancs = (db.lancamentos || []).map(l => {
        if(!l || !l.data) return null; 
        const c = (db.contas || []).find(x => x.id === l.contaId); 
        let dtReferencia = new Date(l.data + 'T00:00:00'); 
        let statusCalculado = '';
        
        if (c && c.tipo === 'cartao') { 
            const mesFat = getMesFaturaLogico(l.data, c.fechamento || 1); 
            if ((db.faturasPagas || []).includes(`${c.id}-${mesFat}`)) statusCalculado = 'pago'; 
            else if (new Date() >= new Date(`${mesFat.split('-')[0]}-${mesFat.split('-')[1]}-${(c.fechamento || 1).toString().padStart(2,'0')}T00:00:00`)) statusCalculado = 'atencao'; 
            else statusCalculado = 'em_aberto'; 
        } else { 
            if (l.efetivado) statusCalculado = T_RECEITAS.includes(l.tipo) ? 'receita' : 'pago'; 
            else if (dtReferencia < new Date().setHours(0,0,0,0)) statusCalculado = 'atrasado'; 
            else if (dtReferencia <= limiteAtencao) statusCalculado = 'atencao'; 
            else statusCalculado = 'em_aberto'; 
        }
        return { ...l, statusCalculado, contaObj: c, isReceita: T_RECEITAS.includes(l.tipo) };
    }).filter(l => l !== null && l.data.substring(0,7) === mesFiltro && (statusFiltro === 'todos' || l.statusCalculado === statusFiltro) && (catFiltro === 'todas' || l.cat === catFiltro))
      .sort((a, b) => new Date(b.data) - new Date(a.data) || b.id - a.id);
    
    if(lancs.length === 0) { lista.innerHTML = "<div class='card texto-vazio'>Nenhum registro encontrado.</div>"; return; }

    const catDBList = [...(db.categorias || [])];
    lista.innerHTML = `<div class="flex-between" style="margin-bottom: 12px; align-items: center; padding: 0 5px;"><span style="font-size: 12px; color: var(--texto-sec); font-weight: 600;"><i class="fas fa-list"></i> ${lancs.length} registros</span></div>` + lancs.map(l => {
        const c = l.contaObj; let chipHtml = ''; 
        if (c && c.tipo === 'cartao') chipHtml = `<span class="status-badge" style="background:var(--${l.statusCalculado==='pago'?'sucesso':(l.statusCalculado==='atencao'?'alerta':'azul')}); color:#fff;">FATURA ${l.statusCalculado==='pago'?'PAGA':(l.statusCalculado==='atencao'?'FECHADA':'ABERTA')}</span>`; 
        else chipHtml = `<span class="status-badge" style="background:var(--${l.statusCalculado==='receita'?'esmeralda':(l.statusCalculado==='pago'?'sucesso':(l.statusCalculado==='atrasado'?'perigo':(l.statusCalculado==='atencao'?'alerta':'azul')))}); color:#fff;">${l.statusCalculado==='receita'?'RECEBIDO':(l.statusCalculado==='pago'?'PAGO':(l.statusCalculado==='atrasado'?'ATRASADO':(l.statusCalculado==='atencao'?'ATENÇÃO':(l.isReceita?'A RECEBER':'EM ABERTO'))))}</span>`; 

        let infoDivida = '';
        if (l.rolagem && !l.efetivado) { 
            const vOrig = l.valorOriginal !== undefined ? l.valorOriginal : l.valor; const vAmort = l.valorAmortizado || 0; 
            infoDivida = `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--linha);"><div class="flex-between" style="font-size:10px; color:var(--texto-sec); margin-bottom:4px;"><span>Amortizado: R$ ${fmtBR(vAmort)} (de R$ ${fmtBR(vOrig)})</span><span class="txt-sucesso">${(vOrig>0?Math.min((vAmort/vOrig)*100,100):0).toFixed(0)}%</span></div><div class="micro-bar-bg"><div class="micro-bar-fill" style="width:${vOrig>0?Math.min((vAmort/vOrig)*100,100):0}%"></div></div></div>`; 
        }

        const catDB = catDBList.find(cat => cat.nome === l.cat); 
        let accOptionsHtml = c ? (db.contas || []).filter(acc => (acc.tipo === 'cartao') === (c.tipo === 'cartao')).map(acc => `<option value="${acc.id}" ${acc.id === c.id ? 'selected' : ''}>${acc.tipo === 'cartao' ? '💳' : '🏦'} ${acc.nome}</option>`).join('') : `<option value="${l.contaId}">Conta Excluída</option>`;
        let catOptionsHtml = '<option value="">Outros</option>' + catDBList.map(cat => `<option value="${cat.nome}" ${l.cat === cat.nome ? 'selected' : ''}>${cat.icone || ''} ${cat.nome}</option>`).join('');

        return `
        <div class="card fatura-card ${!l.efetivado ? 'opacity-90' : ''}" style="padding:0; overflow:hidden; border:1px solid var(--linha); border-left: 4px solid ${c ? c.cor : '#ccc'}; margin-bottom: 12px;">
            <div style="padding:15px; cursor:pointer; user-select:none;" oncontextmenu="mostrarContextMenuRightClick(event, ${l.id})" onmousedown="iniciarLongPress(event, ${l.id})" onmouseup="cancelarLongPress()" onmouseleave="cancelarLongPress()" ontouchstart="iniciarLongPress(event, ${l.id})" ontouchend="cancelarLongPress()" onclick="handleLancamentoClick(event, ${l.id})">
                <div class="flex-between" style="margin-bottom: 8px;"><strong style="font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:70%;">${l.desc || 'Sem descrição'}</strong>${chipHtml}</div>
                <div class="flex-between" style="align-items: center;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <small style="color:var(--texto-sec); font-size:11px;">${(l.data || '').split('-').reverse().join('/')} • ${c?c.nome:'Excluída'} <span class="cat-break-mobile" style="display:inline;">• ${catDB&&catDB.icone?catDB.icone+' ':''}${l.cat || 'Outros'}</span></small>
                        ${(!l.efetivado && c && c.tipo !== 'cartao') ? `<div style="display:flex; gap:6px; margin-top:6px;"><button class="btn-primary" style="padding:6px 10px; font-size:10px; width:auto;" onclick="event.stopPropagation(); ${l.rolagem ? `confirmarQuitacao(${l.id})` : `confirmarPagamento(${l.id})`}">${l.rolagem ? 'Quitar' : (l.isReceita ? 'Receber' : 'Pagar')}</button>${l.rolagem ? `<button class="btn-outline" style="padding:6px 10px; font-size:10px; width:auto;" onclick="event.stopPropagation(); abrirModalParcial(${l.id}, ${l.valor})">Parcial</button>` : ''}</div>` : ''}
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;"><strong class="val-nowrap-mobile" style="color: ${T_DESPESAS.includes(l.tipo) ? 'var(--perigo)' : 'var(--sucesso)'}; font-size:16px;">${l.isReceita ? '+' : '-'} R$ ${fmtBR(l.valor || 0)}</strong><i class="fas fa-chevron-down fatura-chevron" id="icon-${l.id}" style="font-size:11px; color:var(--texto-sec);"></i></div>
                </div>
                ${infoDivida}
            </div>
            <div id="edit-lanc-${l.id}" style="display:none; padding:15px; border-top:1px dashed var(--linha); background:var(--input-bg);" onclick="event.stopPropagation()">
                <label class="label-moderno">Editar Descrição</label><input type="text" id="e-lanc-desc-${l.id}" class="input-moderno mb-10" value="${l.desc || ''}">
                <label class="label-moderno">Conta Origem/Destino</label><select id="e-lanc-conta-${l.id}" class="input-moderno mb-10">${accOptionsHtml}</select>
                <label class="label-moderno">Categoria</label><select id="e-lanc-cat-${l.id}" class="input-moderno mb-10">${catOptionsHtml}</select>
                <div class="grid-inputs mb-10"><div><label class="label-moderno">Data</label><input type="date" id="e-lanc-data-${l.id}" class="input-moderno" value="${l.data || ''}"></div><div><label class="label-moderno">Valor (R$)</label><input type="text" inputmode="numeric" id="e-lanc-val-${l.id}" class="input-moderno" value="${(l.valor || 0).toFixed(2).replace('.', ',')}" oninput="mascaraMoeda(event)"></div></div>
                <div class="flex-between" style="gap:10px;"><button class="btn-outline txt-perigo" style="width:48%; border-color:var(--perigo);" onclick="excluirLancamento(${l.id})"><i class="fas fa-trash"></i> Excluir</button><button class="btn-primary" style="width:48%;" onclick="salvarEdicaoLancamento(${l.id})">Salvar</button></div>
                ${l.idGrupo ? `<div class="mt-10 pt-10" style="border-top: 1px dashed var(--linha);"><button class="btn-outline txt-alerta" style="width:100%; border-color:var(--alerta);" onclick="excluirParcelamentoGrupo('${l.idGrupo}')"><i class="fas fa-calendar-times"></i> Excluir Restantes do Parcelamento</button></div>` : ''}
            </div>
        </div>`;
    }).join('');
}

window.toggleEditLancamento = function(id) { 
    const el = document.getElementById(`edit-lanc-${id}`); const icon = document.getElementById(`icon-${id}`); 
    if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; 
    if(icon) icon.classList.toggle('open'); 
}

window.renderAbaFaturas = function() {
    const abas = document.getElementById('abas-cartoes-fatura'); const lista = document.getElementById('lista-faturas-agrupadas'); 
    if(!abas || !lista) return; 
    
    abas.removeAttribute("style");
    const cartoes = (db.contas || []).filter(c => c.tipo === 'cartao'); 
    if(cartoes.length === 0) { abas.innerHTML = ""; lista.innerHTML = "<div class='card texto-vazio'>Nenhum cartão cadastrado.</div>"; return; }
    if(!cartaoAtivoFatura && cartoes.length > 0) cartaoAtivoFatura = cartoes[0].id;
    
    abas.innerHTML = `<div class="segmented-control">` + cartoes.map(c => `<button class="segmented-btn ${c.id === cartaoAtivoFatura ? 'active' : ''}" onclick="cartaoAtivoFatura='${c.id}'; renderAbaFaturas();">${c.nome}</button>`).join('') + `</div>`;
    
    const c = cartoes.find(x => x.id === cartaoAtivoFatura); if(!c) return; 
    let mesesFatura = {};
    (db.lancamentos || []).forEach(l => { 
        if(l.contaId !== c.id) return; 
        const mesFat = getMesFaturaLogico(l.data, c.fechamento || 1); 
        if(!mesesFatura[mesFat]) mesesFatura[mesFat] = { total: 0, lancamentos: [] }; 
        mesesFatura[mesFat].total += T_RECEITAS.includes(l.tipo) ? -l.valor : l.valor; 
        mesesFatura[mesFat].lancamentos.push(l); 
    });

    const mesesOrdenados = Object.keys(mesesFatura).sort((a,b) => new Date(b+'-01') - new Date(a+'-01')); 
    if(mesesOrdenados.length === 0) { lista.innerHTML = "<div class='card texto-vazio'>Sem faturas registradas.</div>"; return; }

    lista.innerHTML = mesesOrdenados.map(mes => {
        const fatID = `${c.id}-${mes}`; const estaPaga = (db.faturasPagas || []).includes(fatID); 
        const jaAmortizado = (db.amortizacoesFaturas && db.amortizacoesFaturas[fatID]) || 0; 
        const totalFinal = mesesFatura[mes].total - jaAmortizado;
        let statusTag = estaPaga ? '<span class="status-badge" style="background:var(--sucesso); color:#fff;">PAGO</span>' : (new Date() >= new Date(`${mes.split('-')[0]}-${mes.split('-')[1]}-${(c.fechamento || 1).toString().padStart(2, '0')}T00:00:00`) ? '<span class="status-badge" style="background:var(--alerta); color:#fff;">FECHADA</span>' : '<span class="status-badge" style="background:var(--azul); color:#fff;">EM ABERTO</span>');

        return `
        <div class="card fatura-card ${estaPaga ? 'paga' : ''}" style="padding:0; overflow:hidden; border:1px solid ${estaPaga?'var(--sucesso)':'var(--linha)'}; margin-bottom: 12px;">
            <div style="padding:15px; cursor:pointer; background:${estaPaga?'rgba(16,185,129,0.05)':'var(--card-bg)'};" onclick="toggleEditLancamento('det-fat-${fatID}')">
                <div class="flex-between" style="margin-bottom: 8px;"><strong style="font-size:14px;"><i class="fas fa-file-invoice-dollar" style="color:var(--texto-sec);"></i> Fatura ${formatarMesFaturaLogico(mes)}</strong>${statusTag}</div>
                <div class="flex-between" style="align-items: center;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <small style="color:var(--texto-sec); font-size:11px;">Venc: ${(c.vencimento||1).toString().padStart(2,'0')}/${mes.split('-')[1]}</small>
                        <div style="display:flex; align-items:center; gap:8px;"><strong class="${estaPaga?'txt-sucesso':'txt-perigo'}" style="font-size:16px;">R$ ${fmtBR(totalFinal)}</strong><i class="fas fa-chevron-down fatura-chevron" id="icon-det-fat-${fatID}" style="font-size:11px; color:var(--texto-sec);"></i></div>
                    </div>
                    <div style="display:flex; gap:6px;">
                        ${!estaPaga && totalFinal > 0 ? `<button class="btn-outline" style="padding:6px 10px; font-size:10px; width:auto;" onclick="event.stopPropagation(); amortizarFatura('${fatID}')">Amortizar</button>` : ''}
                        <button class="${estaPaga?'btn-outline':'btn-primary'}" style="padding:6px 10px; font-size:10px; width:auto;" onclick="event.stopPropagation(); alternarPagamentoFatura('${fatID}')">${estaPaga?'Reabrir':'Pagar'}</button>
                    </div>
                </div>
                ${jaAmortizado > 0 ? `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--linha);"><div class="flex-between" style="font-size:10px; color:var(--texto-sec); margin-bottom:4px;"><span>Amortizado: R$ ${fmtBR(jaAmortizado)}</span><span class="txt-sucesso">${((jaAmortizado/mesesFatura[mes].total)*100).toFixed(0)}%</span></div><div class="micro-bar-bg"><div class="micro-bar-fill" style="width:${(jaAmortizado/mesesFatura[mes].total)*100}%"></div></div></div>` : ''}
            </div>
            <div id="edit-lanc-det-fat-${fatID}" style="display:none; padding:15px; border-top:1px dashed var(--linha); background:var(--input-bg);" onclick="event.stopPropagation()">
                ${mesesFatura[mes].lancamentos.map(l => `<div class="flex-between mb-10" style="font-size:12px; border-bottom:1px solid var(--linha); padding-bottom:5px;"><span>${(l.data || '').split('-').reverse().join('/')} - ${l.desc}</span><strong class="${T_RECEITAS.includes(l.tipo)?'txt-sucesso':'txt-perigo'}">R$ ${fmtBR(l.valor || 0)}</strong></div>`).join('')}
            </div>
        </div>`;
    }).join('');
}

window.renderRadarVencimentos = function() {
    const lista = document.getElementById('lista-radar-vencimentos'); if(!lista) return;
    const hoje = new Date(); hoje.setHours(0,0,0,0); const limite7 = new Date(hoje); limite7.setDate(hoje.getDate() + 7);
    let alertas = [];

    (db.lancamentos || []).forEach(l => {
        const conta = (db.contas || []).find(c => c.id === l.contaId); if (conta && conta.tipo === 'cartao') return; 
        const d = new Date(l.data + 'T00:00:00');
        if (!l.efetivado && T_DESPESAS.includes(l.tipo) && d <= limite7) {
            const dias = Math.ceil((d - hoje) / 86400000);
            alertas.push({ dataOrd: d, html: `<div class="flex-between mb-10" style="padding-bottom:10px; border-bottom:1px solid var(--linha);"><div><strong style="font-size:14px;">${l.desc}</strong><small style="display:block; color: ${dias < 0 ? 'var(--perigo)' : 'var(--alerta)'}; font-weight:600;">${dias < 0 ? 'Atrasado' : (dias===0?'Vence HOJE':`Vence em ${dias} dia(s)`)}</small></div><b class="txt-perigo val-nowrap-mobile">R$ ${fmtBR(l.valor)}</b></div>` });
        }
    });

    (db.contas || []).filter(c => c.tipo === 'cartao').forEach(c => {
        let meses = {};
        (db.lancamentos || []).forEach(l => { if(l.contaId === c.id) { const m = getMesFaturaLogico(l.data, c.fechamento || 1); meses[m] = (meses[m]||0) + (T_RECEITAS.includes(l.tipo) ? -l.valor : l.valor); } });
        Object.keys(meses).forEach(m => {
            const fatID = `${c.id}-${m}`; if ((db.faturasPagas || []).includes(fatID)) return;
            const t = meses[m] - ((db.amortizacoesFaturas && db.amortizacoesFaturas[fatID]) || 0); if (t <= 0) return;
            let [a, ms] = m.split('-'); if ((c.vencimento||1) < (c.fechamento||1)) { ms = parseInt(ms)+1; if(ms>12){ms=1;a=parseInt(a)+1;} }
            const dv = new Date(a, ms-1, c.vencimento||1); dv.setHours(0,0,0,0);
            if (dv <= limite7) { const dias = Math.ceil((dv - hoje) / 86400000); alertas.push({ dataOrd: dv, html: `<div class="flex-between mb-10" style="padding-bottom:10px; border-bottom:1px solid var(--linha);"><div><strong style="font-size:14px;"><i class="fas fa-credit-card"></i> ${c.nome}</strong><small style="display:block; color: ${dias < 0 ? 'var(--perigo)' : 'var(--alerta)'}; font-weight:600;">${dias < 0 ? 'Fatura Atrasada' : (dias===0?'Vence HOJE':`Fatura em ${dias} dia(s)`)}</small></div><b class="txt-perigo val-nowrap-mobile">R$ ${fmtBR(t)}</b></div>` }); }
        });
    });

    alertas.sort((a, b) => a.dataOrd - b.dataOrd); 
    lista.innerHTML = alertas.length ? alertas.map(a => a.html).join('') : '<p class="texto-vazio">Tudo tranquilo por aqui.</p>';
}

window.renderListaSalarios = function() {
    const lista = document.getElementById('lista-salarios-cadastrados'); if(!lista) return;
    if(!db.salarios || db.salarios.length === 0) { lista.innerHTML = '<p class="texto-vazio" style="font-size:12px; margin-top:10px;">Nenhuma renda automática cadastrada.</p>'; return; }
    lista.innerHTML = db.salarios.map(sal => `<div class="salario-card" style="background: var(--card-bg); border: 1px solid var(--linha); border-radius: 10px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;"><div><strong style="font-size: 14px; color: var(--texto-main); display:block; margin-bottom:4px;">${sal.nome}</strong><small style="color: var(--texto-sec); font-size: 11px; line-height:1.4; display:block;"><i class="fas fa-calendar-alt"></i> ${sal.frequencia.charAt(0).toUpperCase() + sal.frequencia.slice(1)} • Dias: ${sal.dias.join(', ')}<br><i class="fas fa-university"></i> Destino: ${((db.contas || []).find(c => c.id === sal.contaId)||{}).nome || 'Excluída'}</small></div><div style="text-align: right;"><strong class="txt-esmeralda" style="font-size: 16px; display:block; margin-bottom:8px;">R$ ${fmtBR(sal.valorTotal)}</strong><div style="display: flex; gap: 8px; justify-content: flex-end;"><button class="btn-icon" style="color: var(--azul); background: rgba(59,130,246,0.1); padding: 6px 10px; border-radius: 6px;" onclick="abrirEdicaoSalario(${sal.id})"><i class="fas fa-edit"></i></button><button class="btn-icon" style="color: var(--perigo); background: rgba(239,68,68,0.1); padding: 6px 10px; border-radius: 6px;" onclick="excluirSalario(${sal.id})"><i class="fas fa-trash"></i></button></div></div></div>`).join('');
};

window.renderListaContratos = function() {
    const listaFixas = document.getElementById('lista-contas-fixas-ativas'); const listaParc = document.getElementById('lista-parcelamentos-ativos');
    if(!listaFixas || !listaParc) return;

    let fixas = [], chaves = new Set();
    (db.lancamentos || []).forEach(l => { if(l.fixo && !l.efetivado && T_DESPESAS.includes(l.tipo)) { const k = l.desc + '|' + l.contaId; if(!chaves.has(k)) { chaves.add(k); fixas.push(l); } } });
    listaFixas.innerHTML = fixas.length ? fixas.map(l => `<div class="salario-card" style="background: var(--card-bg); border: 1px solid var(--linha); border-radius: 10px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;"><div><strong style="font-size: 14px; color: var(--texto-main); display:block; margin-bottom:4px;">${l.desc}</strong><small style="color: var(--texto-sec); font-size: 11px; display:block; line-height: 1.4;"><i class="fas fa-university"></i> ${((db.contas||[]).find(x=>x.id===l.contaId)||{}).nome||'Excluída'} <br> <i class="fas fa-calendar-day"></i> Dia: ${l.data.split('-')[2]}</small></div><div style="text-align: right;"><strong class="txt-perigo" style="font-size: 16px; display:block; margin-bottom:8px;">R$ ${fmtBR(l.valor)}</strong><div style="display: flex; gap: 8px; justify-content: flex-end;"><button class="btn-icon" style="color: var(--azul); background: rgba(59,130,246,0.1); padding: 6px 10px; border-radius: 6px;" onclick="abrirEdicaoContaFixa(${l.id})"><i class="fas fa-edit"></i></button><button class="btn-icon" style="color: var(--perigo); background: rgba(239,68,68,0.1); padding: 6px 10px; border-radius: 6px;" onclick="excluirContaFixa(${l.id})"><i class="fas fa-trash"></i></button></div></div></div>`).join('') : '<p class="texto-vazio">Nenhuma conta fixa ativa.</p>';

    let parcs = [], gps = new Set();
    (db.lancamentos || []).forEach(l => { if(l.idGrupo && !l.efetivado && !gps.has(l.idGrupo)) { gps.add(l.idGrupo); parcs.push({...l, parcRestantes: db.lancamentos.filter(x => x.idGrupo === l.idGrupo && !x.efetivado).length}); } });
    listaParc.innerHTML = parcs.length ? parcs.map(l => `<div class="salario-card" style="background: var(--card-bg); border: 1px solid var(--linha); border-radius: 10px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;"><div><strong style="font-size: 14px; color: var(--texto-main); display:block; margin-bottom:4px;">${l.desc.split('(')[0].trim()}</strong><small style="color: var(--texto-sec); font-size: 11px; display:block; line-height: 1.4;"><i class="fas fa-university"></i> ${((db.contas||[]).find(x=>x.id===l.contaId)||{}).nome||'Excluída'} <br> <i class="fas fa-layer-group"></i> Faltam: ${l.parcRestantes} parcelas</small></div><div style="text-align: right;"><strong class="txt-alerta" style="font-size: 16px; display:block; margin-bottom:8px;">R$ ${fmtBR(l.valor)} <small style="font-size:10px;">/mês</small></strong><div style="display: flex; gap: 8px; justify-content: flex-end;"><button class="btn-icon" style="color: var(--azul); background: rgba(59,130,246,0.1); padding: 6px 10px; border-radius: 6px;" onclick="abrirEdicaoParcelamento('${l.idGrupo}')"><i class="fas fa-edit"></i></button><button class="btn-icon" style="color: var(--perigo); background: rgba(239,68,68,0.1); padding: 6px 10px; border-radius: 6px;" onclick="excluirParcelamentoGrupo('${l.idGrupo}')"><i class="fas fa-trash"></i></button></div></div></div>`).join('') : '<p class="texto-vazio">Nenhum parcelamento ativo.</p>';
};

// ----------------------------------------------------
// 6. GRÁFICOS E BI
// ----------------------------------------------------
window.renderGrafico = function() {
    const ctx = document.getElementById('graficoCategorias'); if(!ctx) return; 
    const mes = document.getElementById('filtro-mes') ? document.getElementById('filtro-mes').value || `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}` : `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
    
    let categorias = {};
    (db.lancamentos || []).forEach(l => { if(l.efetivado && l.data && l.data.substring(0,7) === mes && ['despesas_gerais','despesa'].includes(l.tipo)) categorias[l.cat] = (categorias[l.cat]||0) + l.valor; });
    
    const labels = Object.keys(categorias); const dados = Object.values(categorias);
    const bgColors = labels.map(k => ((db.categorias || []).find(c => c.nome === k) || {}).cor || '#94a3b8');
    
    if(meuGrafico) meuGrafico.destroy(); if(dados.length === 0) return; 
    const isDark = document.body.classList.contains('dark-mode');
    
    meuGrafico = new Chart(ctx, { type:'doughnut', data:{ labels, datasets:[{ data:dados, backgroundColor: bgColors, borderWidth:3, borderColor:isDark?'#1e293b':'#fff' }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{ color:isDark?'#cbd5e1':'#64748b', usePointStyle:true, font:{size:11} } }, datalabels:{ display: () => window.innerWidth <= 768, color:'#fff', font:{weight:'bold', size:11}, formatter:(v)=>'R$ '+fmtBR(v).split(',')[0] } }, cutout:'60%' } });
}

window.renderGraficoEvolucao = function() {
    const ctx = document.getElementById('graficoEvolucao'); if(!ctx) return; 
    const filtroAno = document.getElementById('filtro-ano-grafico');
    let anosSet = new Set([(new Date()).getFullYear().toString()]);
    (db.lancamentos || []).forEach(l => { if(l.data && l.data.length >= 4) anosSet.add(l.data.substring(0,4)); });
    
    let anosArr = Array.from(anosSet).sort().reverse();
    if (filtroAno && filtroAno.options.length === 0) { anosArr.forEach(a => filtroAno.options.add(new Option(a, a))); filtroAno.value = anosArr[0]; }

    const anoSelecionado = filtroAno ? filtroAno.value : anosArr[0];
    const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const dDesp = [], dRec = [];

    for (let i = 1; i <= 12; i++) {
        let chave = `${anoSelecionado}-${i.toString().padStart(2, '0')}`;
        let tD = 0, tR = 0;
        (db.lancamentos || []).forEach(l => { if (l.data && l.data.substring(0,7) === chave) { if (T_DESPESAS.includes(l.tipo)) tD += l.valor; if (T_RECEITAS.includes(l.tipo)) tR += l.valor; } });
        dDesp.push(tD); dRec.push(tR);
    }
    
    if(meuGraficoEvolucao) meuGraficoEvolucao.destroy(); const isDark = document.body.classList.contains('dark-mode');
    meuGraficoEvolucao = new Chart(ctx, { type: 'bar', data: { labels: mesesAbrev, datasets: [ { label: 'Receitas', data: dRec, backgroundColor: '#10b981', borderRadius: 4 }, { label: 'Despesas', data: dDesp, backgroundColor: '#ef4444', borderRadius: 4 } ] }, options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 20, right: 10, left: 0, bottom: 0 } }, plugins: { legend: { position: 'bottom', labels: { color: isDark ? '#94a3b8' : '#64748b', usePointStyle: true } }, datalabels: { display: () => window.innerWidth <= 768, color: isDark ? '#cbd5e1' : '#475569', font: { weight: 'bold', size: 9 }, formatter: v => v > 0 ? 'R$ ' + Math.round(v).toLocaleString('pt-BR') : '' } }, scales: { y: { grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { color: isDark ? '#94a3b8' : '#64748b' } }, x: { grid: { display: false }, ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { weight: 'bold' } } } } } });

    const wrapper = document.getElementById('scroll-wrapper-evolucao');
    if (wrapper) setTimeout(() => wrapper.scrollLeft = (anoSelecionado === anosArr[0] && new Date().getMonth() > 5) ? wrapper.scrollWidth : 0, 150);
}

// ----------------------------------------------------
// 7. GESTÃO DE CATEGORIAS
// ----------------------------------------------------
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
        
        const gerarCardHTML = (c) => `
            <div class="salario-card" style="border-left: 4px solid ${c.cor}; border-color: ${c.cor}; background: var(--input-bg); padding: 12px; margin:0; display: flex; flex-direction: column; align-items: flex-start; position: relative; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="position: absolute; top: -15px; right: -15px; width: 50px; height: 50px; background: ${c.cor}; opacity: 0.08; border-radius: 50%;"></div>
                <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 10px; align-items: center;">
                    <div style="width: 32px; height: 32px; border-radius: 8px; background: ${c.cor}20; color: ${c.cor}; display: flex; align-items: center; justify-content: center; font-size: 16px;">${c.icone || '📁'}</div>
                    <div style="display: flex; gap: 4px; z-index: 2;"><button class="btn-icon" style="color: var(--azul); background: rgba(59,130,246,0.1); padding: 5px; border-radius: 6px; font-size: 11px;" onclick="editarCategoria('${c.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon" style="color: var(--perigo); background: rgba(239,68,68,0.1); padding: 5px; border-radius: 6px; font-size: 11px;" onclick="excluirCategoria('${c.id}')"><i class="fas fa-trash"></i></button></div>
                </div>
                <strong style="font-size: 13px; color: var(--texto-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; z-index: 2;">${c.nome}</strong>
                <small style="color: var(--texto-sec); font-size: 10px; margin-top: 4px; z-index: 2; display: flex; align-items: center; gap: 4px;">${c.fixa ? `<i class="fas fa-lock" style="color:${c.cor};"></i> Fixo` : `<i class="fas fa-random" style="color:var(--texto-sec);"></i> Variável`}</small>
            </div>`;

        lDespesas.innerHTML = catDesp.length ? catDesp.map(gerarCardHTML).join('') : '<span style="font-size:11px; color:var(--texto-sec); grid-column: span 2;">Nenhuma despesa cadastrada.</span>';
        lReceitas.innerHTML = catRec.length ? catRec.map(gerarCardHTML).join('') : '<span style="font-size:11px; color:var(--texto-sec); grid-column: span 2;">Nenhuma receita cadastrada.</span>';
    }
};

window.editarCategoria = function(id) { 
    const cat = (db.categorias || []).find(c => c.id === id); if(!cat) return; 
    document.getElementById('nova-cat-id').value = cat.id; document.getElementById('nova-cat-icone').value = cat.icone || ''; document.getElementById('nova-cat-nome').value = cat.nome; document.getElementById('nova-cat-tipo').value = cat.tipo; document.getElementById('nova-cat-cor').value = cat.cor || '#94a3b8'; document.getElementById('nova-cat-fixa').checked = !!cat.fixa; 
    removerSelecaoPaleta(); document.getElementById('label-form-cat').innerHTML = "<i class='fas fa-edit' style='color:var(--azul);'></i> Editar Categoria"; document.getElementById('btn-salvar-cat').innerText = "Salvar Alterações"; 
    fecharModalListaCat(); setTimeout(() => { const m = document.getElementById('modal-nova-cat'); if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); } }, 300);
};

window.salvarConfigNovaCategoria = function() { 
    const id = document.getElementById('nova-cat-id').value; const icone = document.getElementById('nova-cat-icone').value.trim(); const nome = document.getElementById('nova-cat-nome').value.trim(); const tipo = document.getElementById('nova-cat-tipo').value; const cor = document.getElementById('nova-cat-cor').value; const fixa = document.getElementById('nova-cat-fixa').checked; 
    if(!nome) { alert("Dê um nome para a categoria."); return; } 
    db.categorias = db.categorias || []; 
    
    if (id) { 
        const cat = db.categorias.find(c => c.id === id); 
        if (cat) { 
            if (db.categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase() && c.id !== id && c.tipo === tipo)) { alert("Já existe outra categoria com este nome."); return; } 
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
            db.categorias = db.categorias.filter(c => c.id !== id); 
            save(); renderModalCategorias(); if(typeof render === 'function') render(); if(typeof showToast === 'function') showToast("Categoria excluída!", "exclusao");
        });
    }
};

// ----------------------------------------------------
// 8. MODAIS SECUNDÁRIOS
// ----------------------------------------------------
window.getMesFaturaLogico = function(dataLancamento, diaFechamento) { 
    if (!dataLancamento) return ""; 
    const [a, m, d] = dataLancamento.split('T')[0].split('-'); 
    let ano = parseInt(a, 10); let mes = parseInt(m, 10); let dia = parseInt(d, 10); 
    if (dia >= (parseInt(diaFechamento, 10) || 1)) { mes += 1; if (mes > 12) { mes = 1; ano += 1; } } 
    return `${ano}-${mes.toString().padStart(2, '0')}`; 
}

window.formatarMesFaturaLogico = function(mesAnoStr) { 
    const meses = {'01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun','07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez'}; 
    const [ano, mes] = mesAnoStr.split('-'); return `${meses[mes]} / ${ano}`; 
}

window.abrirModalExtratoConta = function(id) {
    const c = (db.contas || []).find(x => x.id === id); if (!c) return;
    const isCartao = c.tipo === 'cartao'; let saldoCalc = 0; 
    let lancsAsc = (db.lancamentos || []).filter(l => l.contaId === c.id).sort((a,b) => new Date(a.data) - new Date(b.data) || a.id - b.id); 
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
    const c = (db.contas || []).find(x => x.id === id); if (!c) return;
    const isCartao = c.tipo === 'cartao';
    document.getElementById('conteudo-ajuste-conta').innerHTML = `
        <div class="grid-inputs mb-10"><div><label class="label-moderno">Nome da Conta</label><input type="text" id="edit-nome-${c.id}" class="input-moderno" value="${c.nome}"></div><div><label class="label-moderno">Cor Principal</label><input type="color" id="edit-cor-${c.id}" value="${c.cor}" style="width:100%; height:45px; border:none; border-radius:8px;"></div></div>
        ${isCartao ? `<div class="grid-inputs mb-10"><div><label class="label-moderno">Limite Total</label><input type="text" inputmode="numeric" id="edit-limite-${c.id}" class="input-moderno" value="${(c.limite||0).toFixed(2).replace('.',',')}" oninput="mascaraMoeda(event)"></div><div><label class="label-moderno">Meta de Gasto (Mensal)</label><input type="text" inputmode="numeric" id="edit-meta-${c.id}" class="input-moderno" value="${(c.meta||0).toFixed(2).replace('.',',')}" oninput="mascaraMoeda(event)"></div></div><div class="grid-inputs"><div><label class="label-moderno">Dia Fechamento</label><input type="number" id="edit-fecha-${c.id}" class="input-moderno" value="${c.fechamento||1}"></div><div><label class="label-moderno">Dia Vencimento</label><input type="number" id="edit-venc-${c.id}" class="input-moderno" value="${c.vencimento||1}"></div></div>` : `<div class="mb-10"><label class="label-moderno">Ajustar Saldo Atual (R$)</label><input type="text" inputmode="numeric" id="edit-saldo-${c.id}" class="input-moderno" value="${(c.saldo||0).toFixed(2).replace('.',',')}" oninput="mascaraMoeda(event)"></div>`}
        <div class="flex-between mt-20 pt-15" style="border-top: 1px dashed var(--linha);"><button class="btn-outline txt-perigo" style="border-color: var(--perigo);" onclick="fecharModalAjusteConta(); excluirConta('${c.id}')"><i class="fas fa-trash"></i> Excluir</button><button class="btn-primary" onclick="salvarEdicaoConta('${c.id}'); fecharModalAjusteConta();">Salvar Alterações</button></div>`;
    const m = document.getElementById('modal-ajuste-conta'); m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10);
}

window.renderMetasIndividuais = function() {
    const container = document.getElementById('lista-metas-detalhadas'); if (!container) return;
    const cartoes = (db.contas || []).filter(c => c.tipo === 'cartao');
    if (cartoes.length === 0) { container.innerHTML = '<p class="texto-vazio" style="margin-top:10px;">Nenhum cartão de crédito cadastrado.</p>'; return; }

    const hoje = new Date(); const diaHoje = hoje.getDate(); let html = '';
    cartoes.forEach(c => {
        let usoMeta = 0; let mesAtivo = hoje.getMonth() + 1; let anoAtivo = hoje.getFullYear();
        if (diaHoje >= (c.fechamento || 1)) { mesAtivo += 1; if (mesAtivo > 12) { mesAtivo = 1; anoAtivo += 1; } }
        const strMesAtivo = `${anoAtivo}-${mesAtivo.toString().padStart(2, '0')}`;

        (db.lancamentos || []).forEach(l => {
            if (l.contaId === c.id && getMesFaturaLogico(l.data, c.fechamento || 1) === strMesAtivo) {
                if (['despesas_gerais', 'despesa', 'emprestei_cartao'].includes(l.tipo)) usoMeta += l.valor; else if (T_RECEITAS.includes(l.tipo)) usoMeta -= l.valor;
            }
        });
        if (usoMeta < 0) usoMeta = 0;
        const pMeta = c.meta > 0 ? (usoMeta / c.meta) * 100 : 0; const corBarra = pMeta > 100 ? '#ef4444' : (pMeta > 80 ? '#f59e0b' : '#10b981');

        html += `<div style="margin-bottom: 15px; padding: 15px; border: 1px solid var(--linha); border-radius: 10px; background: var(--input-bg);"><div class="flex-between" style="margin-bottom: 8px;"><strong style="font-size: 14px;"><i class="fas fa-credit-card" style="color:${c.cor}; margin-right: 5px;"></i> ${c.nome}</strong><span style="font-size: 13px; font-weight: 700; color: ${corBarra};">${pMeta.toFixed(1)}%</span></div><div class="limite-texto flex-between" style="margin-bottom: 8px; font-size: 11px; color: var(--texto-sec);"><span>Consumo: <b>R$ ${fmtBR(usoMeta)}</b></span><span>Meta: <b>R$ ${fmtBR(c.meta || 0)}</b></span></div><div class="limite-bg" style="height: 6px; background: rgba(0,0,0,0.05); border-radius:3px; overflow:hidden;"><div class="limite-fill" style="height: 6px; width:${Math.min(pMeta, 100)}%; background: ${corBarra}; border-radius:3px; transition: width 0.3s ease;"></div></div></div>`;
    });
    container.innerHTML = html;
};
