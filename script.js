// Registra o plugin de texto no Gráfico
Chart.register(ChartDataLabels);

// Banco de Dados
let dbAntigo = JSON.parse(localStorage.getItem('ecoDB_v25')) || JSON.parse(localStorage.getItem('ecoDB_v23')) || {};
let db = {
    contas: dbAntigo.contas || [
        { id: 'c_padrao_mov', nome: 'Conta Padrão', tipo: 'movimentacao', saldo: 0, cor: '#2980b9' },
        { id: 'c_padrao_inv', nome: 'Poupança', tipo: 'investimento', saldo: 0, cor: '#27ae60' },
        { id: 'c_padrao_cred', nome: 'Cartão Padrão', tipo: 'cartao', meta: 1000, limite: 3000, fechamento: 5, vencimento: 10, cor: '#8a05be' }
    ],
    lancamentos: (dbAntigo.lancamentos || []).map(l => ({...l, efetivado: l.efetivado !== false})),
    faturasPagas: dbAntigo.faturasPagas || [],
    recorrencias: dbAntigo.recorrencias || [] 
};

let cartaoAtivoFatura = null;
let meuGrafico = null;

const mesesTexto = {'01':'Janeiro', '02':'Fevereiro', '03':'Março', '04':'Abril', '05':'Maio', '06':'Junho', '07':'Julho', '08':'Agosto', '09':'Setembro', '10':'Outubro', '11':'Novembro', '12':'Dezembro'};
function formatarMesFatura(mesAnoStr) { const [ano, mes] = mesAnoStr.split('-'); return `${mesesTexto[mes]} - ${ano}`; }

window.onload = () => {
    if (localStorage.getItem('ecoTheme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('btn-theme').classList.replace('fa-moon', 'fa-sun');
    }
    const hoje = new Date();
    document.getElementById('lanc-data').valueAsDate = hoje;
    document.getElementById('filtro-mes').value = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
    
    populaSelectContas();
    atualizarRegrasLancamento();
    verificarDataFutura();
    processarRecorrencias();
    render();
};

// ==========================================
// MOTOR DE STATUS E DATA
// ==========================================

function verificarDataFutura() {
    const dataInput = document.getElementById('lanc-data').value;
    if(!dataInput) return;
    
    const dtLanc = new Date(dataInput + 'T00:00:00');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    
    const checkboxEfetivado = document.getElementById('lanc-efetivado');
    if (dtLanc > hoje) { checkboxEfetivado.checked = false; } 
    else { checkboxEfetivado.checked = true; }
}

function confirmarPagamento(idLancamento) {
    const l = db.lancamentos.find(x => x.id === idLancamento);
    if(!l) return;
    
    l.efetivado = true;
    
    const c = db.contas.find(x => x.id === l.contaId);
    if(c && c.tipo !== 'cartao') {
        if (['receita', 'emp_pessoal', 'compensacao'].includes(l.tipo)) c.saldo += l.valor;
        if (['despesa', 'emp_concedido'].includes(l.tipo)) c.saldo -= l.valor;
    }
    
    save(); 
    alert("Lançamento efetivado com sucesso! O saldo foi atualizado.");
}

// ==========================================
// MOTOR DE RECORRÊNCIA
// ==========================================

function processarRecorrencias() {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear(); const mesAtual = hoje.getMonth() + 1;
    let gerouNovo = false;

    db.recorrencias.forEach(rec => {
        let [anoUltimo, mesUltimo] = rec.ultimoMesGerado.split('-').map(Number);
        
        while (anoUltimo < anoAtual || (anoUltimo === anoAtual && mesUltimo < mesAtual)) {
            mesUltimo++; if (mesUltimo > 12) { mesUltimo = 1; anoUltimo++; }
            
            const mesStr = mesUltimo.toString().padStart(2, '0');
            const dataLancamento = ajustarDataDia(anoUltimo, mesUltimo, rec.diaVencimento);
            
            const dtLanc = new Date(dataLancamento + 'T00:00:00');
            const isEfetivado = dtLanc <= hoje;

            const novoLancamento = {
                id: Date.now() + Math.random(), data: dataLancamento, tipo: rec.tipo, contaId: rec.contaId,
                forma: rec.forma, desc: rec.desc + " (Fixo)", valor: rec.valor, cat: rec.cat, efetivado: isEfetivado
            };
            
            db.lancamentos.push(novoLancamento);
            
            const conta = db.contas.find(c => c.id === rec.contaId);
            if (conta && conta.tipo !== 'cartao' && isEfetivado) {
                if (['receita', 'emp_pessoal', 'compensacao'].includes(rec.tipo)) conta.saldo += rec.valor;
                if (['despesa', 'emp_concedido'].includes(rec.tipo)) conta.saldo -= rec.valor;
            }
            rec.ultimoMesGerado = `${anoUltimo}-${mesStr}`; gerouNovo = true;
        }
    });
    if (gerouNovo) save();
}

function ajustarDataDia(ano, mes, diaVencimentoOriginal) {
    const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
    const diaReal = diaVencimentoOriginal > ultimoDiaDoMes ? ultimoDiaDoMes : diaVencimentoOriginal;
    return `${ano}-${mes.toString().padStart(2, '0')}-${diaReal.toString().padStart(2, '0')}`;
}

function excluirRecorrencia(idRecorrencia) {
    if(!confirm("Cancelar lançamento fixo? (Os passados não serão apagados)")) return;
    db.recorrencias = db.recorrencias.filter(r => r.id !== idRecorrencia); save(); alert("Cancelado!");
}

// ==========================================
// FUNÇÕES GERAIS E INTERFACE
// ==========================================

function toggleDarkMode() {
    const body = document.body; const icone = document.getElementById('btn-theme');
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('ecoTheme', isDark ? 'dark' : 'light');
    icone.classList.replace(isDark ? 'fa-moon' : 'fa-sun', isDark ? 'fa-sun' : 'fa-moon');
    renderGrafico();
}

function navegar(idAba, el) {
    document.querySelectorAll('.secao-app').forEach(s => s.classList.remove('active'));
    document.getElementById('aba-' + idAba).classList.add('active');
    
    // Atualiza menu inferior
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    if(el) el.classList.add('active');
    else {
        // Fallback caso venha por botão direto
        const mapaId = {'dashboard':0, 'faturas':1, 'historico':2, 'contas':3, 'config':4};
        document.querySelectorAll('.menu-item')[mapaId[idAba]].classList.add('active');
    }

    const itemAtivo = document.querySelector('.menu-item.active span');
    if(itemAtivo) document.getElementById('titulo-aba').innerText = itemAtivo.innerText;
    
    if(idAba === 'historico') renderHistorico(); 
    render();
}

function toggleAccordion(id) { document.getElementById(id).classList.toggle('active'); }
function toggleCamposCartao() { document.getElementById('campos-cartao-add').style.display = document.getElementById('nova-conta-tipo').value === 'cartao' ? 'block' : 'none'; }
function toggleFatura(id) { document.getElementById(id).classList.toggle('show'); }
function toggleEditConta(id) { document.getElementById(`form-edit-${id}`).classList.toggle('active'); }
function toggleEditLancamento(id) { document.getElementById(`edit-lanc-${id}`).classList.toggle('active'); }

function getMesFatura(dataLancamento, diaFechamento) {
    const [anoStr, mesStr, diaStr] = dataLancamento.split('-');
    let ano = parseInt(anoStr); let mes = parseInt(mesStr); let dia = parseInt(diaStr);
    if (dia >= diaFechamento) { mes += 1; if (mes > 12) { mes = 1; ano += 1; } }
    return `${ano}-${mes.toString().padStart(2, '0')}`;
}
function verificaFaturaFechada(mesFatura, diaFechamento) {
    const [anoStr, mesStr] = mesFatura.split('-');
    const dataFechamento = new Date(parseInt(anoStr), parseInt(mesStr) - 1, diaFechamento);
    const dataHoje = new Date(); dataHoje.setHours(0,0,0,0); return dataHoje >= dataFechamento;
}

function populaSelectContas() {
    const select = document.getElementById('lanc-conta'); select.innerHTML = "";
    db.contas.forEach(c => { select.innerHTML += `<option value="${c.id}">${c.tipo === 'cartao'?'💳':(c.tipo==='investimento'?'📈':'🏦')} ${c.nome}</option>`; });
}

function atualizarRegrasLancamento() {
    const tipoLancamento = document.getElementById('lanc-tipo').value;
    let contaSelect = document.getElementById('lanc-conta');
    let conta = db.contas.find(c => c.id === contaSelect.value);
    if(!conta) return;

    let precisaTrocar = false; let tipoAlvo = null;
    if (conta.tipo === 'cartao' && !['despesa', 'emp_cartao'].includes(tipoLancamento)) { precisaTrocar = true; tipoAlvo = 'movimentacao'; } 
    else if (conta.tipo !== 'cartao' && tipoLancamento === 'emp_cartao') { precisaTrocar = true; tipoAlvo = 'cartao'; }

    if (precisaTrocar) {
        let novaConta = db.contas.find(c => c.tipo === tipoAlvo) || db.contas.find(c => c.tipo !== 'cartao');
        if (novaConta) { contaSelect.value = novaConta.id; conta = novaConta; } 
        else { document.getElementById('lanc-tipo').value = 'despesa'; return atualizarRegrasLancamento(); }
    }

    const formaSelect = document.getElementById('lanc-forma');
    if (conta.tipo === 'cartao') { formaSelect.innerHTML = `<option value="Crédito">💳 Crédito</option><option value="Estorno">↩️ Estorno</option>`; } 
    else if (conta.tipo === 'movimentacao') { formaSelect.innerHTML = `<option value="Pix">📱 Pix</option><option value="Boleto">📄 Boleto</option><option value="Débito">🏧 Débito</option>`; } 
    else if (conta.tipo === 'investimento') { formaSelect.innerHTML = `<option value="Transferencia">🔄 Transferência</option>`; }
}

function adicionarLancamento() {
    const data = document.getElementById('lanc-data').value;
    const tipo = document.getElementById('lanc-tipo').value;
    const contaId = document.getElementById('lanc-conta').value;
    const desc = document.getElementById('lanc-desc').value;
    const valor = parseFloat(document.getElementById('lanc-valor').value);
    const cat = document.getElementById('lanc-cat').value;
    const isFixo = document.getElementById('lanc-fixo').checked;
    const efetivado = document.getElementById('lanc-efetivado').checked; 

    if(!desc || isNaN(valor) || !data) return alert("Preencha todos os dados.");

    const conta = db.contas.find(c => c.id === contaId);
    
    if (conta.tipo !== 'cartao' && efetivado) {
        if (['receita', 'emp_pessoal', 'compensacao'].includes(tipo)) conta.saldo += valor;
        if (['despesa', 'emp_concedido'].includes(tipo)) conta.saldo -= valor;
    }
    
    db.lancamentos.push({ id: Date.now(), data, tipo, contaId, forma: document.getElementById('lanc-forma').value, desc, valor, cat, efetivado });

    if (isFixo) {
        const [anoStr, mesStr, diaStr] = data.split('-');
        db.recorrencias.push({ id: Date.now() + 1, diaVencimento: parseInt(diaStr), tipo, contaId, forma: document.getElementById('lanc-forma').value, desc, valor, cat, ultimoMesGerado: `${anoStr}-${mesStr}` });
    }

    save(); alert(efetivado ? "Lançamento Registrado!" : "Lançamento Pendente Salvo!");
    document.getElementById('lanc-desc').value = ""; document.getElementById('lanc-valor').value = ""; document.getElementById('lanc-fixo').checked = false; verificarDataFutura();
}

function excluirLancamento(idLancamento) {
    if(!confirm("Apagar lançamento? O saldo será recalculado automaticamente.")) return;
    const lancamento = db.lancamentos.find(l => l.id === idLancamento);
    if(!lancamento) return;
    
    const conta = db.contas.find(c => c.id === lancamento.contaId);
    if(conta && conta.tipo !== 'cartao' && lancamento.efetivado) {
        if (['receita', 'emp_pessoal', 'compensacao'].includes(lancamento.tipo)) conta.saldo -= lancamento.valor;
        if (['despesa', 'emp_concedido'].includes(lancamento.tipo)) conta.saldo += lancamento.valor;
    }
    db.lancamentos = db.lancamentos.filter(l => l.id !== idLancamento);
    save(); renderHistorico(); alert("Excluído!");
}

function salvarEdicaoLancamento(idLancamento) {
    const l = db.lancamentos.find(x => x.id === idLancamento);
    const novoValor = parseFloat(document.getElementById(`e-lanc-val-${idLancamento}`).value);
    const novaData = document.getElementById(`e-lanc-data-${idLancamento}`).value;
    const novaDesc = document.getElementById(`e-lanc-desc-${idLancamento}`).value;

    if(!novaDesc || isNaN(novoValor) || !novaData) return alert("Preencha todos os dados.");

    const c = db.contas.find(x => x.id === l.contaId);
    if(c && c.tipo !== 'cartao' && l.efetivado) {
        const diferenca = novoValor - l.valor;
        if(['receita', 'emp_pessoal', 'compensacao'].includes(l.tipo)) c.saldo += diferenca;
        if(['despesa', 'emp_concedido'].includes(l.tipo)) c.saldo -= diferenca;
    }

    l.valor = novoValor; l.data = novaData; l.desc = novaDesc; l.cat = document.getElementById(`e-lanc-cat-${idLancamento}`).value;
    save(); renderHistorico(); alert("Atualizado!");
}

// ... Contas (criar, salvar, excluir) ...
function criarConta() { const n = document.getElementById('nova-conta-nome').value; const t = document.getElementById('nova-conta-tipo').value; if(!n) return; const nc = {id: 'c_'+Date.now(), nome: n, tipo: t, cor: document.getElementById('nova-conta-cor').value, saldo: 0}; if(t === 'cartao'){ nc.limite = parseFloat(document.getElementById('nova-conta-limite').value)||0; nc.meta = parseFloat(document.getElementById('nova-conta-meta').value)||0; nc.fechamento = parseInt(document.getElementById('nova-conta-fecha').value)||1; nc.vencimento = parseInt(document.getElementById('nova-conta-venc').value)||1; } db.contas.push(nc); save(); populaSelectContas(); document.getElementById('nova-conta-nome').value=""; }
function salvarEdicaoConta(id) { const c = db.contas.find(x=>x.id===id); c.nome = document.getElementById(`edit-nome-${id}`).value; c.cor = document.getElementById(`edit-cor-${id}`).value; if(c.tipo === 'cartao'){ c.limite = parseFloat(document.getElementById(`edit-limite-${id}`).value)||0; c.meta = parseFloat(document.getElementById(`edit-meta-${id}`).value)||0; c.fechamento = parseInt(document.getElementById(`edit-fecha-${id}`).value)||1; c.vencimento = parseInt(document.getElementById(`edit-venc-${id}`).value)||1; } else { c.saldo = parseFloat(document.getElementById(`edit-saldo-${id}`).value)||0; } toggleEditConta(id); save(); populaSelectContas(); }
function excluirConta(id) { if(confirm("Excluir conta?")){ db.contas = db.contas.filter(c=>c.id!==id); db.lancamentos = db.lancamentos.filter(l=>l.contaId!==id); save(); populaSelectContas(); } }
function alternarPagamentoFatura(id) { const i = db.faturasPagas.indexOf(id); if(i > -1) db.faturasPagas.splice(i,1); else db.faturasPagas.push(id); save(); }
function save() { localStorage.setItem('ecoDB_v25', JSON.stringify(db)); render(); }

// ==========================================
// RENDERIZAÇÃO
// ==========================================

function render() {
    const hoje = new Date();
    const mesCorrente = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
    let calc = { despesas: 0, receitas: 0, fatAberta: 0, fatFechada: 0, saldoLivre: 0, investido: 0, usoMetaCartao: 0, metaTotalCartao: 0 };

    db.contas.forEach(c => {
        if(c.tipo === 'movimentacao') calc.saldoLivre += c.saldo;
        if(c.tipo === 'investimento') calc.investido += c.saldo;
        if(c.tipo === 'cartao') calc.metaTotalCartao += c.meta;
    });

    db.lancamentos.forEach(l => {
        const conta = db.contas.find(c => c.id === l.contaId);
        if(!conta) return;

        if (l.efetivado !== false && l.data.substring(0,7) === mesCorrente) {
            if (l.tipo === 'despesa') calc.despesas += l.valor;
            if (l.tipo === 'receita') calc.receitas += l.valor;
        }

        if (conta.tipo === 'cartao') {
            const mesFatura = getMesFatura(l.data, conta.fechamento);
            const fatID = `${conta.id}-${mesFatura}`;
            if (!db.faturasPagas.includes(fatID) && (l.tipo === 'despesa' || l.tipo === 'emp_cartao')) {
                if (verificaFaturaFechada(mesFatura, conta.fechamento)) calc.fatFechada += l.valor; else calc.fatAberta += l.valor;
            }
            if (mesFatura === getMesFatura(hoje.toISOString().split('T')[0], conta.fechamento) && l.tipo === 'despesa') calc.usoMetaCartao += l.valor;
        }
    });

    document.getElementById('dash-receitas').innerText = `R$ ${calc.receitas.toFixed(2)}`;
    document.getElementById('dash-despesas').innerText = `R$ ${calc.despesas.toFixed(2)}`;
    document.getElementById('dash-fat-aberta').innerText = `R$ ${calc.fatAberta.toFixed(2)}`;
    document.getElementById('dash-fat-fechada').innerText = `R$ ${calc.fatFechada.toFixed(2)}`;
    document.getElementById('dash-saldo-livre').innerText = `R$ ${calc.saldoLivre.toFixed(2)}`;
    document.getElementById('dash-investido').innerText = `R$ ${calc.investido.toFixed(2)}`;
    document.getElementById('uso-meta-texto').innerText = `R$ ${calc.usoMetaCartao.toFixed(2)} / R$ ${calc.metaTotalCartao.toFixed(2)}`;
    
    const pMeta = calc.metaTotalCartao > 0 ? (calc.usoMetaCartao / calc.metaTotalCartao) * 100 : 0;
    document.getElementById('meta-bar').style.width = Math.min(pMeta, 100) + "%";
    
    renderGrafico(); renderAbaContas(); renderAbaConfig(); renderAbaFaturas(); renderRecorrencias();
}

function renderGrafico() {
    const ctx = document.getElementById('graficoCategorias'); if(!ctx) return;
    const mesCorrente = document.getElementById('filtro-mes').value || new Date().toISOString().substring(0,7);
    const dadosGasto = {};
    const corTexto = document.body.classList.contains('dark-mode') ? '#e0e0e0' : '#2d3436';
    
    db.lancamentos.forEach(l => {
        if(l.efetivado !== false && l.data.substring(0,7) === mesCorrente && l.tipo === 'despesa') {
            const cat = l.cat || 'Outros'; if(!dadosGasto[cat]) dadosGasto[cat] = 0; dadosGasto[cat] += l.valor;
        }
    });

    const labels = Object.keys(dadosGasto); const data = Object.values(dadosGasto);
    if(meuGrafico) meuGrafico.destroy();
    if(labels.length === 0) { meuGrafico = new Chart(ctx, { type: 'doughnut', data: { labels: ['Sem gastos pagos'], datasets: [{ data: [1], backgroundColor: ['#cccccc'] }] }, options: { plugins: { legend: { display: false }, datalabels: { display: false } } } }); return; }

    const cores = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fdcb6e', '#e17055', '#00b894'];
    meuGrafico = new Chart(ctx, { type: 'doughnut', data: { labels, datasets: [{ data, backgroundColor: cores.slice(0, labels.length), borderWidth: document.body.classList.contains('dark-mode') ? 0 : 2 }] }, options: { responsive: true, maintainAspectRatio: false, layout: { padding: 20 }, plugins: { legend: { position: 'right', labels: { color: corTexto, font: { size: 11 } } }, datalabels: { color: '#fff', font: { weight: 'bold', size: 10 }, formatter: (value) => 'R$ ' + value.toFixed(2).replace('.', ','), align: 'center', anchor: 'center', textStrokeColor: 'rgba(0,0,0,0.5)', textStrokeWidth: 2 } } } });
}

function renderHistorico() {
    const lista = document.getElementById('lista-historico-filtros'); if(!lista) return;
    const mesFiltro = document.getElementById('filtro-mes').value; const catFiltro = document.getElementById('filtro-cat').value;

    let lancFiltrados = db.lancamentos.filter(l => (l.data.substring(0,7) === mesFiltro) && (catFiltro === 'todas' ? true : l.cat === catFiltro)).sort((a, b) => new Date(b.data) - new Date(a.data));
    if(lancFiltrados.length === 0) { lista.innerHTML = "<div class='card' style='text-align:center;'>Nenhum lançamento encontrado.</div>"; return; }

    const hoje = new Date(); hoje.setHours(0,0,0,0);

    lista.innerHTML = lancFiltrados.map(l => {
        const c = db.contas.find(x => x.id === l.contaId);
        const corValor = (l.tipo === 'despesa' || l.tipo === 'emp_concedido') ? 'var(--perigo)' : 'var(--sucesso)';
        const sinal = (l.tipo === 'despesa' || l.tipo === 'emp_concedido') ? '-' : '+';
        
        // INTELIGÊNCIA DE STATUS (Pendente, Pago, Atrasado)
        let isPendente = false; let isAtrasado = false;
        
        if (c && c.tipo === 'cartao') {
            const mesFatura = getMesFatura(l.data, c.fechamento);
            const fatID = `${c.id}-${mesFatura}`;
            const isPaga = db.faturasPagas.includes(fatID);
            
            if (!isPaga) {
                isPendente = true;
                const [anoF, mesF] = mesFatura.split('-');
                const dataVenc = new Date(parseInt(anoF), parseInt(mesF) - 1, c.vencimento);
                if (hoje > dataVenc) isAtrasado = true; // Se não pagou e já passou o vencimento
            }
        } else {
            if (l.efetivado === false) {
                isPendente = true;
                const dtLanc = new Date(l.data + 'T00:00:00');
                if (dtLanc < hoje) isAtrasado = true; // Se era pra pagar ontem e não clicou em Efetivar
            }
        }

        let badge = ''; let extraClass = ''; let btnPagar = '';
        
        if (isAtrasado) { badge = '<span class="badge-hist-atrasado">Atrasado</span>'; extraClass = 'lanc-atrasado'; } 
        else if (isPendente) { badge = '<span class="badge-pendente">Pendente</span>'; extraClass = 'lanc-pendente'; }

        if (isPendente && c && c.tipo !== 'cartao') {
            btnPagar = `<button class="btn-confirmar" onclick="confirmarPagamento(${l.id})"><i class="fas fa-check"></i> Pagar Agora</button>`;
        } else if (isPendente && c && c.tipo === 'cartao') {
            // Cartão joga o usuário para a aba faturas
            btnPagar = `<button class="btn-confirmar" style="background:var(--azul);" onclick="navegar('faturas')"><i class="fas fa-file-invoice"></i> Pagar Fatura</button>`;
        }

        return `
        <div class="card ${extraClass}" style="margin-bottom: 10px; padding: 15px; border-left: 4px solid ${c ? c.cor : '#ccc'};">
            <div class="item-linha" style="border:none; padding:0;">
                <div class="hist-info">
                    <b style="color:var(--texto-main); font-size:14px;">${l.desc} ${badge}</b>
                    <small style="color:var(--texto-sec);">${l.data.split('-').reverse().join('/')} • ${c ? c.nome : ''} • ${l.cat}</small>
                    ${btnPagar}
                </div>
                <div style="text-align: right;">
                    <b style="color: ${corValor}; display:block;">${sinal} R$ ${l.valor.toFixed(2)}</b>
                    <div style="margin-top:5px; display:flex; gap:5px; justify-content:flex-end;">
                        <button class="btn-lapis" onclick="toggleEditLancamento(${l.id})" style="width:24px; height:24px; font-size:10px;"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-del" onclick="excluirLancamento(${l.id})" style="font-size:10px;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
            <div id="edit-lanc-${l.id}" class="edit-lanc-box">
                <div class="grid-inputs"><input type="date" id="e-lanc-data-${l.id}" value="${l.data}"><input type="number" id="e-lanc-val-${l.id}" value="${l.valor}"></div>
                <input type="text" id="e-lanc-desc-${l.id}" value="${l.desc}" style="margin-bottom:10px;">
                <select id="e-lanc-cat-${l.id}">
                    <option value="${l.cat}">${l.cat} (Atual)</option>
                    <option value="Alimentação">🛒 Alimentação</option><option value="Transporte">🚗 Transporte</option>
                    <option value="Moradia">🏠 Moradia</option><option value="Salário">💰 Salário</option>
                    <option value="Lazer">🍿 Lazer</option><option value="Saúde">💊 Saúde</option>
                    <option value="Terceiros">👥 Terceiros</option><option value="Outros">⚙️ Outros</option>
                </select>
                <button class="btn-main" onclick="salvarEdicaoLancamento(${l.id})" style="background:var(--sucesso); margin-top:10px;">SALVAR EDIÇÃO</button>
            </div>
        </div>`;
    }).join('');
}

function renderAbaContas() { 
    const lista = document.getElementById('lista-contas-saldos'); if(!lista) return; 
    
    // FILTRO DE MÊS ATIVADO AQUI NA ABA CONTAS TAMBÉM
    const mesFiltro = document.getElementById('filtro-mes').value;
    const mesFormatado = mesFiltro.split('-').reverse().join('/');
    
    lista.innerHTML = `<h3><i class="fas fa-exchange-alt"></i> Contas (Filtrado: ${mesFormatado})</h3>`; 
    
    db.contas.filter(c => c.tipo !== 'cartao').forEach(c => { 
        const lancConta = db.lancamentos.filter(l => l.contaId === c.id && l.data.substring(0,7) === mesFiltro).sort((a,b) => new Date(b.data) - new Date(a.data));
        lista.innerHTML += `
        <div class="conta-bloco">
            <div class="conta-resumo" style="border-left-color:${c.cor}" onclick="toggleFatura('det-conta-${c.id}')">
                <div><strong style="font-size:16px; color:var(--texto-main);">${c.nome}</strong><div style="font-size:11px; color:var(--texto-sec);">${c.tipo}</div></div>
                <div style="text-align:right;"><b style="font-size:16px; color:${c.tipo === 'movimentacao' ? 'var(--texto-main)' : 'var(--azul)'};">R$ ${c.saldo.toFixed(2)}</b></div>
            </div>
            <div class="conta-detalhes" id="det-conta-${c.id}">
                ${lancConta.length === 0 ? `<div style="text-align:center; padding:10px; color:var(--texto-sec); font-size:12px;">Nenhum lançamento neste mês</div>` : 
                lancConta.map(l => `<div class="item-linha"><div style="display:flex; flex-direction:column;"><span style="color:var(--texto-main); font-weight: bold;">${l.desc}</span><small style="color:var(--texto-sec); font-size: 11px;">${l.data.split('-').reverse().join('/')}</small></div><b style="color:${(l.tipo==='despesa'||l.tipo==='emp_concedido')?'var(--perigo)':'var(--sucesso)'};">${(l.tipo==='despesa'||l.tipo==='emp_concedido')?'-':'+'} R$ ${l.valor.toFixed(2)}</b></div>`).join('')}
            </div>
        </div>`;
    });
}

function renderAbaFaturas() {
    const cartoes = db.contas.filter(c => c.tipo === 'cartao');
    const abas = document.getElementById('abas-cartoes-fatura');
    const container = document.getElementById('lista-faturas-agrupadas');
    
    if(cartoes.length === 0) { abas.innerHTML = ""; container.innerHTML = "<p style='text-align:center; padding:20px; color:var(--texto-sec);'>Nenhum cartão cadastrado.</p>"; return; }
    if(!cartaoAtivoFatura || !cartoes.find(c => c.id === cartaoAtivoFatura)) cartaoAtivoFatura = cartoes[0].id;

    abas.innerHTML = cartoes.map(c => `<button class="tab-btn ${c.id === cartaoAtivoFatura ? 'active' : ''}" style="${c.id === cartaoAtivoFatura ? 'border-top: 4px solid '+c.cor+';' : ''}" onclick="cartaoAtivoFatura='${c.id}'; render();">${c.nome}</button>`).join('');

    const cartao = cartoes.find(c => c.id === cartaoAtivoFatura);
    const lancCartao = db.lancamentos.filter(l => l.contaId === cartao.id);
    const agrupado = {};

    lancCartao.forEach(l => {
        const mesFatura = getMesFatura(l.data, cartao.fechamento);
        if(!agrupado[mesFatura]) agrupado[mesFatura] = { total: 0, itens: [] };
        agrupado[mesFatura].total += l.valor; agrupado[mesFatura].itens.push(l);
    });

    container.innerHTML = "";
    Object.keys(agrupado).sort().reverse().forEach(mes => {
        const fatID = `${cartao.id}-${mes}`;
        const isPaga = db.faturasPagas.includes(fatID);
        const isFechada = verificaFaturaFechada(mes, cartao.fechamento);
        
        // INTELIGÊNCIA: Verifica se a fatura não foi paga e a data de vencimento já passou
        const [anoF, mesF] = mes.split('-');
        const dataVenc = new Date(parseInt(anoF), parseInt(mesF) - 1, cartao.vencimento);
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const isAtrasada = !isPaga && hoje > dataVenc;

        let statusClass = isPaga ? 'badge-paga' : (isAtrasada ? 'badge-atrasada' : (isFechada ? 'badge-fechada' : 'badge-aberta'));
        let statusTxt = isPaga ? '<i class="fas fa-check"></i> PAGA' : (isAtrasada ? 'ATRASADA!' : (isFechada ? 'FECHADA' : 'ABERTA'));
        
        container.innerHTML += `
        <div class="fatura-bloco">
            <div class="fatura-resumo" style="border-left-color:${cartao.cor}" onclick="toggleFatura('det-${mes}')">
                <div><strong style="font-size:16px; color:var(--texto-main); text-transform: capitalize;">${formatarMesFatura(mes)}</strong><div style="font-size:11px; color:var(--texto-sec);">Vence dia ${cartao.vencimento}</div></div>
                <div style="text-align:right;"><b style="font-size:16px; display:block; margin-bottom:5px; color:var(--texto-main);">R$ ${agrupado[mes].total.toFixed(2)}</b>
                <span class="badge-status ${statusClass}" onclick="event.stopPropagation(); alternarPagamentoFatura('${fatID}')">${statusTxt}</span></div>
            </div>
            <div class="fatura-detalhes" id="det-${mes}">
                ${agrupado[mes].itens.map(i => `<div class="item-linha"><div style="display:flex; flex-direction:column;"><span style="color:var(--texto-main); font-weight: bold;">${i.desc}</span><small style="color:var(--texto-sec); font-size: 11px;">${i.data.split('-').reverse().join('/')}</small></div><b style="color:var(--texto-main);">R$ ${i.valor.toFixed(2)}</b></div>`).join('')}
            </div>
        </div>`;
    });
}

function renderRecorrencias() {
    const listaRec = document.getElementById('lista-recorrencias-edit');
    if(!listaRec) return;
    if(db.recorrencias.length === 0) {
        listaRec.innerHTML = "<p style='text-align:center; font-size:12px; color:var(--texto-sec); padding: 10px;'>Nenhum lançamento fixo cadastrado.</p>";
    } else {
        listaRec.innerHTML = db.recorrencias.map(r => {
            const cor = (r.tipo === 'despesa') ? 'var(--perigo)' : 'var(--sucesso)';
            return `
            <div class="item-recorrencia">
                <div class="info">
                    <b>${r.desc} <span class="badge-recorrencia">Todo dia ${r.diaVencimento}</span></b>
                    <small>Gerado até: ${formatarMesFatura(r.ultimoMesGerado)}</small>
                </div>
                <div>
                    <div class="valor" style="color:${cor}; margin-bottom: 5px;">R$ ${r.valor.toFixed(2)}</div>
                    <button class="btn-del" onclick="excluirRecorrencia(${r.id})" style="float: right; font-size: 12px;"><i class="fas fa-trash"></i> Cancelar Fixo</button>
                </div>
            </div>`;
        }).join('');
    }
}

function renderAbaConfig() {
    const lista = document.getElementById('lista-contas-edit');
    if(lista) {
        lista.innerHTML = "";
        db.contas.forEach(c => {
            let camposExtras = c.tipo === 'cartao' 
                ? `<div class="grid-inputs" style="margin-top:10px;"><div><label>Limite</label><input type="number" id="edit-limite-${c.id}" value="${c.limite}"></div><div><label>Meta</label><input type="number" id="edit-meta-${c.id}" value="${c.meta}"></div></div><div class="grid-inputs"><div><label>Fecha</label><input type="number" id="edit-fecha-${c.id}" value="${c.fechamento}"></div><div><label>Vence</label><input type="number" id="edit-venc-${c.id}" value="${c.vencimento}"></div></div>` 
                : `<div class="grid-inputs" style="margin-top:10px;"><div><label>Saldo Atual (R$)</label><input type="number" id="edit-saldo-${c.id}" value="${c.saldo}"></div></div>`;

            lista.innerHTML += `
            <div class="conta-edit-box" style="border-left: 5px solid ${c.cor};">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:var(--texto-main);">${c.nome} <small style="color:var(--texto-sec);">(${c.tipo})</small></strong>
                    <div><button class="btn-lapis" onclick="toggleEditConta('${c.id}')"><i class="fas fa-pencil-alt"></i></button><button class="btn-del" onclick="excluirConta('${c.id}')"><i class="fas fa-trash"></i></button></div>
                </div>
                <div id="form-edit-${c.id}" class="painel-edit">
                    <label>Nome</label><input type="text" id="edit-nome-${c.id}" value="${c.nome}">
                    ${camposExtras}
                    <label style="margin-top:10px;">Cor</label><input type="color" id="edit-cor-${c.id}" value="${c.cor}" style="height:40px; padding:0; border:none; border-radius:8px;">
                    <button class="btn-main" onclick="salvarEdicaoConta('${c.id}')" style="background:var(--sucesso); margin-top:10px;">SALVAR ALTERAÇÕES</button>
                </div>
            </div>`;
        });
    }

    const listaBackups = document.getElementById('lista-backups');
    if(listaBackups) {
        let historico = JSON.parse(localStorage.getItem('ecoDB_backups')) || [];
        if(historico.length === 0) { listaBackups.innerHTML = "<p style='font-size:12px; color:var(--texto-sec);'>Nenhum backup gerado ainda.</p>"; } 
        else {
            listaBackups.innerHTML = historico.map(b => `
                <div class="item-backup">
                    <div class="item-backup-info"><strong>${b.nome}</strong><small>${b.data} | ${b.versao} | ${b.size}</small></div>
                    <div><button class="btn-restaurar" onclick="restaurarBackupLocal(${b.id})" title="Restaurar"><i class="fas fa-undo"></i></button><button class="btn-excluir-bkp" onclick="excluirBackupLocal(${b.id})" title="Apagar"><i class="fas fa-trash"></i></button></div>
                </div>`).join('');
        }
    }
}

function excluirBackupLocal(id) { if(confirm("Apagar este backup?")) { let historico = JSON.parse(localStorage.getItem('ecoDB_backups')) || []; historico = historico.filter(b => b.id !== id); localStorage.setItem('ecoDB_backups', JSON.stringify(historico)); renderAbaConfig(); } }
function restaurarBackupLocal(id) { if(confirm("Substituir dados atuais?")) { let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || []; let bkp = hist.find(b => b.id === id); if(bkp) { localStorage.setItem('ecoDB_v25', bkp.payload); location.reload(); } } }
function exportarBackup() { const dataStr = JSON.stringify(db); const sizeKB = (new Blob([dataStr]).size / 1024).toFixed(1) + " KB"; const now = new Date(); const nomeArquivo = `Backup_Eco_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours()}${now.getMinutes()}.json`; let hist = JSON.parse(localStorage.getItem('ecoDB_backups')) || []; hist.unshift({ id: Date.now(), nome: nomeArquivo, data: now.toLocaleDateString('pt-BR')+' '+now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), size: sizeKB, versao: "v25.2", payload: dataStr }); if(hist.length > 5) hist.pop(); localStorage.setItem('ecoDB_backups', JSON.stringify(hist)); const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(dataStr); a.download = nomeArquivo; a.click(); renderAbaConfig(); alert("Backup gerado!"); }
function importarArquivoJSON(event) { const file = event.target.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const json = JSON.parse(e.target.result); if(json && json.contas) { localStorage.setItem('ecoDB_v25', JSON.stringify(json)); location.reload(); } else alert("Arquivo inválido."); } catch(err) { alert("Erro de leitura."); } }; reader.readAsText(file); }
function confirmarReset() { const palavra = prompt("⚠️ ZONA DE PERIGO\nDigite: excluir"); if (palavra && palavra.toLowerCase() === "excluir") { localStorage.removeItem('ecoDB_v25'); location.reload(); } }