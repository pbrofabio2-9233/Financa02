// ==========================================
// UI.JS - Renderização, Interface e Gráficos (v28.6 - Projeções Sincronizadas)
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
    `;
    document.head.appendChild(styleFix);
});

window.ativarEscudoFantasma = function() {
    let shield = document.getElementById('ghost-click-shield');
    if (!shield) {
        shield = document.createElement('div');
        shield.id = 'ghost-click-shield';
        shield.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999998; background:transparent; touch-action:none;';
        document.body.appendChild(shield);
    }
    shield.style.display = 'block';
    setTimeout(() => shield.style.display = 'none', 300); 
}

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
// 3. MENU SUSPENSO E LONG PRESS
// ----------------------------------------------------
let longPressTimer;
let currentLancIdCtx = null;

if (!document.getElementById('context-menu-lancamento')) {
    const menu = document.createElement('div');
    menu.id = 'context-menu-lancamento';
    menu.style.cssText = 'display:none; position:fixed; z-index:99999; background:var(--card-bg); border:1px solid var(--linha); border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.5); flex-direction:column; padding:5px; min-width:180px; overflow:hidden;';
    menu.innerHTML = `
        <button onclick="acionarAjusteCtx(event)" style="padding:12px 15px; text-align:left; background:transparent; border:none; color:var(--texto-main); width:100%; font-size:14px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:10px;"><i class="fas fa-edit" style="color:var(--azul);"></i> Ajustar Lançamento</button>
        <div style="height:1px; background:var(--linha); margin:0 5px;"></div>
        <button onclick="acionarExcluirCtx(event)" style="padding:12px 15px; text-align:left; background:transparent; border:none; color:var(--texto-main); width:100%; font-size:14px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:10px;"><i class="fas fa-trash" style="color:var(--perigo);"></i> Excluir</button>
    `;
    document.body.appendChild(menu);
}

window.fecharMenuCtx = function() {
    const menu = document.getElementById('context-menu-lancamento');
    if(menu && menu.style.display !== 'none') menu.style.display = 'none';
    clearTimeout(longPressTimer);
};

window.addEventListener('scroll', () => { fecharMenuCtx(); }, true);
document.addEventListener('click', (e) => { 
    const m = document.getElementById('context-menu-lancamento'); 
    if(m && !m.contains(e.target)) fecharMenuCtx(); 
});

window.iniciarLongPress = function(e, id) {
    longPressTimer = setTimeout(() => { 
        currentLancIdCtx = id; 
        mostrarContextMenu(e, id); 
    }, 450); 
};
window.cancelarLongPress = function() { clearTimeout(longPressTimer); };
window.mostrarContextMenuRightClick = function(e, id) { e.preventDefault(); currentLancIdCtx = id; mostrarContextMenu(e, id); };

window.mostrarContextMenu = function(e, id) {
    if ("vibrate" in navigator) navigator.vibrate(50);
    const menu = document.getElementById('context-menu-lancamento'); if(!menu) return;
    menu.style.display = 'flex';
    let x = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    let y = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    
    const rect = menu.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 10;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 10;
    
    menu.style.left = `${x}px`; menu.style.top = `${y}px`;
};

window.acionarAjusteCtx = function(e) {
    if(e) e.stopPropagation();
    if(currentLancIdCtx) {
        if (typeof window.abrirModalEdicaoLancamento === 'function') {
            window.abrirModalEdicaoLancamento(currentLancIdCtx);
        } else {
            const el = document.getElementById(`edit-lanc-${currentLancIdCtx}`);
            if(el) { 
                el.style.display = 'block'; 
                const icon = document.getElementById(`icon-${currentLancIdCtx}`); 
                if(icon) icon.classList.add('open'); 
                setTimeout(() => { const card = el.closest('.fatura-card'); if(card) card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
            }
        }
    }
    fecharMenuCtx();
};

window.acionarExcluirCtx = function(e) { 
    if(e) e.stopPropagation();
    fecharMenuCtx(); 
    if(currentLancIdCtx && typeof excluirLancamento === 'function') excluirLancamento(currentLancIdCtx); 
};

// ----------------------------------------------------
// 4. CARROSSÉIS AUTOMÁTICOS
// ----------------------------------------------------
let biInterval, radarInterval;

window.iniciarCarrosselBI = function() {
    clearInterval(biInterval);
    const slides = document.querySelectorAll('#carrossel-bi-container .carrossel-slide');
    const dots = document.querySelectorAll('.bi-dot');
    if(slides.length <= 1) return;
    let slideIndex = 0;

    biInterval = setInterval(() => {
        slides[slideIndex].classList.remove('active');
        if(dots[slideIndex]) dots[slideIndex].style.background = 'var(--linha)';
        slideIndex = (slideIndex + 1) % slides.length;
        slides[slideIndex].classList.add('active');
        if(dots[slideIndex]) dots[slideIndex].style.background = 'var(--esmeralda)';
    }, 9000); 
};

window.iniciarCarrosselRadar = function() {
    clearInterval(radarInterval);
    const slides = document.querySelectorAll('#carrossel-radar-container .radar-slide');
    if(slides.length <= 1) return;
    let slideIndex = 0;

    radarInterval = setInterval(() => {
        slides[slideIndex].classList.remove('active');
        slideIndex = (slideIndex + 1) % slides.length;
        slides[slideIndex].classList.add('active');
    }, 6000); 
};

// ----------------------------------------------------
// 5. MOTOR PRINCIPAL DE RENDERIZAÇÃO E MATEMÁTICA
// ----------------------------------------------------
window.render = function() {
    if (typeof db === 'undefined' || !db.contas) return;

    const hoje = new Date(); 
    const mesCorrente = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
    const diaHoje = hoje.getDate();
    
    let calc = { 
        receitasPagas: 0, receitasTotalMes: 0, 
        despesasPagas: 0, despesasTotalMes: 0, 
        faturas: 0, faturasFuturas: 0, 
        saldoLivre: 0, investido: 0, 
        usoMetaCartao: 0, metaTotalCartao: 0, gastosFixos: 0, gastosVariaveis: 0 
    };
    
    const catFixas = (db.categorias || []).filter(c => c.fixa).map(c => c.nome);
    let faturasFuturasMapa = {}; 

    (db.contas || []).forEach(c => { 
        if(c.tipo === 'movimentacao') calc.saldoLivre += c.saldo; 
        if(c.tipo === 'investimento') calc.investido += c.saldo; 
        if(c.tipo === 'cartao') calc.metaTotalCartao += c.meta; 
    });

    (db.lancamentos || []).forEach(l => {
        const conta = (db.contas || []).find(c => c.id === l.contaId); 
        if(!conta) return;
        
        if (conta.tipo === 'cartao') {
            const mesFatura = window.getMesFaturaLogico(l.data, conta.fechamento || 1); 
            const fatID = `${conta.id}-${mesFatura}`;
            
            if (!(db.faturasPagas || []).includes(fatID)) {
                const valMutante = T_RECEITAS.includes(l.tipo) ? -l.valor : l.valor;
                
                if (mesFatura > mesCorrente) {
                    faturasFuturasMapa[mesFatura] = (faturasFuturasMapa[mesFatura] || 0) + valMutante;
                } else {
                    calc.faturas += valMutante;
                }
            }
            
            let mesAtivoFatura = hoje.getMonth() + 1; let anoAtivoFatura = hoje.getFullYear();
            if (diaHoje >= (conta.fechamento || 1)) { mesAtivoFatura += 1; if (mesAtivoFatura > 12) { mesAtivoFatura = 1; anoAtivoFatura += 1; } }
            if (mesFatura === `${anoAtivoFatura}-${mesAtivoFatura.toString().padStart(2, '0')}`) {
                if (['despesas_gerais', 'despesa', 'emprestei_cartao'].includes(l.tipo)) calc.usoMetaCartao += l.valor;
                else if (T_RECEITAS.includes(l.tipo)) calc.usoMetaCartao -= l.valor;
            }
            if (mesFatura === mesCorrente && ['despesas_gerais', 'despesa'].includes(l.tipo)) { 
                if(catFixas.includes(l.cat)) calc.gastosFixos += l.valor; else calc.gastosVariaveis += l.valor; 
            }
        } else {
            if (l.data.substring(0,7) === mesCorrente) {
                if (T_RECEITAS.includes(l.tipo)) {
                    calc.receitasTotalMes += l.valor; 
                    if (l.efetivado) calc.receitasPagas += l.valor;
                }
                if (T_DESPESAS.includes(l.tipo) && !['emprestei_cartao', 'emp_cartao'].includes(l.tipo)) { 
                    calc.despesasTotalMes += l.valor; 
                    if (l.efetivado) {
                        calc.despesasPagas += l.valor; 
                        if(catFixas.includes(l.cat)) calc.gastosFixos += l.valor; else calc.gastosVariaveis += l.valor; 
                    }
                }
            }
        }
    });

    let mesesFuturosOrdenados = Object.keys(faturasFuturasMapa).sort();
    if (mesesFuturosOrdenados.length > 0) {
        calc.faturasFuturas = faturasFuturasMapa[mesesFuturosOrdenados[0]];
    }

    if (calc.usoMetaCartao < 0) calc.usoMetaCartao = 0;
    if (db.amortizacoesFaturas) {
        Object.keys(db.amortizacoesFaturas).forEach(fatID => {
            if (!(db.faturasPagas || []).includes(fatID)) {
                if (fatID.includes(mesCorrente)) {
                    calc.faturas -= db.amortizacoesFaturas[fatID];
                } else if (mesesFuturosOrdenados.length > 0 && fatID.includes(mesesFuturosOrdenados[0])) {
                    calc.faturasFuturas -= db.amortizacoesFaturas[fatID];
                }
            }
        });
    }

    const setTexto = (id, texto) => { const el = document.getElementById(id); if(el) el.innerText = texto; };
    
    setTexto('dash-receitas', `R$ ${fmtBR(calc.receitasPagas)}`); 
    setTexto('dash-prev-receitas', `R$ ${fmtBR(calc.receitasTotalMes)}`); 
    setTexto('dash-despesas', `R$ ${fmtBR(calc.despesasPagas)}`); 
    setTexto('dash-prev-gastos', `R$ ${fmtBR(calc.despesasTotalMes)}`);  
    setTexto('dash-faturas', `R$ ${fmtBR(calc.faturas)}`); 
    setTexto('dash-faturas-futuras', `R$ ${fmtBR(calc.faturasFuturas)}`); 
    setTexto('dash-saldo-livre', `R$ ${fmtBR(calc.saldoLivre)}`); 
    setTexto('dash-investido', `R$ ${fmtBR(calc.investido)}`);

    const saldoProjetado = calc.saldoLivre - (calc.despesasTotalMes - calc.despesasPagas) - calc.faturas + (calc.receitasTotalMes - calc.receitasPagas); 
    const projElem = document.getElementById('dash-projecao');
    if(projElem) { projElem.innerText = `R$ ${fmtBR(saldoProjetado)}`; projElem.style.color = saldoProjetado >= 0 ? 'var(--sucesso)' : 'var(--perigo)'; }

    setTexto('uso-meta-texto', `R$ ${fmtBR(calc.usoMetaCartao)} / R$ ${fmtBR(calc.metaTotalCartao)}`);
    const pMeta = calc.metaTotalCartao > 0 ? (calc.usoMetaCartao / calc.metaTotalCartao) * 100 : 0; 
    const metaBar = document.getElementById('meta-bar');
    if(metaBar) { metaBar.style.width = Math.min(pMeta, 100) + "%"; metaBar.style.background = pMeta > 100 ? '#ef4444' : (pMeta > 80 ? '#f59e0b' : '#10b981'); }
    setTexto('meta-percentual', `${pMeta.toFixed(1)}%`);

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
    const percFixo = totalGastosBI > 0 ? (calc.gastosFixos / totalGastosBI) * 100 : 0; 
    const percVar = totalGastosBI > 0 ? (calc.gastosVariaveis / totalGastosBI) * 100 : 0;
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
    
    setTimeout(() => { 
        if (typeof renderGrafico === 'function') renderGrafico(); 
        if (typeof renderGraficoEvolucao === 'function') renderGraficoEvolucao(); 
    }, 100);
}

// ----------------------------------------------------
// 6. HISTÓRICO E EXTRATOS
// ----------------------------------------------------
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
    const mesFiltro = (inputMes && inputMes.value) ? inputMes.value : `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`; 
    const statusFiltro = document.getElementById('filtro-status') ? document.getElementById('filtro-status').value : 'todos';
    const catFiltro = document.getElementById('filtro-cat') ? document.getElementById('filtro-cat').value : 'todas';
    if (inputMes && !inputMes.value) inputMes.value = mesFiltro;
    
    const limiteAtencao = new Date(); limiteAtencao.setHours(0,0,0,0); limiteAtencao.setDate(limiteAtencao.getDate() + 7);

    let lancs = (db.lancamentos || []).map(l => {
        if(!l || !l.data) return null; 
        const c = (db.contas || []).find(x => x.id === l.contaId); 
        let dtRef = new Date(l.data + 'T00:00:00'); let status = '';
        
        if (c && c.tipo === 'cartao') { 
            const mesFat = window.getMesFaturaLogico(l.data, c.fechamento || 1); 
            if ((db.faturasPagas || []).includes(`${c.id}-${mesFat}`)) status = 'pago'; 
            else if (new Date() >= new Date(`${mesFat.split('-')[0]}-${mesFat.split('-')[1]}-${(c.fechamento || 1).toString().padStart(2,'0')}T00:00:00`)) status = 'atencao'; 
            else status = 'em_aberto'; 
        } else { 
            if (l.efetivado) status = T_RECEITAS.includes(l.tipo) ? 'receita' : 'pago'; 
            else if (dtRef < new Date().setHours(0,0,0,0)) status = 'atrasado'; 
            else if (dtRef <= limiteAtencao) status = 'atencao'; 
            else status = 'em_aberto'; 
        }
        return { ...l, statusCalculado: status, contaObj: c, isReceita: T_RECEITAS.includes(l.tipo) };
    }).filter(l => l !== null && l.data.substring(0,7) === mesFiltro && (statusFiltro === 'todos' || l.statusCalculado === statusFiltro) && (catFiltro === 'todas' || l.cat === catFiltro))
      .sort((a, b) => new Date(b.data) - new Date(a.data) || b.id - a.id);
    
    if(lancs.length === 0) { lista.innerHTML = "<div class='card texto-vazio'>Nenhum registro encontrado.</div>"; return; }

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
        <div class="card fatura-card ${!l.efetivado ? 'opacity-90' : ''}" style="padding:0; overflow:hidden; border:1px solid var(--linha); border-left: 4px solid ${c ? c.cor : '#ccc'}; margin-bottom: 12px;">
            <div style="padding:15px; cursor:context-menu; user-select:none;" oncontextmenu="mostrarContextMenuRightClick(event, ${l.id})" onmousedown="iniciarLongPress(event, ${l.id})" onmouseup="cancelarLongPress()" onmouseleave="cancelarLongPress()" ontouchstart="iniciarLongPress(event, ${l.id})" ontouchend="cancelarLongPress()" ontouchmove="cancelarLongPress(); fecharMenuCtx();">
                <div class="flex-between" style="margin-bottom: 8px; gap: 8px;"><strong style="font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${l.desc || 'Sem descrição'}</strong>${chipHtml}</div>
                <div class="flex-between" style="align-items: center; gap: 10px;">
                    <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-width:0;">
                        <small style="color:var(--texto-sec); font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${(l.data || '').split('-').reverse().join('/')} • ${c?c.nome:'Excluída'}
                        </small>
                        <span style="font-size:11px; font-weight:600; color:var(--texto-sec); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${catDB&&catDB.icone?catDB.icone+' ':''}${l.cat || 'Outros'}
                        </span>
                        ${(!l.efetivado && c && c.tipo !== 'cartao') ? `<div style="display:flex; gap:6px; margin-top:4px;"><button class="btn-primary" style="padding:6px 10px; font-size:10px; width:auto;" onclick="event.stopPropagation(); ${l.rolagem ? `confirmarQuitacao(${l.id})` : `confirmarPagamento(${l.id})`}">${l.rolagem ? 'Quitar' : (l.isReceita ? 'Receber' : 'Pagar')}</button>${l.rolagem ? `<button class="btn-outline" style="padding:6px 10px; font-size:10px; width:auto;" onclick="event.stopPropagation(); abrirModalParcial(${l.id}, ${l.valor})">Parcial</button>` : ''}</div>` : ''}
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; flex-shrink: 0;">
                        <strong style="color: ${T_DESPESAS.includes(l.tipo) ? 'var(--perigo)' : 'var(--sucesso)'}; font-size:16px; white-space: nowrap; flex-shrink: 0;">
                            ${l.isReceita ? '+' : '-'} R$ ${fmtBR(l.valor || 0)}
                        </strong>
                        <i class="fas fa-chevron-down fatura-chevron" id="icon-${l.id}" style="font-size:11px; color:var(--texto-sec); opacity:0.3; flex-shrink:0;"></i>
                    </div>
                </div>
            </div>
            <div id="edit-lanc-${l.id}" style="display:none; padding:15px; border-top:1px dashed var(--linha); background:var(--input-bg);" onclick="event.stopPropagation()">
                <label class="label-moderno">Editar Descrição</label><input type="text" id="e-lanc-desc-${l.id}" class="input-moderno mb-10" value="${l.desc || ''}">
                <label class="label-moderno">Conta Origem/Destino</label><select id="e-lanc-conta-${l.id}" class="input-moderno mb-10">${accOpts}</select>
                <label class="label-moderno">Categoria</label><select id="e-lanc-cat-${l.id}" class="input-moderno mb-10">${catOpts}</select>
                <div class="grid-inputs mb-10"><div><label class="label-moderno">Data</label><input type="date" id="e-lanc-data-${l.id}" class="input-moderno" value="${l.data || ''}"></div><div><label class="label-moderno">Valor (R$)</label><input type="text" inputmode="numeric" id="e-lanc-val-${l.id}" class="input-moderno" value="${(l.valor || 0).toFixed(2).replace('.', ',')}" oninput="mascaraMoeda(event)"></div></div>
                <div class="flex-between mt-10" style="gap:8px;">
                    <button class="btn-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--perigo); border-radius: 10px; width: 42px; height: 42px;" onclick="excluirLancamento(${l.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                    <button class="btn-outline" style="flex: 1; padding: 12px; font-size: 13px; border-radius: 10px;" onclick="toggleEditLancamento(${l.id})">Cancelar</button>
                    <button class="btn-primary" style="flex: 1; padding: 12px; font-size: 13px; border-radius: 10px;" onclick="salvarEdicaoLancamento(${l.id})">Salvar</button>
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
        const icon = document.getElementById(`icon-${id}`); 
        if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; 
        if(icon) icon.classList.toggle('open'); 
    }
}

// ----------------------------------------------------
// 7. ABAS SECUNDÁRIAS (Contas, Faturas, Radares)
// ----------------------------------------------------
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
                if (l.contaId === c.id) { 
                    const mesLancLogico = window.getMesFaturaLogico(l.data, c.fechamento || 1); 
                    const isPaga = (db.faturasPagas || []).includes(`${c.id}-${mesLancLogico}`); 
                    let valorCalc = 0; 
                    if (T_DESPESAS_CARTAO.includes(l.tipo)) valorCalc = l.valor; else if (T_RECEITAS.includes(l.tipo)) valorCalc = -l.valor; 
                    if (valorCalc !== 0) { if (mesLancLogico === strMesAtivo) usoMeta += valorCalc; if (!isPaga) usoLimite += valorCalc; } 
                }
            });
            Object.keys(db.amortizacoesFaturas || {}).forEach(fatID => { if (fatID.split('-')[0] === c.id && !(db.faturasPagas || []).includes(fatID)) usoLimite -= db.amortizacoesFaturas[fatID]; });
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
    
    if(cartoes.length === 0) { 
        abas.innerHTML = ""; 
        lista.innerHTML = "<div class='card texto-vazio'>Nenhum cartão cadastrado.</div>"; 
        return; 
    }
    
    if(!window.cartaoAtivoFatura && cartoes.length > 0) window.cartaoAtivoFatura = cartoes[0].id;
    
    abas.innerHTML = `<div class="segmented-control">` + 
        cartoes.map(c => `<button class="segmented-btn ${c.id === window.cartaoAtivoFatura ? 'active' : ''}" onclick="window.cartaoAtivoFatura='${c.id}'; renderAbaFaturas();">${c.nome}</button>`).join('') + 
        `</div>`;
    
    const c = cartoes.find(x => x.id === window.cartaoAtivoFatura); 
    if(!c) return; 

    let mesesFatura = {};
    (db.lancamentos || []).forEach(l => { 
        if(l.contaId !== c.id) return; 
        const mesFat = window.getMesFaturaLogico(l.data, c.fechamento || 1); 
        if(!mesesFatura[mesFat]) mesesFatura[mesFat] = { total: 0, lancamentos: [] }; 
        mesesFatura[mesFat].total += T_RECEITAS.includes(l.tipo) ? -l.valor : l.valor; 
        mesesFatura[mesFat].lancamentos.push(l); 
    });

    const mesesOrdenados = Object.keys(mesesFatura).sort((a,b) => new Date(b+'-01') - new Date(a+'-01')); 
    if(mesesOrdenados.length === 0) { 
        lista.innerHTML = "<div class='card texto-vazio'>Sem faturas registradas.</div>"; 
        return; 
    }

    lista.innerHTML = mesesOrdenados.map(mes => {
        const fatID = `${c.id}-${mes}`; const estaPaga = (db.faturasPagas || []).includes(fatID); 
        const jaAmortizado = (db.amortizacoesFaturas && db.amortizacoesFaturas[fatID]) || 0; 
        const totalFinal = mesesFatura[mes].total - jaAmortizado;
        let statusTag = estaPaga ? '<span class="status-badge" style="background:var(--sucesso); color:#fff; font-size:9px; padding:3px 8px; border-radius:6px; font-weight:800;">PAGO</span>' : (new Date() >= new Date(`${mes.split('-')[0]}-${mes.split('-')[1]}-${(c.fechamento || 1).toString().padStart(2, '0')}T00:00:00`) ? '<span class="status-badge" style="background:var(--alerta); color:#fff; font-size:9px; padding:3px 8px; border-radius:6px; font-weight:800;">FECHADA</span>' : '<span class="status-badge" style="background:var(--azul); color:#fff; font-size:9px; padding:3px 8px; border-radius:6px; font-weight:800;">EM ABERTO</span>');

        return `
        <div class="card fatura-card ${estaPaga ? 'paga' : ''}" style="padding:0; overflow:hidden; border:1px solid ${estaPaga?'var(--sucesso)':'var(--linha)'}; margin-bottom: 12px;">
            <div style="padding:15px; cursor:pointer; background:${estaPaga?'rgba(16,185,129,0.05)':'var(--card-bg)'};" onclick="toggleEditLancamento('det-fat-${fatID}')">
                <div class="flex-between" style="margin-bottom: 8px;"><strong style="font-size:14px;"><i class="fas fa-file-invoice-dollar" style="color:var(--texto-sec);"></i> Fatura ${window.formatarMesFaturaLogico(mes)}</strong>${statusTag}</div>
                <div class="flex-between" style="align-items: center;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <small style="color:var(--texto-sec); font-size:11px;">Venc: ${(c.vencimento||1).toString().padStart(2,'0')}/${mes.split('-')[1]}</small>
                        <div style="display:flex; align-items:center; gap:8px;"><strong class="${estaPaga?'txt-sucesso':'txt-perigo'}" style="font-size:16px;">R$ ${fmtBR(totalFinal)}</strong><i class="fas fa-chevron-down fatura-chevron" id="icon-det-fat-${fatID}" style="font-size:11px; color:var(--texto-sec);"></i></div>
                    </div>
                    <div style="display:flex; gap:6px;">
                        ${!estaPaga && totalFinal > 0 ? `<button class="btn-outline" style="padding:6px 10px; font-size:10px; width:auto;" onclick="event.stopPropagation(); amortizarFatura('${fatID}')">Amortizar</button>` : ''}
                        <button class="${estaPaga?'btn-outline':'btn-primary'}" style="padding:6px 10px; font-size:10px; width:auto;" onclick="event.stopPropagation(); alternarPagamentoFatura('${fatID}', ${totalFinal})">${estaPaga?'Reabrir':'Pagar'}</button>
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
    
    const tituloRadar = document.querySelector('#carrossel-radar-container').previousElementSibling;
    if (tituloRadar) tituloRadar.innerHTML = '<i class="fas fa-bell"></i> Radar de Vencimentos (7 dias)';

    const hoje = new Date(); hoje.setHours(0,0,0,0); 
    const limite7 = new Date(hoje); limite7.setDate(hoje.getDate() + 7);
    let alertas = [];

    (db.lancamentos || []).forEach(l => {
        const conta = (db.contas || []).find(c => c.id === l.contaId); if (conta && conta.tipo === 'cartao') return; 
        const d = new Date(l.data + 'T00:00:00');
        if (!l.efetivado && T_DESPESAS.includes(l.tipo) && d <= limite7) {
            const dias = Math.ceil((d - hoje) / 86400000);
            alertas.push({ dataOrd: d, html: `<div class="carrossel-slide radar-slide ${alertas.length===0?'active':''}"><div class="flex-between" style="padding-bottom:5px;"><div><strong style="font-size:14px;">${l.desc}</strong><small style="display:block; color: ${dias < 0 ? 'var(--perigo)' : 'var(--alerta)'}; font-weight:600;">${dias < 0 ? 'Atrasado' : (dias===0?'Vence HOJE':`Vence em ${dias} dia(s)`)}</small></div><b class="txt-perigo val-nowrap-mobile">R$ ${fmtBR(l.valor)}</b></div></div>` });
        }
    });

    (db.contas || []).filter(c => c.tipo === 'cartao').forEach(c => {
        let meses = {};
        (db.lancamentos || []).forEach(l => { if(l.contaId === c.id) { const m = window.getMesFaturaLogico(l.data, c.fechamento || 1); meses[m] = (meses[m]||0) + (T_RECEITAS.includes(l.tipo) ? -l.valor : l.valor); } });
        Object.keys(meses).forEach(m => {
            const fatID = `${c.id}-${m}`; if ((db.faturasPagas || []).includes(fatID)) return;
            const t = meses[m] - ((db.amortizacoesFaturas && db.amortizacoesFaturas[fatID]) || 0); if (t <= 0) return;
            let [a, ms] = m.split('-'); if ((c.vencimento||1) < (c.fechamento||1)) { ms = parseInt(ms)+1; if(ms>12){ms=1;a=parseInt(a)+1;} }
            const dv = new Date(a, ms-1, c.vencimento||1); dv.setHours(0,0,0,0);
            if (dv <= limite7) { const dias = Math.ceil((dv - hoje) / 86400000); alertas.push({ dataOrd: dv, html: `<div class="carrossel-slide radar-slide ${alertas.length===0?'active':''}"><div class="flex-between" style="padding-bottom:5px;"><div><strong style="font-size:14px;"><i class="fas fa-credit-card"></i> ${c.nome}</strong><small style="display:block; color: ${dias < 0 ? 'var(--perigo)' : 'var(--alerta)'}; font-weight:600;">${dias < 0 ? 'Fatura Atrasada' : (dias===0?'Vence HOJE':`Fatura em ${dias} dia(s)`)}</small></div><b class="txt-perigo val-nowrap-mobile">R$ ${fmtBR(t)}</b></div></div>` }); }
        });
    });

    alertas.sort((a, b) => a.dataOrd - b.dataOrd); 
    lista.innerHTML = alertas.length ? alertas.map(a => a.html).join('') : '<p class="texto-vazio" style="padding: 10px;">Tudo tranquilo por aqui.</p>';
    window.iniciarCarrosselRadar();
}

// ----------------------------------------------------
// 8. MOTOR DE CONTRATOS, PARCELAMENTOS E SALÁRIOS
// ----------------------------------------------------

window.salvarNovoSalarioAbsoluto = function() {
    const nomeEl = document.getElementById('sal-nome');
    const valorEl = document.getElementById('sal-valor');
    const freqEl = document.getElementById('sal-freq');
    const contaEl = document.getElementById('sal-conta');
    
    const nome = nomeEl ? nomeEl.value.trim() : '';
    const valStr = valorEl ? valorEl.value : '0';
    const frequencia = freqEl ? freqEl.value : 'mensal';
    const contaId = contaEl ? contaEl.value : '';
    
    let valorTotal = 0;
    const limpo = valStr.replace(/[^\d.,]/g, '');
    if (limpo.includes(',') && limpo.indexOf(',') > limpo.lastIndexOf('.')) {
        valorTotal = parseFloat(limpo.replace(/\./g, '').replace(',', '.')); 
    } else if (limpo.includes(',')) {
        valorTotal = parseFloat(limpo.replace(',', '.')); 
    } else {
        valorTotal = parseFloat(limpo || 0); 
    }

    const diasSelecionados = [];
    const containerDias = document.getElementById('sal-dias-container');
    if (containerDias) {
        containerDias.querySelectorAll('input').forEach(el => {
            if (el.type === 'checkbox') {
                if (el.checked) diasSelecionados.push(parseInt(el.value));
            } else if (el.value && el.value.trim() !== '') {
                diasSelecionados.push(parseInt(el.value));
            }
        });
    }
    
    if (!nome || valorTotal <= 0 || diasSelecionados.length === 0) {
        alert("Preencha o nome, valor e informe pelo menos um dia de recebimento.");
        return;
    }

    if (!db.salarios) db.salarios = [];
    
    db.salarios.push({
        id: Date.now() + Math.floor(Math.random() * 1000), 
        nome: nome,
        valorTotal: valorTotal,
        frequencia: frequencia,
        dias: diasSelecionados,
        contaId: contaId
    });

    if (typeof save === 'function') save();
    if (typeof showToast === 'function') showToast("Novo rendimento criado!", "sucesso");
    
    toggleFormNovoSalario(); 
    renderListaSalarios();
};

window.toggleFormNovoSalario = function() {
    const f = document.getElementById('form-novo-salario');
    if(f) f.style.display = f.style.display === 'none' ? 'block' : 'none';
    
    const btnSalvar = document.querySelector('#form-novo-salario .btn-primary, #form-novo-salario button.btn-salvar');
    if (btnSalvar) {
        btnSalvar.innerText = "Salvar Rendimento";
        btnSalvar.onclick = function(e) { 
            e.preventDefault();
            salvarNovoSalarioAbsoluto(); 
        };
    }
    
    if (document.getElementById('sal-nome')) document.getElementById('sal-nome').value = '';
    if (document.getElementById('sal-valor')) document.getElementById('sal-valor').value = '';
    
    const containerDias = document.getElementById('sal-dias-container');
    if(containerDias) {
        containerDias.querySelectorAll('input').forEach(input => {
            if(input.type === 'checkbox') input.checked = false;
            else input.value = '';
        });
    }
};

window.abrirEdicaoSalario = function(id) {
    if (!db || !db.salarios) return;
    const sal = db.salarios.find(s => s.id == id);
    if (!sal) return;
    
    if (document.getElementById('sal-nome')) document.getElementById('sal-nome').value = sal.nome;
    if (document.getElementById('sal-valor')) document.getElementById('sal-valor').value = parseFloat(sal.valorTotal || 0).toFixed(2).replace('.', ',');
    if (document.getElementById('sal-freq')) document.getElementById('sal-freq').value = sal.frequencia;
    if (document.getElementById('sal-conta')) document.getElementById('sal-conta').value = sal.contaId;
    
    if (typeof atualizarDiasSalario === 'function') {
        atualizarDiasSalario(); 
        setTimeout(() => {
            const inputs = document.querySelectorAll('#sal-dias-container input');
            inputs.forEach(input => {
                if(input.type === 'checkbox') input.checked = false;
                else input.value = '';
            });
            
            sal.dias.forEach((d, index) => {
                let cb = document.getElementById(`sal-dia-${d}`);
                if (cb && cb.type === 'checkbox') cb.checked = true;
                else if (inputs[index] && (inputs[index].type === 'number' || inputs[index].type === 'text')) {
                    inputs[index].value = d;
                }
            });
            if (typeof calcularResumoSalario === 'function') calcularResumoSalario();
        }, 100);
    }
    
    const form = document.getElementById('form-novo-salario');
    if (form) form.style.display = 'block';
    
    const btnSalvar = document.querySelector('#form-novo-salario .btn-primary, #form-novo-salario button.btn-salvar');
    if (btnSalvar) {
        btnSalvar.innerText = "Salvar Alterações";
        btnSalvar.onclick = function(e) {
            e.preventDefault();
            salvarEdicaoSalarioAcao(id);
        };
    }
};

window.salvarEdicaoSalarioAcao = function(id) {
    const nomeEl = document.getElementById('sal-nome');
    const valorEl = document.getElementById('sal-valor');
    const freqEl = document.getElementById('sal-freq');
    const contaEl = document.getElementById('sal-conta');
    
    const nome = nomeEl ? nomeEl.value.trim() : '';
    const valStr = valorEl ? valorEl.value : '0';
    const frequencia = freqEl ? freqEl.value : 'mensal';
    const contaId = contaEl ? contaEl.value : '';
    
    let valorTotal = 0;
    const limpo = valStr.replace(/[^\d.,]/g, '');
    if (limpo.includes(',') && limpo.indexOf(',') > limpo.lastIndexOf('.')) {
        valorTotal = parseFloat(limpo.replace(/\./g, '').replace(',', '.')); 
    } else if (limpo.includes(',')) {
        valorTotal = parseFloat(limpo.replace(',', '.')); 
    } else {
        valorTotal = parseFloat(limpo || 0); 
    }
    
    const diasSelecionados = [];
    const containerDias = document.getElementById('sal-dias-container');
    if (containerDias) {
        containerDias.querySelectorAll('input').forEach(el => {
            if (el.type === 'checkbox') {
                if (el.checked) diasSelecionados.push(parseInt(el.value));
            } else if (el.value && el.value.trim() !== '') {
                diasSelecionados.push(parseInt(el.value));
            }
        });
    }
    
    if (!nome || valorTotal <= 0 || diasSelecionados.length === 0) {
        alert("Preencha o nome, valor e informe pelo menos um dia de recebimento.");
        return;
    }
    
    let sal = db.salarios.find(s => s.id == id);
    if (sal) {
        sal.nome = nome;
        sal.valorTotal = valorTotal;
        sal.frequencia = frequencia;
        sal.dias = diasSelecionados;
        sal.contaId = contaId;
        
        if (typeof save === 'function') save();
        if (typeof showToast === 'function') showToast("Rendimento atualizado!", "sucesso");
        
        toggleFormNovoSalario(); 
        renderListaSalarios();
    }
};

window.renderListaSalarios = function() {
    const lista = document.getElementById('lista-salarios-cadastrados'); if(!lista) return;
    if(!db.salarios || db.salarios.length === 0) { lista.innerHTML = '<p class="texto-vazio" style="font-size:12px; margin-top:10px;">Nenhuma renda automática cadastrada.</p>'; return; }
    lista.innerHTML = db.salarios.map(sal => `<div class="salario-card" style="background: var(--card-bg); border: 1px solid var(--linha); border-radius: 10px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;"><div><strong style="font-size: 14px; color: var(--texto-main); display:block; margin-bottom:4px;">${sal.nome}</strong><small style="color: var(--texto-sec); font-size: 11px; line-height:1.4; display:block;"><i class="fas fa-calendar-alt"></i> ${sal.frequencia.charAt(0).toUpperCase() + sal.frequencia.slice(1)} • Dias: ${sal.dias.join(', ')}<br><i class="fas fa-university"></i> Destino: ${((db.contas || []).find(c => c.id === sal.contaId)||{}).nome || 'Excluída'}</small></div><div style="text-align: right;"><strong class="txt-esmeralda" style="font-size: 16px; display:block; margin-bottom:8px;">R$ ${fmtBR(sal.valorTotal)}</strong><div style="display: flex; gap: 8px; justify-content: flex-end;"><button class="btn-icon" style="color: var(--azul); background: rgba(59,130,246,0.1); padding: 6px 10px; border-radius: 6px;" onclick="abrirEdicaoSalario(${sal.id})"><i class="fas fa-edit"></i></button><button class="btn-icon" style="color: var(--perigo); background: rgba(239,68,68,0.1); padding: 6px 10px; border-radius: 6px;" onclick="excluirSalario(${sal.id})"><i class="fas fa-trash"></i></button></div></div></div>`).join('');
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
        const catObj = catSafe.find(c => c.nome === (item.categoria||item.cat) || c.id === (item.categoria||item.cat)) || { icone: isParc?'📦':'📌', nome: item.categoria||'Outros' };
        const contaObj = conSafe.find(c => c.id === (item.contaId || item.conta)) || { nome: 'Conta Excluída', cor: '#ccc' };
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
                    <button onclick="abrirModalEdicaoContrato('${item.id}')" style="background:rgba(59, 130, 246, 0.1); color:var(--azul); border:none; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size:14px; cursor:pointer;" title="Editar"><i class="fas fa-edit"></i></button>
                    <button onclick="if(typeof excluirContrato === 'function') { excluirContrato('${item.id}'); } else if(typeof excluirLancamento === 'function') { excluirLancamento('${item.id}'); }" style="background:rgba(239, 68, 68, 0.1); color:var(--perigo); border:none; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size:14px; cursor:pointer;" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    };

    containerFixa.innerHTML = listaFixa.length > 0 ? listaFixa.map(i => gerarCard(i, false)).join('') : '<p style="text-align:center; padding: 20px; color: var(--texto-sec); font-size: 13px;">Nenhuma conta fixa ativa.</p>';
    containerParc.innerHTML = listaParc.length > 0 ? listaParc.map(i => gerarCard(i, true)).join('') : '<p style="text-align:center; padding: 20px; color: var(--texto-sec); font-size: 13px;">Nenhum parcelamento em andamento.</p>';
};

window.abrirModalEdicaoContrato = function(id) {
    let item = null;
    let tipoItem = '';

    item = (db.contratos || []).find(c => String(c.id) === String(id));
    if (item) {
        tipoItem = 'contrato';
        item.cat = item.categoria; 
    } else {
        item = (db.recorrencias || []).find(r => String(r.id) === String(id));
        if (item) {
            tipoItem = 'recorrencia';
            item.dia = item.diaVencimento; 
        } else {
            let pendentes = (db.lancamentos || []).filter(l => String(l.idGrupo) === String(id) && !l.efetivado);
            if (pendentes.length > 0) {
                item = {
                    id: id,
                    desc: pendentes[0].desc.split(' (')[0],
                    valor: pendentes[0].valor,
                    dia: parseInt(pendentes[0].data.split('-')[2], 10),
                    cat: pendentes[0].cat || pendentes[0].categoria,
                    contaId: pendentes[0].contaId
                };
                tipoItem = 'parcelamento';
            }
        }
    }

    if (!item) {
        alert("Registro não encontrado!");
        return;
    }

    const catOpts = (db.categorias || []).filter(c => c.tipo === 'despesa')
        .map(c => `<option value="${c.nome}" ${item.cat === c.nome || item.categoria === c.nome ? 'selected' : ''}>${c.icone || ''} ${c.nome}</option>`).join('');
    
    const contaOpts = (db.contas || [])
        .map(c => `<option value="${c.id}" ${item.contaId == c.id || item.conta == c.id ? 'selected' : ''}>${c.nome}</option>`).join('');

    const html = `
        <div style="background: rgba(59, 130, 246, 0.1); padding: 10px; border-radius: 8px; border-left: 3px solid var(--azul); font-size: 11px; color: var(--texto-sec); margin-bottom: 15px;">
            <strong>Aviso:</strong> A alteração será aplicada em todos os lançamentos futuros pendentes na tela inicial (Extrato).
        </div>
        <div class="mb-10">
            <label class="label-moderno">Descrição</label>
            <input type="text" id="edit-contrato-desc" class="input-moderno" value="${item.desc || ''}">
        </div>
        <div class="grid-inputs mb-10">
            <div>
                <label class="label-moderno">Valor (R$)</label>
                <input type="text" inputmode="numeric" id="edit-contrato-valor" class="input-moderno" value="${parseFloat(item.valor || 0).toFixed(2).replace('.', ',')}" oninput="mascaraMoeda(event)">
            </div>
            <div>
                <label class="label-moderno">Dia Vencimento</label>
                <input type="number" id="edit-contrato-dia" class="input-moderno" min="1" max="31" value="${item.dia || ''}">
            </div>
        </div>
        <div class="grid-inputs mb-15">
            <div>
                <label class="label-moderno">Categoria</label>
                <select id="edit-contrato-cat" class="input-moderno">${catOpts}</select>
            </div>
            <div>
                <label class="label-moderno">Conta Base</label>
                <select id="edit-contrato-conta" class="input-moderno">${contaOpts}</select>
            </div>
        </div>
        <div class="flex-between">
            <button class="btn-outline" onclick="fecharModalEdicaoContrato()">Cancelar</button>
            <button class="btn-primary" onclick="salvarEdicaoContrato('${id}', '${tipoItem}')">Salvar Alterações</button>
        </div>
    `;
    const formContainer = document.getElementById('form-edicao-contrato');
    if(formContainer) formContainer.innerHTML = html;
    
    const m = document.getElementById('modal-edicao-contrato');
    if(m) {
        m.style.display = 'flex';
        setTimeout(() => m.classList.add('active'), 10);
    }
};

window.salvarEdicaoContrato = function(id, tipoItem) {
    const desc = document.getElementById('edit-contrato-desc').value.trim();
    const valStr = document.getElementById('edit-contrato-valor').value;
    const valor = parseFloat(valStr.replace(/\./g, '').replace(',', '.')) || 0;
    const dia = parseInt(document.getElementById('edit-contrato-dia').value) || 1;
    const cat = document.getElementById('edit-contrato-cat').value;
    const contaId = document.getElementById('edit-contrato-conta').value;

    if (!desc || valor <= 0) {
        alert("Preencha descrição e valor corretamente.");
        return;
    }

    let alterou = false;

    // Atualizador de Lançamentos Pendentes
    const atualizarPendentes = (filtroCondicao) => {
        let pendentes = (db.lancamentos || []).filter(l => filtroCondicao(l) && !l.efetivado);
        pendentes.forEach(p => {
            let match = (p.desc||'').match(/\(\d+\/\d+\)/); // Se for parcelamento, mantém o "x/y"
            p.desc = desc + (match ? ` ${match[0]}` : '');
            p.valor = valor;
            p.cat = cat; p.categoria = cat;
            p.contaId = contaId;
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
        if (rec) {
            rec.desc = desc; rec.valor = valor; rec.diaVencimento = dia; rec.cat = cat; rec.contaId = contaId;
            atualizarPendentes((l) => String(l.idRecorrencia) === String(id));
            alterou = true;
        }
    } else if (tipoItem === 'contrato') {
        let ctr = db.contratos.find(c => String(c.id) === String(id));
        if (ctr) {
            ctr.desc = desc; ctr.valor = valor; ctr.dia = dia; ctr.categoria = cat; ctr.contaId = contaId; ctr.conta = contaId;
            atualizarPendentes((l) => String(l.idGrupo) === String(id) || String(l.idRecorrencia) === String(id));
            alterou = true;
        }
    } else if (tipoItem === 'parcelamento') {
        atualizarPendentes((l) => String(l.idGrupo) === String(id));
        alterou = true;
    }

    if (alterou) {
        if (typeof save === 'function') save();
        if (typeof fecharModalEdicaoContrato === 'function') fecharModalEdicaoContrato();
        if (typeof renderListaContratos === 'function') renderListaContratos();
        if (typeof render === 'function') render();
        if (typeof showToast === 'function') showToast("Registro atualizado!", "sucesso");
    } else {
        alert("Erro ao salvar: Registro não localizado no banco de dados.");
    }
};

// ----------------------------------------------------
// 9. MODAIS DE CATEGORIA E AJUSTES DE CONTA
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
        
        const gerarCardHTML = (c) => `<div class="salario-card" style="border-left: 4px solid ${c.cor}; border-color: ${c.cor}; background: var(--input-bg); padding: 12px; margin:0; display: flex; flex-direction: column; align-items: flex-start; position: relative; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);"><div style="position: absolute; top: -15px; right: -15px; width: 50px; height: 50px; background: ${c.cor}; opacity: 0.08; border-radius: 50%;"></div><div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 10px; align-items: center;"><div style="width: 32px; height: 32px; border-radius: 8px; background: ${c.cor}20; color: ${c.cor}; display: flex; align-items: center; justify-content: center; font-size: 16px;">${c.icone || '📁'}</div><div style="display: flex; gap: 4px; z-index: 2;"><button class="btn-icon" style="color: var(--azul); background: rgba(59,130,246,0.1); padding: 5px; border-radius: 6px; font-size: 11px;" onclick="editarCategoria('${c.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon" style="color: var(--perigo); background: rgba(239,68,68,0.1); padding: 5px; border-radius: 6px; font-size: 11px;" onclick="excluirCategoria('${c.id}')"><i class="fas fa-trash"></i></button></div></div><strong style="font-size: 13px; color: var(--texto-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; z-index: 2;">${c.nome}</strong><small style="color: var(--texto-sec); font-size: 10px; margin-top: 4px; z-index: 2; display: flex; align-items: center; gap: 4px;">${c.fixa ? `<i class="fas fa-lock" style="color:${c.cor};"></i> Fixo` : `<i class="fas fa-random" style="color:var(--texto-sec);"></i> Variável`}</small></div>`;
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
    const container = document.getElementById('lista-metas-detalhadas');
    if (!container) return;

    if (typeof db === 'undefined' || !db.contas) return;

    const cartoes = db.contas.filter(c => c.tipo === 'cartao' && parseFloat(c.meta || 0) > 0);

    if (cartoes.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 20px; color: var(--texto-sec);">
                <i class="fas fa-info-circle" style="font-size: 24px; margin-bottom: 10px; display:block;"></i>
                <p style="font-size:13px;">Nenhum cartão possui meta de gastos definida.</p>
                <small style="font-size:11px;">Configure isso editando o cartão na aba Contas.</small>
            </div>`;
        return;
    }

    let html = '';
    const hoje = new Date(); const diaHoje = hoje.getDate();
    
    cartoes.forEach(c => {
        let usoMeta = 0; let mesAtivo = hoje.getMonth() + 1; let anoAtivo = hoje.getFullYear();
        if (diaHoje >= (c.fechamento || 1)) { mesAtivo += 1; if (mesAtivo > 12) { mesAtivo = 1; anoAtivo += 1; } }
        const strMesAtivo = `${anoAtivo}-${mesAtivo.toString().padStart(2, '0')}`;

        (db.lancamentos || []).forEach(l => {
            if (l.contaId === c.id && window.getMesFaturaLogico(l.data, c.fechamento || 1) === strMesAtivo) {
                if (['despesas_gerais', 'despesa', 'emprestei_cartao'].includes(l.tipo)) usoMeta += l.valor; 
                else if (T_RECEITAS.includes(l.tipo)) usoMeta -= l.valor;
            }
        });
        
        if (usoMeta < 0) usoMeta = 0;
        const metaVal = parseFloat(c.meta) || 0;
        
        const percent = metaVal > 0 ? Math.min((usoMeta / metaVal) * 100, 100).toFixed(1) : 0;
        const percentReal = metaVal > 0 ? ((usoMeta / metaVal) * 100).toFixed(1) : 0;

        let corBarra = 'var(--esmeralda)';
        if (percentReal >= 80) corBarra = 'var(--alerta)';
        if (percentReal >= 100) corBarra = 'var(--perigo)';

        html += `
            <div style="background: var(--input-bg); padding: 15px; border-radius: 12px; margin-bottom: 12px; border: 1px solid var(--linha);">
                <div class="flex-between mb-10">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:12px; height:12px; border-radius:3px; background:${c.cor || 'var(--azul)'}"></div>
                        <strong style="font-size: 14px; color: var(--texto-main);">${c.nome}</strong>
                    </div>
                    <span style="font-size: 12px; font-weight: 800; color: ${percentReal >= 100 ? 'var(--perigo)' : 'var(--texto-sec)'};">
                        ${percentReal}%
                    </span>
                </div>
                
                <div class="progress-bg" style="height: 8px; background: var(--linha); border-radius: 10px; overflow: hidden; margin-bottom: 8px;">
                    <div style="width: ${percent}%; height: 100%; background: ${corBarra}; transition: width 0.5s ease;"></div>
                </div>

                <div class="flex-between" style="font-size: 11px; color: var(--texto-sec);">
                    <span>Gasto: <b>R$ ${fmtBR(usoMeta)}</b></span>
                    <span>Meta: R$ ${fmtBR(metaVal)}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
};

// ----------------------------------------------------
// 10. NAVEGAÇÃO E TÍTULOS DINÂMICOS
// ----------------------------------------------------
const navOriginal = window.navegar;
window.navegar = function(idSecao, elemento) {
    if(navOriginal) navOriginal(idSecao, elemento);
    
    const titulos = { 'dashboard':'Visão Geral', 'faturas':'Faturas', 'historico':'Extrato Financeiro', 'contas':'Minhas Contas', 'config':'Ajustes do App' };
    const h1 = document.getElementById('titulo-aba');
    if(h1 && titulos[idSecao]) h1.innerText = titulos[idSecao];
};

// ----------------------------------------------------
// 11. JANELA DE PAGAMENTO DE FATURA E CONTRATOS
// ----------------------------------------------------
window.abrirModalPagamentoFatura = function(fatID, valor) {
    document.getElementById('hidden-pagar-fat-id').value = fatID;
    document.getElementById('hidden-pagar-fat-val').value = valor;
    document.getElementById('txt-pagar-fat-valor').innerText = 'R$ ' + window.fmtBR(valor);

    const selectConta = document.getElementById('select-conta-pagar-fat');
    if(selectConta) {
        selectConta.innerHTML = '';
        (db.contas || []).filter(c => c.tipo !== 'cartao').forEach(c => {
            selectConta.options.add(new Option(`${c.nome} (Saldo: R$ ${window.fmtBR(c.saldo)})`, c.id));
        });
    }

    const m = document.getElementById('modal-pagar-fatura');
    if(m) {
        m.style.display = 'flex';
        setTimeout(() => m.classList.add('active'), 10);
    } else {
        alert("O visual da janela de pagamento não foi encontrado no HTML.");
    }
};

window.fecharModalPagamentoFatura = function() {
    const m = document.getElementById('modal-pagar-fatura');
    if(m) {
        m.classList.remove('active');
        setTimeout(() => m.style.display = 'none', 300);
    }
};

window.alternarPagamentoFatura = function(fatID, valorPassadoPelaTela) {
    const estaPaga = (db.faturasPagas || []).includes(fatID);
    
    if(estaPaga) {
        if(typeof abrirConfirmacao === 'function') {
            abrirConfirmacao("Deseja reabrir esta fatura? (O dinheiro NÃO será devolvido à conta bancária)", () => {
                const i = db.faturasPagas.indexOf(fatID);
                db.faturasPagas.splice(i,1);
                save();
                showToast("Fatura reaberta!", "ajuste");
                if(typeof render === 'function') render();
            });
        }
        return;
    }

    if (valorPassadoPelaTela > 0) {
        window.abrirModalPagamentoFatura(fatID, valorPassadoPelaTela);
    } else {
        if (!db.faturasPagas) db.faturasPagas = [];
        db.faturasPagas.push(fatID);
        save();
        showToast("Fatura encerrada com sucesso!", "sucesso");
        if(typeof render === 'function') render();
    }
};

window.abrirModalContratos = function() { 
    const m = document.getElementById('modal-contratos'); 
    m.style.display = 'flex'; 
    setTimeout(() => m.classList.add('active'), 10); 
    
    if (typeof db !== 'undefined') {
        let precisaSalvar = false;

        if (db.contratos) {
            db.contratos.forEach(c => {
                if (String(c.categoria).startsWith('cat_mig_')) {
                    const catReal = (db.categorias || []).find(cat => cat.id === c.categoria);
                    c.categoria = catReal ? catReal.nome : 'Outros';
                    precisaSalvar = true;
                }
            });
        }

        if (db.lancamentos) {
            db.lancamentos.forEach(l => {
                if (String(l.cat).startsWith('cat_mig_') || String(l.categoria).startsWith('cat_mig_')) {
                    const idParaBusca = l.cat || l.categoria;
                    const catReal = (db.categorias || []).find(cat => cat.id === idParaBusca);
                    const nomeCorreto = catReal ? catReal.nome : 'Outros';
                    l.cat = nomeCorreto;
                    l.categoria = nomeCorreto;
                    precisaSalvar = true;
                }
            });
        }

        if (precisaSalvar && typeof save === 'function') save();
    }

    if (typeof db !== 'undefined' && db.categorias) {
        const categoriasValidas = db.categorias
            .filter(c => c.tipo === 'despesa')
            .sort((a, b) => a.nome.localeCompare(b.nome));

        const catHtml = categoriasValidas
            .map(c => `<option value="${c.nome}">${c.icone || '🏷️'} ${c.nome}</option>`)
            .join('');
            
        const catFixa = document.getElementById('fixa-cat');
        const catParc = document.getElementById('parc-cat');
        
        if (catFixa) catFixa.innerHTML = catHtml;
        if (catParc) catParc.innerHTML = catHtml;
    }
    
    if (typeof db !== 'undefined' && db.contas) {
        const contaHtml = db.contas
            .map(c => `<option value="${c.id}">${c.nome}</option>`)
            .join('');
            
        const contaFixa = document.getElementById('fixa-conta');
        const contaParc = document.getElementById('parc-conta');
        
        if (contaFixa) contaFixa.innerHTML = contaHtml;
        if (contaParc) contaParc.innerHTML = contaHtml;
    }
};

// ==========================================
// FORÇAR A EDIÇÃO DE PARCELAMENTOS
// ==========================================

window.abrirEdicaoParcelamento = function(idGrupo) {
    if (!idGrupo) return alert("Erro: ID do parcelamento não encontrado.");
    
    const parcelas = (db.lancamentos || []).filter(l => String(l.idGrupo) === String(idGrupo) && !l.efetivado).sort((a,b) => new Date(a.data) - new Date(b.data));
    
    if(parcelas.length === 0) {
        return alert("Não há parcelas pendentes neste grupo para editar (ou elas já foram pagas).");
    }
    
    const lancBase = parcelas[0];
    const nomeBase = (lancBase.desc || '').split(' (')[0].trim();
    const diaBase = lancBase.data && lancBase.data.includes('-') ? lancBase.data.split('-')[2] : '01';

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
    if(m) {
        m.style.display = 'flex';
        setTimeout(() => m.classList.add('active'), 10);
    } else {
        alert("Ops! O pop-up de edição não foi encontrado na tela.");
    }
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
            l.desc = novaDesc + (match ? ` ${match[0]}` : '');
            l.valor = novoValor;
            l.cat = novaCat;
            l.contaId = novaConta;
            
            if (l.data && l.data.includes('-')) {
                const partes = l.data.split('-');
                let ano = parseInt(partes[0]);
                let mes = parseInt(partes[1]);
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
