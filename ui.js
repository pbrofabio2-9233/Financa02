// ==========================================
// UI.JS - Renderização e Interface Visual
// ==========================================

function render() {
    const hoje = new Date();
    const mesCorrente = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
    let calc = { 
        receitas: 0, prevReceitas: 0, despesas: 0, prevGastos: 0, 
        faturas: 0, saldoLivre: 0, investido: 0, usoMetaCartao: 0, metaTotalCartao: 0 
    };

    // 1. Saldos e Metas Globais
    db.contas.forEach(c => {
        if(c.tipo === 'movimentacao') calc.saldoLivre += c.saldo;
        if(c.tipo === 'investimento') calc.investido += c.saldo;
        if(c.tipo === 'cartao') calc.metaTotalCartao += c.meta;
    });

    // 2. Varredura do Mês Corrente
    db.lancamentos.forEach(l => {
        const conta = db.contas.find(c => c.id === l.contaId);
        if(!conta || l.data.substring(0,7) !== mesCorrente) return;

        if (conta.tipo === 'cartao') {
            const mesFatura = getMesFaturaLogico(l.data, conta.fechamento);
            const fatID = `${conta.id}-${mesFatura}`;
            if (!db.faturasPagas.includes(fatID) && (l.tipo === 'despesa' || l.tipo === 'emp_cartao')) {
                calc.faturas += l.valor;
            }
            if (mesFatura === getMesFaturaLogico(hoje.toISOString().split('T')[0], conta.fechamento) && l.tipo === 'despesa') {
                calc.usoMetaCartao += l.valor;
            }
        } else {
            if (l.efetivado) {
                if (['receita', 'emp_pessoal', 'compensacao'].includes(l.tipo)) calc.receitas += l.valor;
                if (['despesa', 'emp_concedido'].includes(l.tipo)) calc.despesas += l.valor;
            } else {
                if (['receita', 'emp_pessoal', 'compensacao'].includes(l.tipo)) calc.prevReceitas += l.valor;
                if (['despesa', 'emp_concedido'].includes(l.tipo)) calc.prevGastos += l.valor;
            }
        }
    });

    // 3. Atualizar Dashboard Executivo
    const setTexto = (id, texto) => { const el = document.getElementById(id); if(el) el.innerText = texto; };
    setTexto('dash-receitas', `R$ ${calc.receitas.toFixed(2)}`);
    setTexto('dash-prev-receitas', `R$ ${calc.prevReceitas.toFixed(2)}`);
    setTexto('dash-despesas', `R$ ${calc.despesas.toFixed(2)}`);
    setTexto('dash-prev-gastos', `R$ ${calc.prevGastos.toFixed(2)}`);
    setTexto('dash-faturas', `R$ ${calc.faturas.toFixed(2)}`);
    setTexto('dash-saldo-livre', `R$ ${calc.saldoLivre.toFixed(2)}`);
    setTexto('dash-investido', `R$ ${calc.investido.toFixed(2)}`);

    // Projeção Mês
    const saldoProjetado = calc.saldoLivre - calc.prevGastos - calc.faturas + calc.prevReceitas;
    const projElem = document.getElementById('dash-projecao');
    if(projElem) {
        projElem.innerText = `R$ ${saldoProjetado.toFixed(2)}`;
        projElem.style.color = saldoProjetado >= 0 ? 'var(--sucesso)' : 'var(--perigo)';
    }

    // Meta Consumida (Painel Principal)
    setTexto('uso-meta-texto', `R$ ${calc.usoMetaCartao.toFixed(2)} / R$ ${calc.metaTotalCartao.toFixed(2)}`);
    const pMeta = calc.metaTotalCartao > 0 ? (calc.usoMetaCartao / calc.metaTotalCartao) * 100 : 0;
    const metaBar = document.getElementById('meta-bar');
    if(metaBar) {
        metaBar.style.width = Math.min(pMeta, 100) + "%";
        metaBar.style.background = pMeta > 100 ? '#ef4444' : (pMeta > 80 ? '#f59e0b' : '#10b981'); // Vermelho, Amarelo, Verde
    }
    setTexto('meta-percentual', `${pMeta.toFixed(1)}%`);

    // 4. Chamadas de Renderização Secundárias
    if (typeof renderRadarVencimentos === 'function') renderRadarVencimentos();
    if (typeof renderHistorico === 'function') renderHistorico();
    if (typeof renderAbaContas === 'function') renderAbaContas();
    if (typeof renderAbaFaturas === 'function') renderAbaFaturas();
    if (typeof renderAbaConfig === 'function') renderAbaConfig();
    
    // Os gráficos precisam de um pequeno delay para capturar o tamanho certo do container
    setTimeout(() => {
        if (typeof renderGrafico === 'function') renderGrafico();
        if (typeof renderGraficoEvolucao === 'function') renderGraficoEvolucao();
    }, 100);
}

// Lógica de Fatura Auxiliar
function getMesFaturaLogico(dataLancamento, diaFechamento) {
    const [anoStr, mesStr, diaStr] = dataLancamento.split('-');
    let ano = parseInt(anoStr); let mes = parseInt(mesStr); let dia = parseInt(diaStr);
    if (dia >= diaFechamento) { mes += 1; if (mes > 12) { mes = 1; ano += 1; } }
    return `${ano}-${mes.toString().padStart(2, '0')}`;
}
function formatarMesFaturaLogico(mesAnoStr) { 
    const meses = {'01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez'};
    const [ano, mes] = mesAnoStr.split('-'); return `${meses[mes]} / ${ano}`; 
}

// --- RADAR LIMPO ---
function renderRadarVencimentos() {
    const lista = document.getElementById('lista-radar-vencimentos'); if(!lista) return;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const limite7 = new Date(hoje); limite7.setDate(hoje.getDate() + 7);
    
    let alertas = [];
    db.lancamentos.forEach(l => {
        const d = new Date(l.data + 'T00:00:00');
        const conta = db.contas.find(c => c.id === l.contaId);
        
        // Ignora lançamentos de Cartão (vão para faturas)
        if (conta && conta.tipo === 'cartao') return; 

        if (!l.efetivado && ['despesa', 'emp_concedido'].includes(l.tipo) && d <= limite7) {
            const diasFaltando = Math.ceil((d - hoje) / (1000 * 60 * 60 * 24));
            let txtDia = diasFaltando === 0 ? 'Vence HOJE' : `Vence em ${diasFaltando} dia(s)`;
            
            alertas.push(`
            <div class="flex-between mb-10" style="padding-bottom:10px; border-bottom:1px solid var(--linha);">
                <div>
                    <strong style="font-size:14px;">${l.desc}</strong>
                    <small style="display:block; color: ${diasFaltando < 0 ? 'var(--perigo)' : 'var(--alerta)'}; font-weight:600;">${diasFaltando < 0 ? 'Atrasado' : txtDia}</small>
                </div>
                <b class="txt-perigo">R$ ${l.valor.toFixed(2)}</b>
            </div>`);
        }
    });
    lista.innerHTML = alertas.length ? alertas.join('') : '<p class="texto-vazio">Tudo tranquilo por aqui.</p>';
}

// --- HISTÓRICO COM CHIPS DE CORES E EDIÇÃO ---
function renderHistorico() {
    const lista = document.getElementById('lista-historico-filtros'); if(!lista) return;
    const mesFiltro = document.getElementById('filtro-mes').value;
    const catFiltro = document.getElementById('filtro-cat').value;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const limiteAtenção = new Date(hoje); limiteAtenção.setDate(hoje.getDate() + 7);

    let lancs = db.lancamentos.filter(l => (l.data.substring(0,7) === mesFiltro) && (catFiltro === 'todas' ? true : l.cat === catFiltro))
                .sort((a, b) => new Date(b.data) - new Date(a.data));

    if(lancs.length === 0) { lista.innerHTML = "<div class='card texto-vazio'>Nenhum registro encontrado.</div>"; return; }

    lista.innerHTML = lancs.map(l => {
        const c = db.contas.find(x => x.id === l.contaId);
        const dt = new Date(l.data + 'T00:00:00');
        let chipHtml = '';
        
        if (l.efetivado) {
            const isReceita = ['receita', 'emp_pessoal', 'compensacao'].includes(l.tipo);
            chipHtml = `<span class="chip ${isReceita ? 'chip-esmeralda' : 'chip-verde'}"><i class="fas fa-check-circle"></i> ${isReceita ? 'Receita' : 'Pago'}</span>`;
        } else if (dt < hoje) {
            chipHtml = `<span class="chip chip-vermelho"><i class="fas fa-exclamation-circle"></i> Atrasado</span>`;
        } else if (dt <= limiteAtenção) {
            chipHtml = `<span class="chip chip-amarelo"><i class="fas fa-clock"></i> Atenção</span>`;
        } else {
            chipHtml = `<span class="chip chip-azul"><i class="fas fa-calendar-alt"></i> Agendado</span>`;
        }

        const corValor = (['despesa', 'emp_concedido'].includes(l.tipo)) ? 'var(--perigo)' : 'var(--sucesso)';
        
        return `
        <div class="card ${!l.efetivado ? 'opacity-90' : ''}" style="border-left: 4px solid ${c ? c.cor : '#ccc'}; padding:15px;">
            <div class="flex-between">
                <div>
                    <strong style="font-size:15px;">${l.desc} ${chipHtml}</strong>
                    <small style="display:block; color:var(--texto-sec); margin-top:4px;"><i class="fas fa-wallet" style="color:${c?c.cor:''}"></i> ${c?c.nome:'Conta Excluída'} • ${l.cat}</small>
                    ${(!l.efetivado && c && c.tipo !== 'cartao') ? `<button class="btn-primary" style="padding:6px 12px; font-size:11px; margin-top:8px; width:auto;" onclick="confirmarPagamento(${l.id})"><i class="fas fa-check"></i> Efetivar</button>` : ''}
                </div>
                <div style="text-align: right;">
                    <b style="color: ${corValor}; font-size:16px;">R$ ${l.valor.toFixed(2)}</b>
                    <div style="margin-top:10px; display:flex; gap:10px; justify-content:flex-end;">
                        <button class="btn-icon" onclick="toggleEditLancamento(${l.id})"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-icon txt-perigo" onclick="excluirLancamento(${l.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
            
            <div id="edit-lanc-${l.id}" style="display:none; padding-top:15px; margin-top:15px; border-top:1px dashed var(--linha);">
                <label class="label-moderno">Descrição</label>
                <input type="text" id="e-lanc-desc-${l.id}" class="input-moderno mb-10" value="${l.desc}">
                <div class="grid-inputs mb-10">
                    <div>
                        <label class="label-moderno">Data</label>
                        <input type="date" id="e-lanc-data-${l.id}" class="input-moderno" value="${l.data}">
                    </div>
                    <div>
                        <label class="label-moderno">Valor (R$)</label>
                        <input type="number" id="e-lanc-val-${l.id}" class="input-moderno" value="${l.valor}">
                    </div>
                </div>
                <button class="btn-primary" onclick="salvarEdicaoLancamento(${l.id})">Salvar Alterações</button>
            </div>
        </div>`;
    }).join('');
}

function toggleEditLancamento(id) { 
    const el = document.getElementById(`edit-lanc-${id}`);
    if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// --- ABA CONTAS PREMIUM ---
function renderAbaContas() {
    const lista = document.getElementById('lista-contas-saldos'); if(!lista) return;
    lista.innerHTML = ``;

    db.contas.forEach(c => {
        const isCartao = c.tipo === 'cartao';
        let extraHtml = '';
        
        if (isCartao) {
            let totalGasto = 0;
            const mesCorrente = document.getElementById('filtro-mes').value || new Date().toISOString().substring(0,7);
            db.lancamentos.forEach(l => {
                if (l.contaId === c.id && l.data.substring(0,7) === mesCorrente && (l.tipo === 'despesa' || l.tipo === 'emp_cartao')) {
                    totalGasto += l.valor;
                }
            });
            const percUso = c.limite > 0 ? (totalGasto / c.limite) * 100 : 0;
            extraHtml = `
                <div class="limite-bg"><div class="limite-fill" style="width:${Math.min(percUso,100)}%"></div></div>
                <div class="limite-texto"><span>Consumo: R$ ${totalGasto.toFixed(2)}</span><span>Limite: R$ ${c.limite.toFixed(2)}</span></div>
            `;
        }

        lista.innerHTML += `
            <div class="cartao-banco" style="background: linear-gradient(135deg, ${c.cor}, #1e293b);">
                <div class="cartao-header">
                    <span class="cartao-nome">${c.nome}</span>
                    <span class="cartao-tipo">${isCartao ? 'Crédito' : (c.tipo==='investimento' ? 'Investimento' : 'Conta Corrente')}</span>
                </div>
                <div class="cartao-saldo">R$ ${isCartao ? (c.limite - (c.limite > 0 ? parseFloat(extraHtml.match(/R\$ ([\d.]+)/)[1]) : 0)).toFixed(2) : c.saldo.toFixed(2)}</div>
                ${isCartao ? '<small style="display:block; opacity:0.8; font-size:10px; margin-top:5px;">Livre Estimado</small>' : ''}
                ${extraHtml}
            </div>
        `;
    });
}

// --- ABA FATURAS PREMIUM ---
function renderAbaFaturas() {
    const abas = document.getElementById('abas-cartoes-fatura'); const lista = document.getElementById('lista-faturas-agrupadas'); if(!abas || !lista) return;
    const cartoes = db.contas.filter(c => c.tipo === 'cartao');
    if(cartoes.length === 0) { abas.innerHTML = ""; lista.innerHTML = "<div class='card texto-vazio'>Nenhum cartão cadastrado.</div>"; return; }
    if(!cartaoAtivoFatura && cartoes.length > 0) cartaoAtivoFatura = cartoes[0].id;
    
    abas.innerHTML = cartoes.map(c => `<button class="tab-btn ${c.id === cartaoAtivoFatura ? 'active' : ''}" onclick="cartaoAtivoFatura='${c.id}'; renderAbaFaturas();">${c.nome}</button>`).join('');
    
    const c = cartoes.find(x => x.id === cartaoAtivoFatura); if(!c) return;
    let mesesFatura = {};
    db.lancamentos.forEach(l => {
        if(l.contaId !== c.id) return;
        const mesFat = getMesFaturaLogico(l.data, c.fechamento);
        if(!mesesFatura[mesFat]) mesesFatura[mesFat] = { total: 0, lancamentos: [] };
        mesesFatura[mesFat].total += l.valor; mesesFatura[mesFat].lancamentos.push(l);
    });

    let html = ''; const mesesOrdenados = Object.keys(mesesFatura).sort((a,b) => new Date(b+'-01') - new Date(a+'-01'));
    if(mesesOrdenados.length === 0) { lista.innerHTML = "<div class='card texto-vazio'>Nenhuma fatura registrada neste cartão.</div>"; return; }

    mesesOrdenados.forEach(mes => {
        const fatID = `${c.id}-${mes}`; const estaPaga = db.faturasPagas.includes(fatID);
        html += `
        <div class="card" style="padding:0; overflow:hidden; border: 1px solid ${estaPaga ? 'var(--sucesso)' : 'var(--linha)'};">
            <div class="flex-between" style="padding: 20px; cursor:pointer; background: ${estaPaga ? 'rgba(16, 185, 129, 0.05)' : 'var(--card-bg)'};" onclick="toggleEditLancamento('det-fat-${fatID}')">
                <div>
                    <strong style="font-size:16px; color:var(--texto-main);"><i class="fas fa-file-invoice" style="color:var(--texto-sec); margin-right:8px;"></i> Fatura ${formatarMesFaturaLogico(mes)}</strong>
                    <small style="display:block; margin-top:6px; color:var(--texto-sec); font-weight:500;">Vencimento: ${c.vencimento}/${mes.split('-')[1]}</small>
                </div>
                <div style="text-align:right;">
                    <strong class="${estaPaga ? 'txt-sucesso' : 'txt-perigo'}" style="font-size:20px;">R$ ${mesesFatura[mes].total.toFixed(2)}</strong>
                    <button class="${estaPaga ? 'btn-outline' : 'btn-primary'}" style="padding:8px 12px; font-size:11px; margin-top:12px; width:auto; border-radius:8px;" onclick="event.stopPropagation(); alternarPagamentoFatura('${fatID}')">${estaPaga ? '<i class="fas fa-undo"></i> Reabrir' : '<i class="fas fa-check"></i> Pagar Fatura'}</button>
                </div>
            </div>
            <div id="edit-lanc-det-fat-${fatID}" style="display:none; padding:15px; border-top: 1px dashed var(--linha); background: var(--input-bg);">
                ${mesesFatura[mes].lancamentos.map(l => `
                    <div class="flex-between mb-10" style="font-size:13px; border-bottom:1px solid var(--linha); padding-bottom:8px;">
                        <span style="color:var(--texto-main); font-weight:500;">
                            <span style="color:var(--texto-sec); margin-right:8px;">${l.data.split('-').reverse().join('/')}</span> 
                            ${l.desc}
                        </span>
                        <strong class="txt-perigo">R$ ${l.valor.toFixed(2)}</strong>
                    </div>
                `).join('')}
            </div>
        </div>`;
    });
    lista.innerHTML = html;
}

// --- ABA CONFIGURAÇÕES (Edição com Rótulos Completos) ---
function renderAbaConfig() {
    const divContas = document.getElementById('lista-contas-edit');
    const divBackups = document.getElementById('lista-backups');
    
    if (divContas) {
        divContas.innerHTML = db.contas.map(c => `
            <div class="card" style="padding:15px; border-left:4px solid ${c.cor};">
                <div class="flex-between">
                    <div><strong style="font-size:15px;">${c.nome}</strong> <span class="badge-neutro" style="font-size:10px; margin-left:5px;">${c.tipo}</span></div>
                    <div style="display:flex; gap: 8px;">
                        <button class="btn-icon" onclick="toggleEditConta('${c.id}')"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-icon txt-perigo" onclick="excluirConta('${c.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                
                <div id="edit-conta-${c.id}" style="display:none; padding-top:15px; margin-top:15px; border-top:1px dashed var(--linha);">
                    <div class="grid-inputs mb-10">
                        <div><label class="label-moderno">Nome da Conta</label><input type="text" id="edit-nome-${c.id}" class="input-moderno" value="${c.nome}"></div>
                        <div><label class="label-moderno">Cor Tema</label><input type="color" id="edit-cor-${c.id}" value="${c.cor}" style="width:100%; height:45px; border:none; border-radius:8px; cursor:pointer; padding:0;"></div>
                    </div>
                    
                    ${c.tipo === 'cartao' ? `
                    <div class="grid-inputs mb-10">
                        <div><label class="label-moderno">Limite Total (R$)</label><input type="number" id="edit-limite-${c.id}" class="input-moderno" value="${c.limite}"></div>
                        <div><label class="label-moderno">Meta Mensal (R$)</label><input type="number" id="edit-meta-${c.id}" class="input-moderno" value="${c.meta}"></div>
                    </div>
                    <div class="grid-inputs mb-10">
                        <div><label class="label-moderno">Dia Fechamento</label><input type="number" id="edit-fecha-${c.id}" class="input-moderno" value="${c.fechamento}"></div>
                        <div><label class="label-moderno">Dia Vencimento</label><input type="number" id="edit-venc-${c.id}" class="input-moderno" value="${c.vencimento}"></div>
                    </div>
                    ` : `
                    <div class="grid-inputs mb-10">
                        <div><label class="label-moderno">Saldo Atual (R$)</label><input type="number" id="edit-saldo-${c.id}" class="input-moderno" value="${c.saldo}"></div>
                    </div>
                    `}
                    <button class="btn-primary mt-10" onclick="salvarEdicaoConta('${c.id}')">Salvar Alterações</button>
                </div>
            </div>
        `).join('');
    }

    if (divBackups) {
        let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || [];
        if (hist.length === 0) { divBackups.innerHTML = '<p class="texto-vazio">Nenhum backup local salvo.</p>'; return; }
        
        divBackups.innerHTML = hist.map(b => `
            <div class="flex-between mb-10" style="background:var(--input-bg); padding:10px; border-radius:8px; border:1px solid var(--linha);">
                <div>
                    <strong style="font-size:12px;">${b.nome}</strong>
                    <small style="display:block; font-size:10px; color:var(--texto-sec);">${b.data} • ${b.size}</small>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="btn-primary" style="padding:5px; width:30px;" onclick="restaurarBackupLocal(${b.id})" title="Restaurar"><i class="fas fa-undo"></i></button>
                    <button class="btn-danger" style="padding:5px; width:30px;" onclick="excluirBackupLocal(${b.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }
}

// --- GRÁFICOS (Refinados e Inteligentes para Light/Dark Mode) ---
function renderGrafico() {
    const ctx = document.getElementById('graficoCategorias'); if(!ctx) return;
    const mes = document.getElementById('filtro-mes').value;
    const labels = [], dados = []; const categorias = {};
    
    db.lancamentos.forEach(l => { 
        if(l.efetivado && l.data.substring(0,7) === mes && l.tipo === 'despesa') { 
            categorias[l.cat] = (categorias[l.cat] || 0) + l.valor; 
        } 
    });
    Object.keys(categorias).forEach(k => { labels.push(k); dados.push(categorias[k]); });
    
    if(meuGrafico) meuGrafico.destroy();
    if(dados.length === 0) return; 
    
    // Detecção Inteligente de Tema
    const isDark = document.body.classList.contains('dark-mode');
    const corTexto = isDark ? '#cbd5e1' : '#64748b'; // Texto mais claro no Dark Mode
    const corBorda = isDark ? '#1e293b' : '#ffffff'; // Acompanha a cor do Card
    
    const bgColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#14b8a6', '#64748b'];
    
    meuGrafico = new Chart(ctx, { 
        type: 'doughnut', 
        data: { labels, datasets: [{ data: dados, backgroundColor: bgColors, borderWidth: 3, borderColor: corBorda }] }, 
        options: { 
            responsive: true, maintainAspectRatio: false,
            layout: { padding: 15 },
            plugins: { 
                // Legenda movida para o lado com ícones circulares elegantes
                legend: { position: 'right', labels: { font: {family: 'Inter', size: 11}, color: corTexto, usePointStyle: true, pointStyle: 'circle', padding: 15 } },
                datalabels: { color: '#ffffff', font: {weight: 'bold', size: 11}, formatter: (val) => 'R$ ' + val.toFixed(0) }
            }, 
            cutout: '60%' // Fatias ligeiramente mais espessas
        } 
    });
}

function renderGraficoEvolucao() {
    const ctx = document.getElementById('graficoEvolucao'); if(!ctx) return;
    const labels = [], dados = [];
    
    for (let i = 2; i >= 0; i--) {
        let d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
        let mStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}`;
        labels.push(formatarMesFaturaLogico(`${mStr}-01`, 1).split('/')[0].trim()); 
        let total = 0; 
        db.lancamentos.forEach(l => { if(l.efetivado && l.tipo === 'despesa' && l.data.substring(0,7) === mStr) total += l.valor; });
        dados.push(total);
    }
    
    if(meuGraficoEvolucao) meuGraficoEvolucao.destroy();
    
    // Detecção Inteligente de Tema para o Eixo e Fundo
    const isDark = document.body.classList.contains('dark-mode');
    const corTexto = isDark ? '#94a3b8' : '#64748b';
    const corGrid = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'; // Grade visível no Dark
    const corPontoBorda = isDark ? '#1e293b' : '#ffffff';
    
    meuGraficoEvolucao = new Chart(ctx, { 
        type: 'line', 
        data: { labels, datasets: [{ data: dados, borderColor: '#2563eb', tension: 0.4, fill: true, backgroundColor: isDark ? 'rgba(37, 99, 235, 0.25)' : 'rgba(37, 99, 235, 0.15)', pointBackgroundColor: '#2563eb', pointBorderColor: corPontoBorda, pointBorderWidth: 2, pointRadius: 5 }] }, 
        options: { 
            responsive: true, maintainAspectRatio: false,
            layout: { padding: {top: 25, right: 15} }, 
            plugins: { 
                legend: { display: false },
                datalabels: { align: 'top', color: isDark ? '#60a5fa' : '#2563eb', font: {weight: 'bold', size: 11}, formatter: (val) => 'R$ ' + val.toFixed(0) }
            }, 
            scales: { 
                y: { display: true, border: {display: false}, grid: {color: corGrid}, ticks: {font:{size:10, family:'Inter'}, color: corTexto, callback: (val) => 'R$ '+val} }, 
                x: { grid: { display: false }, ticks: {font:{size:12, family:'Inter', weight: '600'}, color: corTexto} } 
            } 
        } 
    });
}
