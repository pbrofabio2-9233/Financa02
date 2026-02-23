// DATABASE v19.0 - Nova Estrutura Dinâmica
let db = JSON.parse(localStorage.getItem('ecoDB_v19')) || {
    contas: [
        { id: 'nu_mov', nome: 'Nubank (Conta)', tipo: 'movimentacao', saldo: 0, cor: '#8a05be' },
        { id: 'nu_cred', nome: 'Nubank (Crédito)', tipo: 'cartao', meta: 1100, limite: 5000, fechamento: 13, vencimento: 20, cor: '#8a05be' },
        { id: 'mp_inv', nome: 'Caixinha Nubank', tipo: 'investimento', saldo: 0, cor: '#8a05be' }
    ],
    lancamentos: [],
    faturasPagas: [] // Array de IDs de faturas pagas (Ex: nu_cred-2026-02)
};

let cartaoAtivoFatura = null;

// --- INICIALIZAÇÃO E NAVEGAÇÃO ---
window.onload = () => {
    document.getElementById('lanc-data').valueAsDate = new Date();
    populaSelectContas();
    atualizarRegrasLancamento();
    render();
};

function navegar(idAba, el) {
    document.querySelectorAll('.secao-app').forEach(s => s.classList.remove('active'));
    document.getElementById('aba-' + idAba).classList.add('active');
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('titulo-aba').innerText = el.querySelector('span').innerText;
    render();
}

function toggleAccordion(id) {
    document.getElementById(id).classList.toggle('active');
    const icon = event.currentTarget.querySelector('.fa-chevron-down');
    if(icon) icon.style.transform = document.getElementById(id).classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
}

function toggleCamposCartao() {
    const tipo = document.getElementById('nova-conta-tipo').value;
    document.getElementById('campos-cartao-add').style.display = tipo === 'cartao' ? 'block' : 'none';
}

function toggleFatura(id) { document.getElementById(id).classList.toggle('show'); }

// --- REGRAS DE NEGÓCIO E LANÇAMENTO ---
function populaSelectContas() {
    const select = document.getElementById('lanc-conta');
    select.innerHTML = "";
    db.contas.forEach(c => {
        let icone = c.tipo === 'cartao' ? '💳' : (c.tipo === 'investimento' ? '📈' : '🏦');
        select.innerHTML += `<option value="${c.id}">${icone} ${c.nome}</option>`;
    });
}

function atualizarRegrasLancamento() {
    const tipoLancamento = document.getElementById('lanc-tipo').value;
    const contaId = document.getElementById('lanc-conta').value;
    const conta = db.contas.find(c => c.id === contaId);
    const formaSelect = document.getElementById('lanc-forma');
    
    formaSelect.innerHTML = "";

    if(!conta) return;

    // Bloqueios de Segurança
    if (conta.tipo === 'cartao' && (tipoLancamento === 'receita' || tipoLancamento === 'emp_concedido' || tipoLancamento === 'emp_pessoal' || tipoLancamento === 'compensacao')) {
        alert("Cartões de crédito só aceitam Despesas ou Empréstimos de Cartão.");
        document.getElementById('lanc-tipo').value = 'despesa';
        return atualizarRegrasLancamento();
    }
    if (conta.tipo !== 'cartao' && tipoLancamento === 'emp_cartao') {
        alert("Esta opção é exclusiva para Cartões de Crédito.");
        document.getElementById('lanc-tipo').value = 'despesa';
        return atualizarRegrasLancamento();
    }

    // Regras de Formas de Pagamento
    if (conta.tipo === 'cartao') {
        formaSelect.innerHTML = `<option value="Crédito">💳 Crédito</option><option value="Estorno">↩️ Estorno</option>`;
    } else if (conta.tipo === 'movimentacao') {
        if (tipoLancamento === 'despesa' || tipoLancamento === 'emp_concedido') {
            formaSelect.innerHTML = `<option value="Pix">📱 Pix</option><option value="Boleto">📄 Boleto</option><option value="Débito">🏧 Débito</option>`;
        } else {
            formaSelect.innerHTML = `<option value="Pix">📱 Pix</option><option value="Salário">💵 Salário</option><option value="Estorno">↩️ Estorno</option>`;
        }
    } else if (conta.tipo === 'investimento') {
        formaSelect.innerHTML = `<option value="Transferencia">🔄 Transferência / Rendimento</option>`;
    }
}

function adicionarLancamento() {
    const data = document.getElementById('lanc-data').value;
    const tipo = document.getElementById('lanc-tipo').value;
    const contaId = document.getElementById('lanc-conta').value;
    const forma = document.getElementById('lanc-forma').value;
    const desc = document.getElementById('lanc-desc').value;
    const valor = parseFloat(document.getElementById('lanc-valor').value);
    const cat = document.getElementById('lanc-cat').value;

    if(!desc || isNaN(valor) || !data) return alert("Preencha todos os dados.");

    // Atualização imediata de saldos para contas que não são cartão
    const conta = db.contas.find(c => c.id === contaId);
    if (conta.tipo !== 'cartao') {
        if (tipo === 'receita' || tipo === 'emp_pessoal' || tipo === 'compensacao') conta.saldo += valor;
        if (tipo === 'despesa' || tipo === 'emp_concedido') conta.saldo -= valor;
    }

    db.lancamentos.push({ id: Date.now(), data, tipo, contaId, forma, desc, valor, cat });
    
    save();
    alert("Lançamento Registrado!");
    document.getElementById('lanc-desc').value = "";
    document.getElementById('lanc-valor').value = "";
}

// --- GESTÃO DE CONTAS ---
function criarConta() {
    const nome = document.getElementById('nova-conta-nome').value;
    const tipo = document.getElementById('nova-conta-tipo').value;
    const cor = document.getElementById('nova-conta-cor').value;
    
    if(!nome) return alert("Informe o nome da conta.");

    const novaConta = { id: 'c_' + Date.now(), nome, tipo, cor, saldo: 0 };

    if(tipo === 'cartao') {
        novaConta.limite = parseFloat(document.getElementById('nova-conta-limite').value) || 0;
        novaConta.meta = parseFloat(document.getElementById('nova-conta-meta').value) || 0;
        novaConta.fechamento = parseInt(document.getElementById('nova-conta-fecha').value) || 1;
        novaConta.vencimento = parseInt(document.getElementById('nova-conta-venc').value) || 1;
    }

    db.contas.push(novaConta);
    save();
    populaSelectContas();
    alert("Conta criada!");
}

function excluirConta(id) {
    if(confirm("Deseja realmente excluir esta conta e todos os seus lançamentos?")) {
        db.contas = db.contas.filter(c => c.id !== id);
        db.lancamentos = db.lancamentos.filter(l => l.contaId !== id);
        save();
        populaSelectContas();
    }
}

function alternarPagamentoFatura(faturaID) {
    const idx = db.faturasPagas.indexOf(faturaID);
    if(idx > -1) db.faturasPagas.splice(idx, 1);
    else db.faturasPagas.push(faturaID);
    save();
}

function save() { localStorage.setItem('ecoDB_v19', JSON.stringify(db)); render(); }

// --- RENDERIZAÇÃO E CÁLCULOS (O Coração da v19) ---
function render() {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
    
    let calc = { despesas: 0, receitas: 0, fatAberta: 0, fatFechada: 0, saldoLivre: 0, investido: 0, usoMetaCartao: 0, metaTotalCartao: 0 };

    // Calcula Saldos Fixos
    db.contas.forEach(c => {
        if(c.tipo === 'movimentacao') calc.saldoLivre += c.saldo;
        if(c.tipo === 'investimento') calc.investido += c.saldo;
        if(c.tipo === 'cartao') calc.metaTotalCartao += c.meta;
    });

    // Processa Lançamentos do Mês Atual (Para Despesas e Receitas)
    db.lancamentos.forEach(l => {
        const lMesAno = l.data.substring(0,7);
        const conta = db.contas.find(c => c.id === l.contaId);
        
        // CÁLCULO MÊS ATUAL: Apenas Despesas e Receitas (Ignora Empréstimos na contagem de receita/despesa)
        if (lMesAno === mesAtual) {
            if (l.tipo === 'despesa') calc.despesas += l.valor;
            if (l.tipo === 'receita') calc.receitas += l.valor;
        }

        // CÁLCULO DE FATURAS E METAS (Apenas Cartões)
        if (conta && conta.tipo === 'cartao') {
            const fatID = `${conta.id}-${lMesAno}`;
            const isPaga = db.faturasPagas.includes(fatID);
            const diaLancamento = parseInt(l.data.substring(8,10));
            const isFechada = hoje.getDate() >= conta.fechamento; // Lógica simplificada de fechamento

            if (!isPaga) {
                // Se é gasto no cartão (despesa ou empréstimo de cartão), soma na fatura
                if(l.tipo === 'despesa' || l.tipo === 'emp_cartao') {
                    if(lMesAno === mesAtual && isFechada) calc.fatFechada += l.valor;
                    else calc.fatAberta += l.valor;
                }
            }

            // USO DA META: Soma apenas "despesa", exclui "emp_cartao"
            if (lMesAno === mesAtual && l.tipo === 'despesa') {
                calc.usoMetaCartao += l.valor;
            }
        }
    });

    // ATUALIZA DASHBOARD
    document.getElementById('dash-receitas').innerText = `R$ ${calc.receitas.toFixed(2)}`;
    document.getElementById('dash-despesas').innerText = `R$ ${calc.despesas.toFixed(2)}`;
    document.getElementById('dash-fat-aberta').innerText = `R$ ${calc.fatAberta.toFixed(2)}`;
    document.getElementById('dash-fat-fechada').innerText = `R$ ${calc.fatFechada.toFixed(2)}`;
    document.getElementById('dash-saldo-livre').innerText = `R$ ${calc.saldoLivre.toFixed(2)}`;
    document.getElementById('dash-investido').innerText = `R$ ${calc.investido.toFixed(2)}`;

    // Balão de Meta
    document.getElementById('uso-meta-texto').innerText = `R$ ${calc.usoMetaCartao.toFixed(2)} / R$ ${calc.metaTotalCartao.toFixed(2)}`;
    const pMeta = calc.metaTotalCartao > 0 ? (calc.usoMetaCartao / calc.metaTotalCartao) * 100 : 0;
    const bar = document.getElementById('meta-bar');
    bar.style.width = Math.min(pMeta, 100) + "%";
    bar.style.background = pMeta > 100 ? "var(--perigo)" : (pMeta > 80 ? "var(--alerta)" : "var(--sucesso)");
    document.getElementById('meta-percentual').innerText = `${pMeta.toFixed(1)}% consumido`;

    renderAbaContas();
    renderAbaConfig();
    renderAbaFaturas();
}

function renderAbaContas() {
    const lista = document.getElementById('lista-contas-saldos');
    if(!lista) return;
    lista.innerHTML = `<h3><i class="fas fa-exchange-alt"></i> Movimentação</h3>`;
    db.contas.filter(c => c.tipo === 'movimentacao').forEach(c => {
        lista.innerHTML += `<div class="card" style="border-left:5px solid ${c.cor}">
            <div style="display:flex; justify-content:space-between"><b>${c.nome}</b> <b>R$ ${c.saldo.toFixed(2)}</b></div>
        </div>`;
    });

    lista.innerHTML += `<h3 style="margin-top:20px;"><i class="fas fa-chart-line"></i> Investimentos</h3>`;
    db.contas.filter(c => c.tipo === 'investimento').forEach(c => {
        lista.innerHTML += `<div class="card" style="border-left:5px solid ${c.cor}">
            <div style="display:flex; justify-content:space-between"><b>${c.nome}</b> <b class="txt-azul">R$ ${c.saldo.toFixed(2)}</b></div>
        </div>`;
    });
}

function renderAbaConfig() {
    const lista = document.getElementById('lista-contas-edit');
    if(!lista) return;
    lista.innerHTML = "";
    db.contas.forEach(c => {
        lista.innerHTML += `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee; align-items:center;">
            <span><i class="fas fa-circle" style="color:${c.cor}; font-size:10px;"></i> ${c.nome} <small>(${c.tipo})</small></span>
            <button class="btn-del" onclick="excluirConta('${c.id}')"><i class="fas fa-trash"></i></button>
        </div>`;
    });
}

function renderAbaFaturas() {
    const cartoes = db.contas.filter(c => c.tipo === 'cartao');
    const abas = document.getElementById('abas-cartoes-fatura');
    const container = document.getElementById('lista-faturas-agrupadas');
    
    if(cartoes.length === 0) {
        abas.innerHTML = "";
        container.innerHTML = "<p style='text-align:center; padding:20px; color:#999;'>Nenhum cartão cadastrado.</p>";
        return;
    }

    if(!cartaoAtivoFatura || !cartoes.find(c => c.id === cartaoAtivoFatura)) cartaoAtivoFatura = cartoes[0].id;

    abas.innerHTML = cartoes.map(c => `
        <button class="tab-btn ${c.id === cartaoAtivoFatura ? 'active' : ''}" 
        style="${c.id === cartaoAtivoFatura ? 'border-bottom-color:'+c.cor : ''}" 
        onclick="cartaoAtivoFatura='${c.id}'; render();">${c.nome}</button>
    `).join('');

    const cartao = cartoes.find(c => c.id === cartaoAtivoFatura);
    const lancCartao = db.lancamentos.filter(l => l.contaId === cartao.id);
    const agrupado = {};

    lancCartao.forEach(l => {
        const mes = l.data.substring(0,7);
        if(!agrupado[mes]) agrupado[mes] = { total: 0, itens: [] };
        agrupado[mes].total += l.valor;
        agrupado[mes].itens.push(l);
    });

    container.innerHTML = "";
    Object.keys(agrupado).sort().reverse().forEach(mes => {
        const fatID = `${cartao.id}-${mes}`;
        const isPaga = db.faturasPagas.includes(fatID);
        const dataHoje = new Date();
        const isFechada = dataHoje.getDate() >= cartao.fechamento && mes === `${dataHoje.getFullYear()}-${(dataHoje.getMonth()+1).toString().padStart(2,'0')}`;
        
        let statusClass = isPaga ? 'badge-paga' : (isFechada ? 'badge-fechada' : 'badge-aberta');
        let statusTxt = isPaga ? '<i class="fas fa-check"></i> PAGA' : (isFechada ? 'FECHADA' : 'ABERTA');

        container.innerHTML += `
        <div class="fatura-bloco">
            <div class="fatura-resumo" style="border-left-color:${cartao.cor}" onclick="toggleFatura('det-${mes}')">
                <div>
                    <strong style="font-size:16px;">${mes}</strong>
                    <div style="font-size:11px; color:#888;">Vence dia ${cartao.vencimento}</div>
                </div>
                <div style="text-align:right;">
                    <b style="font-size:16px; display:block; margin-bottom:5px;">R$ ${agrupado[mes].total.toFixed(2)}</b>
                    <span class="badge-status ${statusClass}" onclick="event.stopPropagation(); alternarPagamentoFatura('${fatID}')">${statusTxt}</span>
                </div>
            </div>
            <div class="fatura-detalhes" id="det-${mes}">
                ${agrupado[mes].itens.map(i => `
                    <div class="item-linha">
                        <span>${i.data.split('-')[2]} - ${i.desc} <br><small style="color:#aaa;">${i.tipo === 'emp_cartao' ? '(Empréstimo)' : ''}</small></span>
                        <b>R$ ${i.valor.toFixed(2)}</b>
                    </div>
                `).join('')}
            </div>
        </div>`;
    });
}

function exportarBackup() {
    const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const a = document.createElement('a'); a.href = data; a.download = 'backup_v19.json'; a.click();
}
function confirmarReset() { if(confirm("Apagar tudo?")) { localStorage.clear(); location.reload(); } }
