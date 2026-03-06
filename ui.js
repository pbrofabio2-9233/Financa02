// ==========================================
// UI.JS - Renderização e Interface (v25.9.5 - Correção Modais Ajustes)
// ==========================================

const T_RECEITAS = ['salario', 'tomei_emprestimo', 'rec_emprestimo', 'outras_receitas', 'estorno', 'saque_poupanca', 'receita', 'emp_pessoal', 'compensacao'];
const T_DESPESAS = ['despesas_gerais', 'emprestei_dinheiro', 'pag_emprestimo', 'dep_poupanca', 'emprestei_cartao', 'despesa', 'emp_concedido', 'emp_cartao'];
const T_DESPESAS_CARTAO = ['despesas_gerais', 'emprestei_cartao', 'despesa', 'emp_cartao'];

function render() {
    const hoje = new Date();
    const mesCorrente = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
    let calc = { receitas: 0, prevReceitas: 0, despesas: 0, prevGastos: 0, faturas: 0, faturasFuturas: 0, saldoLivre: 0, investido: 0, usoMetaCartao: 0, metaTotalCartao: 0, gastosFixos: 0, gastosVariaveis: 0 };
    
    // Busca as categorias fixas dinamicamente do banco
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
            
            if (mesFatura === mesCorrente) {
                if (['despesas_gerais', 'despesa'].includes(l.tipo)) {
                    calc.usoMetaCartao += l.valor;
                    if(catFixas.includes(l.cat)) calc.gastosFixos += l.valor;
                    else calc.gastosVariaveis += l.valor;
                } else if (T_RECEITAS.includes(l.tipo)) {
                    calc.usoMetaCartao -= l.valor;
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

    const setTexto = (id, texto) => { const el = document.getElementById(id); if(el) el.innerText = texto; };
    setTexto('dash-receitas', `R$ ${calc.receitas.toFixed(2)}`); setTexto('dash-prev-receitas', `R$ ${calc.prevReceitas.toFixed(2)}`); setTexto('dash-despesas', `R$ ${calc.despesas.toFixed(2)}`); setTexto('dash-prev-gastos', `R$ ${calc.prevGastos.toFixed(2)}`);
    setTexto('dash-faturas', `R$ ${calc.faturas.toFixed(2)}`); setTexto('dash-faturas-futuras', `R$ ${calc.faturasFuturas.toFixed(2)}`); setTexto('dash-saldo-livre', `R$ ${calc.saldoLivre.toFixed(2)}`); setTexto('dash-investido', `R$ ${calc.investido.toFixed(2)}`);

    const saldoProjetado = calc.saldoLivre - calc.prevGastos - calc.faturas + calc.prevReceitas;
    const projElem = document.getElementById('dash-projecao');
    if(projElem) { projElem.innerText = `R$ ${saldoProjetado.toFixed(2)}`; projElem.style.color = saldoProjetado >= 0 ? 'var(--sucesso)' : 'var(--perigo)'; }

    setTexto('uso-meta-texto', `R$ ${calc.usoMetaCartao.toFixed(2)} / R$ ${calc.metaTotalCartao.toFixed(2)}`);
    const pMeta = calc.metaTotalCartao > 0 ? (calc.usoMetaCartao / calc.metaTotalCartao) * 100 : 0;
    const metaBar = document.getElementById('meta-bar');
    if(metaBar) { metaBar.style.width = Math.min(pMeta, 100) + "%"; metaBar.style.background = pMeta > 100 ? '#ef4444' : (pMeta > 80 ? '#f59e0b' : '#10b981'); }
    setTexto('meta-percentual', `${pMeta.toFixed(1)}%`);

    const patrimonioLiquido = calc.saldoLivre + calc.investido - calc.faturas;
    const patElem = document.getElementById('bi-patrimonio');
    if(patElem) { patElem.innerText = `R$ ${patrimonioLiquido.toFixed(2)}`; patElem.style.color = patrimonioLiquido >= 0 ? 'var(--sucesso)' : 'var(--perigo)'; }

    const custoMensal = calc.despesas + calc.faturas;
    const sobrevivencia = custoMensal > 0 ? (calc.investido / custoMensal) : 0;
    setTexto('bi-sobrevivencia', custoMensal > 0 ? `${sobrevivencia.toFixed(1)} Meses` : '∞ Meses');

    const sobra = calc.receitas - custoMensal;
    const taxaPoupanca = calc.receitas > 0 ? (sobra / calc.receitas) * 100 : 0;
    setTexto('bi-taxa-poupanca', `${taxaPoupanca.toFixed(1)}%`);
    const barPoupanca = document.getElementById('bar-poupanca'); if(barPoupanca) barPoupanca.style.width = `${Math.min(Math.max(0, taxaPoupanca), 100)}%`;

    const totalGastosBI = calc.gastosFixos + calc.gastosVariaveis;
    const percFixo = totalGastosBI > 0 ? (calc.gastosFixos / totalGastosBI) * 100 : 0; const percVar = totalGastosBI > 0 ? (calc.gastosVariaveis / totalGastosBI) * 100 : 0;
    setTexto('bi-perc-fixo', `${percFixo.toFixed(0)}%`); setTexto('bi-perc-var', `${percVar.toFixed(0)}%`);
    const barFixo = document.getElementById('bar-fixo'); const barVar = document.getElementById('bar-var');
    if(barFixo) barFixo.style.width = `${percFixo}%`; if(barVar) barVar.style.width = `${percVar}%`;

    if (typeof renderRadarVencimentos === 'function') renderRadarVencimentos();
    if (typeof renderHistorico === 'function') renderHistorico();
    if (typeof renderAbaContas === 'function') renderAbaContas();
    if (typeof renderAbaFaturas === 'function') renderAbaFaturas();
    if (typeof renderAbaConfig === 'function') renderAbaConfig();
    
    setTimeout(() => { 
        if (typeof renderGrafico === 'function') renderGrafico(); 
        if (typeof renderGraficoEvolucao === 'function') renderGraficoEvolucao(); 
    }, 100);
}

function getMesFaturaLogico(dataLancamento, diaFechamento) {
    if (!dataLancamento) return "";
    const [anoStr, mesStr, diaStr] = dataLancamento.split('T')[0].split('-');
    let ano = parseInt(anoStr, 10); 
    let mes = parseInt(mesStr, 10); 
    let dia = parseInt(diaStr, 10);
    let diaFech = parseInt(diaFechamento, 10) || 1;
    
    if (dia >= diaFech) { 
        mes += 1; 
        if (mes > 12) { mes = 1; ano += 1; } 
    }
    return `${ano}-${mes.toString().padStart(2, '0')}`;
}

function formatarMesFaturaLogico(mesAnoStr) { const meses = {'01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez'}; const [ano, mes] = mesAnoStr.split('-'); return `${meses[mes]} / ${ano}`; }
function toggleNovaContaArea() { const el = document.getElementById('area-nova-conta'); if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; }

function renderRadarVencimentos() {
    const lista = document.getElementById('lista-radar-vencimentos'); if(!lista) return;
    const hoje = new Date(); hoje.setHours(0,0,0,0); const limite7 = new Date(hoje); limite7.setDate(hoje.getDate() + 7);
    let alertas = [];
    (db.lancamentos || []).forEach(l => {
        const d = new Date(l.data + 'T00:00:00'); const conta = (db.contas || []).find(c => c.id === l.contaId);
        if (conta && conta.tipo === 'cartao') return; 
        if (!l.efetivado && T_DESPESAS.includes(l.tipo) && d <= limite7) {
            const diasFaltando = Math.ceil((d - hoje) / (1000 * 60 * 60 * 24));
            alertas.push(`<div class="flex-between mb-10" style="padding-bottom:10px; border-bottom:1px solid var(--linha);"><div><strong style="font-size:14px;">${l.desc}</strong><small style="display:block; color: ${diasFaltando < 0 ? 'var(--perigo)' : 'var(--alerta)'}; font-weight:600;">${diasFaltando < 0 ? 'Atrasado' : (diasFaltando===0?'Vence HOJE':`Vence em ${diasFaltando} dia(s)`)}</small></div><b class="txt-perigo">R$ ${l.valor.toFixed(2)}</b></div>`);
        }
    });
    lista.innerHTML = alertas.length ? alertas.join('') : '<p class="texto-vazio">Tudo tranquilo por aqui.</p>';
}

function renderHistorico() {
    const lista = document.getElementById('lista-historico-filtros'); 
    if(!lista) return;

    try {
        const inputMes = document.getElementById('filtro-mes');
        const inputStatus = document.getElementById('filtro-status');
        
        const hojeLocal = new Date();
        const mesCorrenteLocal = `${hojeLocal.getFullYear()}-${(hojeLocal.getMonth() + 1).toString().padStart(2, '0')}`;
        
        const mesFiltro = (inputMes && inputMes.value) ? inputMes.value : mesCorrenteLocal;
        const statusFiltro = (inputStatus && inputStatus.value) ? inputStatus.value : 'todos';
        
        if (inputMes && !inputMes.value) inputMes.value = mesFiltro;
        
        const hoje = new Date(); hoje.setHours(0,0,0,0); 
        const limiteAtencao = new Date(hoje); limiteAtencao.setDate(hoje.getDate() + 7);

        let lancamentosMapeados = (db.lancamentos || []).map(l => {
            if(!l || !l.data) return null;
            
            const c = (db.contas || []).find(x => x.id === l.contaId);
            let dtReferencia = new Date(l.data + 'T00:00:00');
            const isReceita = T_RECEITAS.includes(l.tipo);
            let statusCalculado = '';

            if (c && c.tipo === 'cartao') {
                const mesFat = getMesFaturaLogico(l.data, c.fechamento || 1); 
                const fatID = `${c.id}-${mesFat}`;
                const estaPaga = (db.faturasPagas || []).includes(fatID);
                const [anoF, mesF] = mesFat.split('-');
                const dataFechamentoFatura = new Date(`${anoF}-${mesF}-${(c.fechamento || 1).toString().padStart(2,'0')}T00:00:00`);
                
                if (estaPaga) statusCalculado = 'pago';
                else if (hoje >= dataFechamentoFatura) statusCalculado = 'atencao'; 
                else statusCalculado = 'em_aberto'; 
            } else {
                if (l.efetivado) {
                    statusCalculado = isReceita ? 'receita' : 'pago';
                } else {
                    if (dtReferencia < hoje) statusCalculado = 'atrasado';
                    else if (dtReferencia <= limiteAtencao) statusCalculado = 'atencao';
                    else statusCalculado = 'em_aberto';
                }
            }
            return { ...l, statusCalculado, contaObj: c, isReceita };
        }).filter(l => l !== null);

        let lancs = lancamentosMapeados.filter(l => {
            const isMesmoMes = l.data.substring(0,7) === mesFiltro;
            const isStatusCerto = (statusFiltro === 'todos') || (l.statusCalculado === statusFiltro);
            return isMesmoMes && isStatusCerto;
        }).sort((a, b) => new Date(b.data) - new Date(a.data));
        
        if(lancs.length === 0) { 
            lista.innerHTML = "<div class='card texto-vazio'>Nenhum registro encontrado para este filtro.</div>"; 
            return; 
        }

        lista.innerHTML = lancs.map(l => {
            const c = l.contaObj;
            let chipHtml = ''; 

            if (c && c.tipo === 'cartao') {
                if (l.statusCalculado === 'pago') chipHtml = `<span class="status-badge" style="background:var(--sucesso); color:#fff; font-size:9px;">FATURA PAGA</span>`;
                else if (l.statusCalculado === 'atencao') chipHtml = `<span class="status-badge" style="background:var(--alerta); color:#fff; font-size:9px;">FATURA FECHADA</span>`;
                else chipHtml = `<span class="status-badge" style="background:var(--azul); color:#fff; font-size:9px;">FATURA ABERTA</span>`;
            } else {
                if (l.statusCalculado === 'receita') chipHtml = `<span class="status-badge" style="background:var(--esmeralda); color:#fff; font-size:9px;">RECEITA</span>`;
                else if (l.statusCalculado === 'pago') chipHtml = `<span class="status-badge" style="background:var(--sucesso); color:#fff; font-size:9px;">PAGO</span>`;
                else if (l.statusCalculado === 'atrasado') chipHtml = `<span class="status-badge" style="background:var(--perigo); color:#fff; font-size:9px;">ATRASADO</span>`;
                else if (l.statusCalculado === 'atencao') chipHtml = `<span class="status-badge" style="background:var(--alerta); color:#fff; font-size:9px;">ATENÇÃO</span>`;
                else chipHtml = `<span class="status-badge" style="background:var(--azul); color:#fff; font-size:9px;">EM ABERTO</span>`;
            }

            let infoDivida = '';
            if (l.rolagem && !l.efetivado) {
                const vOrig = l.valorOriginal !== undefined ? l.valorOriginal : l.valor;
                const vAmort = l.valorAmortizado || 0;
                const pctAmortizado = vOrig > 0 ? Math.min((vAmort / vOrig) * 100, 100) : 0;
                infoDivida = `
                    <div style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--linha);">
                        <div class="flex-between" style="font-size:10px; color:var(--texto-sec); margin-bottom:4px;">
                            <span>Amortizado: R$ ${vAmort.toFixed(2)} (de R$ ${vOrig.toFixed(2)})</span>
                            <span class="txt-sucesso">${pctAmortizado.toFixed(0)}%</span>
                        </div>
                        <div class="micro-bar-bg"><div class="micro-bar-fill" style="width:${pctAmortizado}%"></div></div>
                    </div>`;
            }

            const corValor = T_DESPESAS.includes(l.tipo) ? 'var(--perigo)' : 'var(--sucesso)';
            
            const catDB = (db.categorias || []).find(cat => cat.nome === l.cat);
            const iconeCat = catDB && catDB.icone ? catDB.icone + ' ' : '';
            
            return `
            <div class="card fatura-card ${!l.efetivado ? 'opacity-90' : ''}" style="padding:0; overflow:hidden; border:1px solid var(--linha); border-left: 4px solid ${c ? c.cor : '#ccc'}; margin-bottom: 12px;">
                <div style="padding:15px; cursor:pointer;" onclick="toggleEditLancamento(${l.id})">
                    <div class="flex-between" style="margin-bottom: 8px;">
                        <strong style="font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:70%;">${l.desc || 'Sem descrição'}</strong>
                        ${chipHtml}
                    </div>
                    <div class="flex-between" style="align-items: center;">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <small style="color:var(--texto-sec); font-size:11px;">${(l.data || '').split('-').reverse().join('/')} • ${c?c.nome:'Excluída'} • ${iconeCat}${l.cat || 'Outros'}</small>
                            ${(!l.efetivado && c && c.tipo !== 'cartao') ? `
                            <div style="display:flex; gap:6px; margin-top:6px;">
                                <button class="btn-primary" style="padding:6px 10px; font-size:10px; width:auto;" onclick="event.stopPropagation(); ${l.rolagem ? `confirmarQuitacao(${l.id})` : `confirmarPagamento(${l.id})`}">${l.rolagem ? 'Quitar' : 'Pagar'}</button>
                                ${l.rolagem ? `<button class="btn-outline" style="padding:6px 10px; font-size:10px; width:auto;" onclick="event.stopPropagation(); abrirModalParcial(${l.id}, ${l.valor})">Parcial</button>` : ''}
                            </div>` : ''}
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <strong style="color: ${corValor}; font-size:16px;">${l.isReceita ? '+' : '-'} R$ ${(l.valor || 0).toFixed(2)}</strong>
                            <i class="fas fa-chevron-down fatura-chevron" id="icon-${l.id}" style="font-size:11px; color:var(--texto-sec);"></i>
                        </div>
                    </div>
                    ${infoDivida}
                </div>
                <div id="edit-lanc-${l.id}" style="display:none; padding:15px; border-top:1px dashed var(--linha); background:var(--input-bg);">
                    <label class="label-moderno">Editar Descrição</label>
                    <input type="text" id="e-lanc-desc-${l.id}" class="input-moderno mb-10" value="${l.desc || ''}">
                    <div class="grid-inputs mb-10">
                        <div><label class="label-moderno">Data</label><input type="date" id="e-lanc-data-${l.id}" class="input-moderno" value="${l.data || ''}"></div>
                        <div><label class="label-moderno">Valor (R$)</label><input type="number" id="e-lanc-val-${l.id}" class="input-moderno" value="${l.valor || 0}"></div>
                    </div>
                    <div class="flex-between" style="gap:10px;">
                        <button class="btn-outline txt-perigo" style="width:48%; border-color:var(--perigo);" onclick="excluirLancamento(${l.id})"><i class="fas fa-trash"></i> Excluir</button>
                        <button class="btn-primary" style="width:48%;" onclick="salvarEdicaoLancamento(${l.id})">Salvar Mudanças</button>
                    </div>
                </div>
            </div>`;
        }).join('');

    } catch (error) {
        console.error("Erro Crítico no Extrato:", error);
        lista.innerHTML = `<div class='card' style='border: 1px solid var(--perigo); background: rgba(239, 68, 68, 0.1);'><h3 style='color: var(--perigo);'><i class="fas fa-bug"></i> Oops! Algo quebrou.</h3><code style='display:block; margin-top: 10px; font-size: 10px; color: var(--perigo);'>${error.message}</code></div>`;
    }
}

function toggleEditLancamento(id) { 
    const el = document.getElementById(`edit-lanc-${id}`); 
    if(el) { el.style.display = el.style.display === 'none' ? 'block' : 'none'; }
    const icon = document.getElementById(`icon-${id}`);
    if(icon) { icon.classList.toggle('open'); }
}

function abrirModalParcial(id, valorAtual) { document.getElementById('hidden-id-parcial').value = id; document.getElementById('txt-valor-original-parcial').innerText = `R$ ${valorAtual.toFixed(2)}`; document.getElementById('input-valor-parcial').value = ''; const modal = document.getElementById('modal-pagamento-parcial'); if(modal) { modal.style.display = 'flex'; setTimeout(()=>modal.classList.add('active'), 10); } }
function fecharModalParcial() { const m = document.getElementById('modal-pagamento-parcial'); if(m) { m.classList.remove('active'); setTimeout(()=>m.style.display = 'none', 300); } }
function toggleCamposPrevisao() { const isChecked = document.getElementById('emp-sem-previsao').checked; const container = document.getElementById('container-campos-previsao'); if(container) container.style.display = isChecked ? 'none' : 'block'; }

function renderAbaContas() {
    const lista = document.getElementById('lista-contas-saldos'); if(!lista) return;
    lista.innerHTML = ``;
    
    (db.contas || []).forEach(c => {
        const isCartao = c.tipo === 'cartao'; 
        let extraHtml = ''; 
        let usoLimite = 0;
        let usoMeta = 0;

        if (isCartao) {
            const hoje = new Date(); 
            const mesCorrente = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
            
            (db.lancamentos || []).forEach(l => { 
                if (l.contaId === c.id) {
                    const mesLancLogico = getMesFaturaLogico(l.data, c.fechamento || 1);
                    const fatID = `${c.id}-${mesLancLogico}`;
                    const isPaga = (db.faturasPagas || []).includes(fatID);
                    
                    let valorCalc = 0;
                    if (T_DESPESAS_CARTAO.includes(l.tipo)) valorCalc = l.valor;
                    else if (T_RECEITAS.includes(l.tipo)) valorCalc = -l.valor;

                    if (valorCalc !== 0) {
                        if (mesLancLogico === mesCorrente) { usoMeta += valorCalc; }
                        if (!isPaga) { usoLimite += valorCalc; }
                    }
                }
            });
            
            Object.keys(db.amortizacoesFaturas || {}).forEach(fatID => {
                const [cId, mesFat] = fatID.split('-');
                if (cId === c.id) {
                    const isPaga = (db.faturasPagas || []).includes(fatID);
                    if (!isPaga) { usoLimite -= db.amortizacoesFaturas[fatID]; }
                }
            });

            if (usoLimite < 0) usoLimite = 0;
            if (usoMeta < 0) usoMeta = 0;

            const pLimite = c.limite > 0 ? (usoLimite / c.limite) * 100 : 0; 
            const pMeta = c.meta > 0 ? (usoMeta / c.meta) * 100 : 0;
            
            extraHtml = `<div style="margin-top: 15px; padding-right: 25px;"><div class="limite-texto" style="margin-bottom: 4px; opacity: 0.9; font-size: 11px;"><span>Consumo (Limite): R$ ${usoLimite.toFixed(2)} (${pLimite.toFixed(1)}%)</span><span>R$ ${(c.limite || 0).toFixed(2)}</span></div><div class="limite-bg"><div class="limite-fill" style="width:${Math.min(pLimite,100)}%"></div></div><div class="limite-texto" style="margin-bottom: 4px; margin-top: 10px; opacity: 0.9; font-size: 11px;"><span>Consumo (Meta): R$ ${usoMeta.toFixed(2)} (${pMeta.toFixed(1)}%)</span><span>R$ ${(c.meta || 0).toFixed(2)}</span></div><div class="limite-bg"><div class="limite-fill" style="width:${Math.min(pMeta,100)}%; background: ${pMeta > 100 ? '#ef4444' : (pMeta > 80 ? '#f59e0b' : '#10b981')};"></div></div></div>`;
        }
        
        lista.innerHTML += `
            <div class="cartao-banco" style="background: linear-gradient(135deg, ${c.cor}, #1e293b); position: relative; margin-bottom: 10px; transition: transform 0.2s;">
                <button class="btn-icon" onclick="toggleEditConta('${c.id}')" style="position: absolute; top: 15px; right: 15px; color: white; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; z-index: 2;"><i class="fas fa-cog"></i></button>
                <div class="cartao-header" style="padding-right: 45px;"><span class="cartao-nome">${c.nome}</span><span class="cartao-tipo">${isCartao ? 'Crédito' : (c.tipo==='investimento' ? 'Investimento' : 'Conta Corrente')}</span></div>
                <div class="cartao-saldo">R$ ${isCartao ? ((c.limite || 0) - usoLimite).toFixed(2) : (c.saldo || 0).toFixed(2)}</div>
                ${isCartao ? '<small style="display:block; opacity:0.8; font-size:10px; margin-top:5px;">Limite Disponível</small>' : ''} ${extraHtml}
            </div>
            <div id="edit-conta-${c.id}" class="card" style="display:none; margin-top: -15px; margin-bottom: 20px; border-top-left-radius: 0; border-top-right-radius: 0; border: 1px dashed ${c.cor}; border-top: none;">
                <div class="grid-inputs mb-10"><div><label class="label-moderno">Nome</label><input type="text" id="edit-nome-${c.id}" class="input-moderno" value="${c.nome}"></div><div><label class="label-moderno">Cor</label><input type="color" id="edit-cor-${c.id}" value="${c.cor}" style="width:100%; height:45px; border:none; border-radius:8px;"></div></div>
                ${isCartao ? `<div class="grid-inputs mb-10"><div><label class="label-moderno">Limite</label><input type="number" id="edit-limite-${c.id}" class="input-moderno" value="${c.limite || 0}"></div><div><label class="label-moderno">Meta</label><input type="number" id="edit-meta-${c.id}" class="input-moderno" value="${c.meta || 0}"></div></div><div class="grid-inputs"><div><label class="label-moderno">Fecha</label><input type="number" id="edit-fecha-${c.id}" class="input-moderno" value="${c.fechamento || 1}"></div><div><label class="label-moderno">Venc</label><input type="number" id="edit-venc-${c.id}" class="input-moderno" value="${c.vencimento || 1}"></div></div>` : `<label class="label-moderno">Saldo Atual (R$)</label><input type="number" id="edit-saldo-${c.id}" class="input-moderno" value="${(c.saldo || 0).toFixed(2)}" step="0.01">`}
                <div class="flex-between mt-15"><button class="btn-icon txt-perigo" onclick="excluirConta('${c.id}')"><i class="fas fa-trash"></i> Excluir</button><button class="btn-primary" onclick="salvarEdicaoConta('${c.id}')">Salvar</button></div>
            </div>`;
    });
}

function renderAbaFaturas() {
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
    
    if(!cartaoAtivoFatura && cartoes.length > 0) cartaoAtivoFatura = cartoes[0].id;
    
    abas.innerHTML = `<div class="segmented-control">` + cartoes.map(c => 
        `<button class="segmented-btn ${c.id === cartaoAtivoFatura ? 'active' : ''}" onclick="cartaoAtivoFatura='${c.id}'; renderAbaFaturas();">${c.nome}</button>`
    ).join('') + `</div>`;
    
    const c = cartoes.find(x => x.id === cartaoAtivoFatura); if(!c) return;
    let mesesFatura = {};
    
    (db.lancamentos || []).forEach(l => {
        if(l.contaId !== c.id) return;
        const mesFat = getMesFaturaLogico(l.data, c.fechamento || 1);
        if(!mesesFatura[mesFat]) mesesFatura[mesFat] = { total: 0, lancamentos: [] };
        mesesFatura[mesFat].total += T_RECEITAS.includes(l.tipo) ? -l.valor : l.valor; 
        mesesFatura[mesFat].lancamentos.push(l);
    });

    let html = ''; 
    const mesesOrdenados = Object.keys(mesesFatura).sort((a,b) => new Date(b+'-01') - new Date(a+'-01'));
    if(mesesOrdenados.length === 0) { lista.innerHTML = "<div class='card texto-vazio'>Sem faturas registradas neste cartão.</div>"; return; }

    mesesOrdenados.forEach(mes => {
        const fatID = `${c.id}-${mes}`; 
        const estaPaga = (db.faturasPagas || []).includes(fatID);
        const jaAmortizado = (db.amortizacoesFaturas && db.amortizacoesFaturas[fatID]) || 0;
        const totalOriginal = mesesFatura[mes].total;
        const totalFinal = totalOriginal - jaAmortizado;
        
        const [anoF, mesF] = mes.split('-');
        const dataFechamentoFatura = new Date(`${anoF}-${mesF}-${(c.fechamento || 1).toString().padStart(2, '0')}T00:00:00`);
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        
        let statusTag = '';
        if (estaPaga) statusTag = '<span class="status-badge" style="background:var(--sucesso); color:#fff; font-size:9px;">PAGO</span>';
        else if (hoje >= dataFechamentoFatura) statusTag = '<span class="status-badge" style="background:var(--alerta); color:#fff; font-size:9px;">FECHADA</span>';
        else statusTag = '<span class="status-badge" style="background:var(--azul); color:#fff; font-size:9px;">EM ABERTO</span>';

        const pctAmortizado = totalOriginal > 0 ? Math.min((jaAmortizado / totalOriginal) * 100, 100) : 0;
        const infoAmortizado = jaAmortizado > 0 ? `
            <div style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--linha);">
                <div class="flex-between" style="font-size:10px; color:var(--texto-sec); margin-bottom:4px;">
                    <span>Amortizado: R$ ${jaAmortizado.toFixed(2)}</span>
                    <span class="txt-sucesso">${pctAmortizado.toFixed(0)}%</span>
                </div>
                <div class="micro-bar-bg"><div class="micro-bar-fill" style="width:${pctAmortizado}%"></div></div>
            </div>` : '';

        html += `
        <div class="card fatura-card ${estaPaga ? 'paga' : ''}" style="padding:0; overflow:hidden; border:1px solid ${estaPaga?'var(--sucesso)':'var(--linha)'}; margin-bottom: 12px;">
            <div style="padding:15px; cursor:pointer; background:${estaPaga?'rgba(16,185,129,0.05)':'var(--card-bg)'};" onclick="toggleEditLancamento('det-fat-${fatID}')">
                <div class="flex-between" style="margin-bottom: 8px;">
                    <strong style="font-size:14px; display:flex; align-items:center; gap:6px;">
                        <i class="fas fa-file-invoice-dollar" style="color:var(--texto-sec);"></i> Fatura ${formatarMesFaturaLogico(mes)}
                    </strong>
                    ${statusTag}
                </div>
                <div class="flex-between" style="align-items: center;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <small style="color:var(--texto-sec); font-size:11px;">Venc: ${(c.vencimento||1).toString().padStart(2,'0')}/${mes.split('-')[1]}</small>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <strong class="${estaPaga?'txt-sucesso':'txt-perigo'}" style="font-size:16px;">R$ ${totalFinal.toFixed(2)}</strong>
                            <i class="fas fa-chevron-down fatura-chevron" id="icon-det-fat-${fatID}" style="font-size:11px; color:var(--texto-sec);"></i>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px;">
                        ${!estaPaga && totalFinal > 0 ? `<button class="btn-outline" style="padding:6px 10px; font-size:10px; width:auto;" onclick="event.stopPropagation(); amortizarFatura('${fatID}')">Amortizar</button>` : ''}
                        <button class="${estaPaga?'btn-outline':'btn-primary'}" style="padding:6px 10px; font-size:10px; width:auto;" onclick="event.stopPropagation(); alternarPagamentoFatura('${fatID}')">${estaPaga?'Reabrir':'Pagar'}</button>
                    </div>
                </div>
                ${infoAmortizado}
            </div>
            <div id="edit-lanc-det-fat-${fatID}" style="display:none; padding:15px; border-top:1px dashed var(--linha); background:var(--input-bg);">
                ${mesesFatura[mes].lancamentos.map(l => `
                    <div class="flex-between mb-10" style="font-size:12px; border-bottom:1px solid var(--linha); padding-bottom:5px;">
                        <span>${(l.data || '').split('-').reverse().join('/')} - ${l.desc}</span>
                        <strong class="${T_RECEITAS.includes(l.tipo)?'txt-sucesso':'txt-perigo'}">R$ ${(l.valor || 0).toFixed(2)}</strong>
                    </div>
                `).join('')}
            </div>
        </div>`;
    });
    lista.innerHTML = html;
}

// --- FUNÇÕES DOS NOVOS MODAIS (Animações de Aparecer/Sumir Corrigidas) ---
function abrirModalAparencia() { const m = document.getElementById('modal-aparencia'); if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); } }
function fecharModalAparencia() { const m = document.getElementById('modal-aparencia'); if(m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); } }

function abrirModalSistema() { const m = document.getElementById('modal-sistema'); if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); renderAbaConfig(); } }
function fecharModalSistema() { const m = document.getElementById('modal-sistema'); if(m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); } }

function abrirModalCategorias() { const m = document.getElementById('modal-categorias'); if(m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('active'), 10); renderModalCategorias(); } }
function fecharModalCategorias() { const m = document.getElementById('modal-categorias'); if(m) { m.classList.remove('active'); setTimeout(() => m.style.display = 'none', 300); cancelarEdicaoCategoria(); } }

function renderAbaConfig() {
    const toggleTema = document.getElementById('toggle-tema-ajustes'); if (toggleTema) toggleTema.checked = document.body.classList.contains('dark-mode');
    const divBackups = document.getElementById('lista-backups'); if(!divBackups) return;
    let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || [];
    divBackups.innerHTML = hist.length ? hist.map(b => `<div class="flex-between mb-10" style="background:var(--input-bg); padding:10px; border-radius:8px; border:1px solid var(--linha);"><div><strong>${b.nome}</strong><small style="display:block; font-size:10px;">${b.data} • ${b.size}</small></div><div style="display:flex; gap:5px;"><button class="btn-primary" style="padding:5px; width:30px;" onclick="restaurarBackupLocal(${b.id})"><i class="fas fa-undo"></i></button><button class="btn-danger" style="padding:5px; width:30px;" onclick="excluirBackupLocal(${b.id})"><i class="fas fa-trash"></i></button></div></div>`).join('') : '<p class="texto-vazio" style="margin:0;">Sem backups.</p>';
}

function renderModalCategorias() {
    const lDespesas = document.getElementById('lista-categorias-despesas');
    const lReceitas = document.getElementById('lista-categorias-receitas');
    const cDespesas = document.getElementById('count-cat-desp');
    const cReceitas = document.getElementById('count-cat-rec');

    if(lDespesas && lReceitas) {
        const catDesp = (db.categorias || []).filter(c => c.tipo === 'despesa');
        const catRec = (db.categorias || []).filter(c => c.tipo === 'receita');
        if (cDespesas) cDespesas.innerText = catDesp.length;
        if (cReceitas) cReceitas.innerText = catRec.length;

        lDespesas.innerHTML = catDesp.length ? catDesp.map(c => `
            <div class="cat-chip" style="background-color: ${c.cor};" onclick="editarCategoria('${c.id}')">
                ${c.icone || ''} ${c.fixa ? '<i class="fas fa-lock" style="font-size:9px;"></i>' : ''} ${c.nome} 
                <i class="fas fa-times" onclick="event.stopPropagation(); excluirCategoria('${c.id}'); setTimeout(renderModalCategorias, 100);"></i>
            </div>`).join('') : '<span style="font-size:11px; color:var(--texto-sec); width:100%;">Nenhuma.</span>';
            
        lReceitas.innerHTML = catRec.length ? catRec.map(c => `
            <div class="cat-chip" style="background-color: ${c.cor};" onclick="editarCategoria('${c.id}')">
                ${c.icone || ''} ${c.nome} 
                <i class="fas fa-times" onclick="event.stopPropagation(); excluirCategoria('${c.id}'); setTimeout(renderModalCategorias, 100);"></i>
            </div>`).join('') : '<span style="font-size:11px; color:var(--texto-sec); width:100%;">Nenhuma.</span>';
    }
}

function editarCategoria(id) {
    const cat = (db.categorias || []).find(c => c.id === id);
    if(!cat) return;
    
    document.getElementById('nova-cat-id').value = cat.id;
    document.getElementById('nova-cat-icone').value = cat.icone || '';
    document.getElementById('nova-cat-nome').value = cat.nome;
    document.getElementById('nova-cat-tipo').value = cat.tipo;
    document.getElementById('nova-cat-cor').value = cat.cor || '#94a3b8';
    document.getElementById('nova-cat-fixa').checked = !!cat.fixa;
    
    document.getElementById('label-form-cat').innerText = "Editar Categoria";
    document.getElementById('btn-salvar-cat').innerText = "Salvar Alterações";
    document.getElementById('btn-cancelar-edicao-cat').style.display = 'block';
}

function cancelarEdicaoCategoria() {
    document.getElementById('nova-cat-id').value = '';
    document.getElementById('nova-cat-icone').value = '';
    document.getElementById('nova-cat-nome').value = '';
    document.getElementById('nova-cat-fixa').checked = false;
    
    document.getElementById('label-form-cat').innerText = "Criar Nova Categoria";
    document.getElementById('btn-salvar-cat').innerText = "Adicionar";
    document.getElementById('btn-cancelar-edicao-cat').style.display = 'none';
}

function salvarConfigNovaCategoria() {
    const idEdicao = document.getElementById('nova-cat-id').value;
    const icone = document.getElementById('nova-cat-icone').value.trim();
    const nome = document.getElementById('nova-cat-nome').value.trim();
    const tipo = document.getElementById('nova-cat-tipo').value;
    const cor = document.getElementById('nova-cat-cor').value;
    const fixa = document.getElementById('nova-cat-fixa').checked;

    if(!nome) { alert("Dê um nome para a categoria."); return; }
    db.categorias = db.categorias || [];

    if (idEdicao) {
        const cat = db.categorias.find(c => c.id === idEdicao);
        if (cat) {
            const existe = db.categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase() && c.id !== idEdicao && c.tipo === tipo);
            if (existe) { alert("Já existe outra categoria com este nome."); return; }
            
            if (cat.nome !== nome) {
                db.lancamentos.forEach(l => { if (l.cat === cat.nome) l.cat = nome; });
            }
            
            cat.nome = nome; cat.icone = icone; cat.tipo = tipo; cat.cor = cor; cat.fixa = fixa;
            save(); if(typeof showToast === 'function') showToast("Categoria atualizada!");
        }
    } else {
        const existe = db.categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase() && c.tipo === tipo);
        if (existe) { alert("Já existe uma categoria com este nome."); return; }
        
        db.categorias.push({ id: 'cat_' + Date.now(), nome: nome, icone: icone, cor: cor, fixa: fixa, tipo: tipo });
        save(); if(typeof showToast === 'function') showToast("Nova categoria criada!");
    }
    cancelarEdicaoCategoria(); renderModalCategorias(); if(typeof render === 'function') render();
}

function excluirCategoria(id) {
    if(!confirm("Excluir esta categoria? Os lançamentos antigos vão perder a cor no gráfico, mas o nome continua no extrato.")) return;
    db.categorias = db.categorias.filter(c => c.id !== id);
    save(); renderModalCategorias(); if(typeof render === 'function') render();
}

function renderGrafico() {
    const ctx = document.getElementById('graficoCategorias'); if(!ctx) return;
    const inputFiltro = document.getElementById('filtro-mes'); 
    
    const hojeLocal = new Date();
    const mesCorrenteLocal = `${hojeLocal.getFullYear()}-${(hojeLocal.getMonth() + 1).toString().padStart(2, '0')}`;
    const mes = (inputFiltro && inputFiltro.value) ? inputFiltro.value : mesCorrenteLocal;
    
    const labels = [], dados = [], bgColors = []; 
    const categorias = {};
    
    (db.lancamentos || []).forEach(l => { 
        if(l.efetivado && l.data && l.data.substring(0,7) === mes && ['despesas_gerais','despesa'].includes(l.tipo)) { 
            categorias[l.cat] = (categorias[l.cat]||0) + l.valor; 
        } 
    });
    
    Object.keys(categorias).forEach(k => { 
        labels.push(k); 
        dados.push(categorias[k]); 
        
        const catDB = (db.categorias || []).find(c => c.nome === k);
        bgColors.push(catDB ? catDB.cor : '#94a3b8'); 
    });
    
    if(meuGrafico) meuGrafico.destroy(); 
    if(dados.length === 0) return; 
    
    const isDark = document.body.classList.contains('dark-mode');
    meuGrafico = new Chart(ctx, { 
        type:'doughnut', 
        data:{ 
            labels, 
            datasets:[{ 
                data:dados, 
                backgroundColor: bgColors, 
                borderWidth:3, 
                borderColor:isDark?'#1e293b':'#fff' 
            }] 
        }, 
        options:{ 
            responsive:true, 
            maintainAspectRatio:false, 
            plugins:{ 
                legend:{ position:'right', labels:{ color:isDark?'#cbd5e1':'#64748b', usePointStyle:true, font:{size:11} } }, 
                datalabels:{ color:'#fff', font:{weight:'bold', size:11}, formatter:(v)=>'R$ '+v.toFixed(0) } 
            }, 
            cutout:'60%' 
        } 
    });
}

function mudarMesFiltro(delta) {
    const input = document.getElementById('filtro-mes');
    if (!input) return;
    
    const hojeLocal = new Date();
    const mesCorrenteLocal = `${hojeLocal.getFullYear()}-${(hojeLocal.getMonth() + 1).toString().padStart(2, '0')}`;
    
    let [ano, mes] = (input.value || mesCorrenteLocal).split('-').map(Number);
    mes += delta;
    
    if (mes < 1) { mes = 12; ano--; }
    else if (mes > 12) { mes = 1; ano++; }
    
    input.value = `${ano}-${mes.toString().padStart(2, '0')}`;
    
    if (typeof renderHistorico === 'function') renderHistorico();
    if (typeof renderGrafico === 'function') renderGrafico(); 
}

function mudarFiltroStatus(status, btnClicado) {
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'var(--input-bg)';
        btn.style.color = 'var(--texto-sec)';
        btn.style.border = '1px solid var(--linha)';
        btn.style.boxShadow = 'none';
    });
    
    btnClicado.classList.add('active');
    btnClicado.style.background = 'var(--azul)';
    btnClicado.style.color = '#fff';
    btnClicado.style.border = 'none';
    btnClicado.style.boxShadow = '0 2px 5px rgba(37,99,235,0.3)';
    
    const inputStatus = document.getElementById('filtro-status');
    if (inputStatus) inputStatus.value = status;
    
    if (typeof renderHistorico === 'function') renderHistorico();
}

function renderGraficoEvolucao() {
    const ctx = document.getElementById('graficoEvolucao'); 
    if(!ctx) return;
    
    const labels = [], dDesp = [], dRec = [];
    const mesesAbrev = {'01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez'};
    
    for (let i = 5; i >= 0; i--) {
        let d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
        let mStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
        labels.push(mesesAbrev[mStr.split('-')[1]]); 
        
        let tD = 0, tR = 0;
        (db.lancamentos || []).forEach(l => { 
            if(l.efetivado && l.data && l.data.substring(0,7) === mStr){ 
                if(T_DESPESAS.includes(l.tipo)) tD += l.valor; 
                if(T_RECEITAS.includes(l.tipo)) tR += l.valor; 
            } 
        });
        dDesp.push(tD); 
        dRec.push(tR);
    }
    
    if(meuGraficoEvolucao) meuGraficoEvolucao.destroy();
    const isDark = document.body.classList.contains('dark-mode');
    
    meuGraficoEvolucao = new Chart(ctx, { 
        type: 'bar',
        data: { 
            labels, 
            datasets: [ 
                { 
                    label: 'Receitas', 
                    data: dRec, 
                    backgroundColor: '#10b981', 
                    borderRadius: 4,
                    datalabels: { align: 'top', anchor: 'end' } 
                }, 
                { 
                    label: 'Despesas', 
                    data: dDesp, 
                    backgroundColor: '#ef4444', 
                    borderRadius: 4,
                    datalabels: { align: 'top', anchor: 'end' } 
                } 
            ] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            layout: { padding: { top: 20, right: 10, left: 0, bottom: 0 } }, 
            plugins: { 
                legend: { position: 'bottom', labels: { color: isDark ? '#94a3b8' : '#64748b', usePointStyle: true } }, 
                datalabels: { 
                    color: isDark ? '#cbd5e1' : '#475569', 
                    font: { weight: 'bold', size: 9 }, 
                    formatter: v => v > 0 ? Math.round(v) : '' 
                } 
            }, 
            scales: { 
                y: { 
                    grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, 
                    ticks: { color: isDark ? '#94a3b8' : '#64748b' } 
                }, 
                x: { 
                    grid: { display: false }, 
                    ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { weight: 'bold' } } 
                } 
            } 
        } 
    });
}