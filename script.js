let dbAntigo = JSON.parse(localStorage.getItem('ecoDB_v19')) || {};
let db = JSON.parse(localStorage.getItem('ecoDB_v20')) || {
    contas: dbAntigo.contas || [
        { id: 'c_nu_mov', nome: 'Nubank (Conta)', tipo: 'movimentacao', saldo: 0, cor: '#8a05be' },
        { id: 'c_nu_cred', nome: 'Nubank (Crédito)', tipo: 'cartao', meta: 1100, limite: 5000, fechamento: 5, vencimento: 10, cor: '#8a05be' },
        { id: 'c_mp_inv', nome: 'Caixinha Nubank', tipo: 'investimento', saldo: 0, cor: '#8a05be' }
    ],
    lancamentos: dbAntigo.lancamentos || [],
    faturasPagas: dbAntigo.faturasPagas || []
};

let cartaoAtivoFatura = null;

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

function toggleAccordion(id) { document.getElementById(id).classList.toggle('active'); }
function toggleCamposCartao() {
    const tipo = document.getElementById('nova-conta-tipo').value;
    document.getElementById('campos-cartao-add').style.display = tipo === 'cartao' ? 'block' : 'none';
}
function toggleFatura(id) { document.getElementById(id).classList.toggle('show'); }
function toggleEditConta(id) { document.getElementById(`form-edit-${id}`).classList.toggle('active'); }

function getMesFatura(dataLancamento, diaFechamento) {
    const [anoStr, mesStr, diaStr] = dataLancamento.split('-');
    let ano = parseInt(anoStr); let mes = parseInt(mesStr); let dia = parseInt(diaStr);
    if (dia >= diaFechamento) { mes += 1; if (mes > 12) { mes = 1; ano += 1; } }
    return `${ano}-${mes.toString().padStart(2, '0')}`;
}

function verificaFaturaFechada(mesFatura, diaFechamento) {
    const [anoStr, mesStr] = mesFatura.split('-');
    const dataFechamento = new Date(parseInt(anoStr), parseInt(mesStr) - 1, diaFechamento);
    const dataHoje = new Date(); dataHoje.setHours(0,0,0,0);
    return dataHoje >= dataFechamento;
}

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
    let contaSelect = document.getElementById('lanc-conta');
    let contaId = contaSelect.value;
    let conta = db.contas.find(c => c.id === contaId);

    if(!conta) return;

    // --- NOVA LÓGICA DE TROCA AUTOMÁTICA (Sem Alertas Chatos) ---
    let precisaTrocar = false;
    let tipoAlvo = null;

    if (conta.tipo === 'cartao' && !['despesa', 'emp_cartao'].includes(tipoLancamento)) {
        precisaTrocar = true;
        tipoAlvo = 'movimentacao'; // Se for receita/empréstimo, muda para conta corrente
    } else if (conta.tipo !== 'cartao' && tipoLancamento === 'emp_cartao') {
        precisaTrocar = true;
        tipoAlvo = 'cartao'; // Se for empréstimo de cartão, muda para um cartão
    }

    if (precisaTrocar) {
        let novaConta = db.contas.find(c => c.tipo === tipoAlvo);
        // Se não achar conta corrente, tenta qualquer uma que não seja cartão
        if (!novaConta && tipoAlvo === 'movimentacao') novaConta = db.contas.find(c => c.tipo !== 'cartao');
        
        if (novaConta) {
            contaSelect.value = novaConta.id;
            conta = novaConta; // Atualiza a variável local para continuar a lógica
        } else {
            alert("Você não possui uma conta compatível criada para este tipo de lançamento.");
            document.getElementById('lanc-tipo').value = 'despesa';
            return atualizarRegrasLancamento();
        }
    }
    // ------------------------------------------------------------

    const formaSelect = document.getElementById('lanc-forma');
    formaSelect.innerHTML = "";

    if (conta.tipo === 'cartao') {
        formaSelect.innerHTML = `<option value="Crédito">💳 Crédito</option><option value="Estorno">↩️ Estorno</option>`;
    } else if (conta.tipo === 'movimentacao') {
        if (['despesa', 'emp_concedido'].includes(tipoLancamento)) {
            formaSelect.innerHTML = `<option value="Pix">📱 Pix</option><option value="Boleto">📄 Boleto</option><option value="Débito">🏧 Débito</option>`;
        } else {
            formaSelect.innerHTML = `<option value="Pix">📱 Pix</option><option value="Salário">💵 Salário</option><option value="Boleto">📄 Boleto</option>`;
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

    const conta = db.contas.find(c => c.id === contaId);
    if (conta.tipo !== 'cartao') {
        if (['receita', 'emp_pessoal', 'compensacao'].includes(tipo)) conta.saldo += valor;
        if (['despesa', 'emp_concedido'].includes(tipo)) conta.saldo -= valor;
    }

    db.lancamentos.push({ id: Date.now(), data, tipo, contaId, forma, desc, valor, cat });
    save(); alert("Lançamento Registrado!");
    document.getElementById('lanc-desc').value = ""; document.getElementById('lanc-valor').value = "";
}

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
    db.contas.push(novaConta); save(); populaSelectContas(); alert("Conta criada!");
}

function salvarEdicaoConta(id) {
    const conta = db.contas.find(c => c.id === id);
    conta.nome = document.getElementById(`edit-nome-${id}`).value;
    conta.cor = document.getElementById(`edit-cor-${id}`).value;
    
    if(conta.tipo === 'cartao') {
        conta.limite = parseFloat(document.getElementById(`edit-limite-${id}`).value) || 0;
        conta.meta = parseFloat(document.getElementById(`edit-meta-${id}`).value) || 0;
        conta.fechamento = parseInt(document.getElementById(`edit-fecha-${id}`).value) || 1;
        conta.vencimento = parseInt(document.getElementById(`edit-venc-${id}`).value) || 1;
    } else {
        conta.saldo = parseFloat(document.getElementById(`edit-saldo-${id}`).value) || 0;
    }
    toggleEditConta(id); save(); populaSelectContas(); alert("Conta atualizada!");
}

function excluirConta(id) {
    if(confirm("Excluir esta conta e todos os seus lançamentos?")) {
        db.contas = db.contas.filter(c => c.id !== id);
        db.lancamentos = db.lancamentos.filter(l => l.contaId !== id);
        save(); populaSelectContas();
    }
}

function alternarPagamentoFatura(faturaID) {
    const idx = db.faturasPagas.indexOf(faturaID);
    if(idx > -1) db.faturasPagas.splice(idx, 1);
    else db.faturasPagas.push(faturaID);
    save();
}

function save() { localStorage.setItem('ecoDB_v20', JSON.stringify(db)); render(); }

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

        const mesRealLancamento = l.data.substring(0,7);
        if (mesRealLancamento === mesCorrente) {
            if (l.tipo === 'despesa') calc.despesas += l.valor;
            if (l.tipo === 'receita') calc.receitas += l.valor;
        }

        if (conta.tipo === 'cartao') {
            const mesFatura = getMesFatura(l.data, conta.fechamento);
            const fatID = `${conta.id}-${mesFatura}`;
            const isPaga = db.faturasPagas.includes(fatID);
            const isFechada = verificaFaturaFechada(mesFatura, conta.fechamento);

            if (!isPaga && (l.tipo === 'despesa' || l.tipo === 'emp_cartao')) {
                if (isFechada) calc.fatFechada += l.valor;
                else calc.fatAberta += l.valor;
            }

            if (mesFatura === getMesFatura(hoje.toISOString().split('T')[0], conta.fechamento) && l.tipo === 'despesa') {
                calc.usoMetaCartao += l.valor;
            }
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
    const bar = document.getElementById('meta-bar');
    bar.style.width = Math.min(pMeta, 100) + "%";
    bar.style.background = pMeta > 100 ? "var(--perigo)" : (pMeta > 80 ? "var(--alerta)" : "var(--sucesso)");
    document.getElementById('meta-percentual').innerText = `${pMeta.toFixed(1)}% consumido`;

    renderAbaContas(); renderAbaConfig(); renderAbaFaturas();
}

function renderAbaContas() {
    const lista = document.getElementById('lista-contas-saldos');
    if(!lista) return;
    lista.innerHTML = `<h3><i class="fas fa-exchange-alt"></i> Movimentação</h3>`;
    db.contas.filter(c => c.tipo === 'movimentacao').forEach(c => {
        lista.innerHTML += `<div class="card" style="border-left:5px solid ${c.cor}"><div style="display:flex; justify-content:space-between"><b>${c.nome}</b> <b>R$ ${c.saldo.toFixed(2)}</b></div></div>`;
    });
    lista.innerHTML += `<h3 style="margin-top:20px;"><i class="fas fa-chart-line"></i> Investimentos</h3>`;
    db.contas.filter(c => c.tipo === 'investimento').forEach(c => {
        lista.innerHTML += `<div class="card" style="border-left:5px solid ${c.cor}"><div style="display:flex; justify-content:space-between"><b>${c.nome}</b> <b class="txt-azul">R$ ${c.saldo.toFixed(2)}</b></div></div>`;
    });
}

function renderAbaConfig() {
    const lista = document.getElementById('lista-contas-edit');
    if(!lista) return;
    lista.innerHTML = "";
    db.contas.forEach(c => {
        let camposExtras = '';
        if(c.tipo === 'cartao') {
            camposExtras = `
                <div class="grid-inputs" style="margin-top:10px;">
                    <div><label>Limite Total</label><input type="number" id="edit-limite-${c.id}" value="${c.limite}"></div>
                    <div><label>Meta Limite</label><input type="number" id="edit-meta-${c.id}" value="${c.meta}"></div>
                </div>
                <div class="grid-inputs">
                    <div><label>Dia Fechamento</label><input type="number" id="edit-fecha-${c.id}" value="${c.fechamento}"></div>
                    <div><label>Dia Vencimento</label><input type="number" id="edit-venc-${c.id}" value="${c.vencimento}"></div>
                </div>
            `;
        } else {
            camposExtras = `
                <div class="grid-inputs" style="margin-top:10px;">
                    <div><label>Saldo Atual (R$)</label><input type="number" id="edit-saldo-${c.id}" value="${c.saldo}"></div>
                </div>
            `;
        }

        lista.innerHTML += `
        <div class="conta-edit-box" style="border-left: 5px solid ${c.cor};">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${c.nome} <small style="color:#888;">(${c.tipo})</small></strong>
                <div>
                    <button class="btn-lapis" onclick="toggleEditConta('${c.id}')"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-del" onclick="excluirConta('${c.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div id="form-edit-${c.id}" class="painel-edit">
                <label>Nome da Conta</label><input type="text" id="edit-nome-${c.id}" value="${c.nome}">
                ${camposExtras}
                <label style="margin-top:10px;">Cor</label>
                <input type="color" id="edit-cor-${c.id}" value="${c.cor}" style="height:40px; padding:0; border:none; border-radius:8px;">
                <button class="btn-main" onclick="salvarEdicaoConta('${c.id}')" style="background:var(--sucesso); margin-top:10px;">SALVAR ALTERAÇÕES</button>
            </div>
        </div>`;
    });
}

function renderAbaFaturas() {
    const cartoes = db.contas.filter(c => c.tipo === 'cartao');
    const abas = document.getElementById('abas-cartoes-fatura');
    const container = document.getElementById('lista-faturas-agrupadas');
    
    if(cartoes.length === 0) {
        abas.innerHTML = ""; container.innerHTML = "<p style='text-align:center; padding:20px; color:#999;'>Nenhum cartão cadastrado.</p>";
        return;
    }

    if(!cartaoAtivoFatura || !cartoes.find(c => c.id === cartaoAtivoFatura)) cartaoAtivoFatura = cartoes[0].id;

    abas.innerHTML = cartoes.map(c => `
        <button class="tab-btn ${c.id === cartaoAtivoFatura ? 'active' : ''}" 
        style="${c.id === cartaoAtivoFatura ? 'border-top: 4px solid '+c.cor+';' : ''}" 
        onclick="cartaoAtivoFatura='${c.id}'; render();">${c.nome}</button>
    `).join('');

    const cartao = cartoes.find(c => c.id === cartaoAtivoFatura);
    const lancCartao = db.lancamentos.filter(l => l.contaId === cartao.id);
    const agrupado = {};

    lancCartao.forEach(l => {
        const mesFatura = getMesFatura(l.data, cartao.fechamento);
        if(!agrupado[mesFatura]) agrupado[mesFatura] = { total: 0, itens: [] };
        agrupado[mesFatura].total += l.valor;
        agrupado[mesFatura].itens.push(l);
    });

    container.innerHTML = "";
    Object.keys(agrupado).sort().reverse().forEach(mes => {
        const fatID = `${cartao.id}-${mes}`;
        const isPaga = db.faturasPagas.includes(fatID);
        const isFechada = verificaFaturaFechada(mes, cartao.fechamento);
        
        let statusClass = isPaga ? 'badge-paga' : (isFechada ? 'badge-fechada' : 'badge-aberta');
        let statusTxt = isPaga ? '<i class="fas fa-check"></i> PAGA' : (isFechada ? 'FECHADA' : 'ABERTA');

        container.innerHTML += `
        <div class="fatura-bloco">
            <div class="fatura-resumo" style="border-left-color:${cartao.cor}" onclick="toggleFatura('det-${mes}')">
                <div><strong style="font-size:16px;">${mes}</strong><div style="font-size:11px; color:#888;">Vence dia ${cartao.vencimento}</div></div>
                <div style="text-align:right;"><b style="font-size:16px; display:block; margin-bottom:5px;">R$ ${agrupado[mes].total.toFixed(2)}</b>
                <span class="badge-status ${statusClass}" onclick="event.stopPropagation(); alternarPagamentoFatura('${fatID}')">${statusTxt}</span></div>
            </div>
            <div class="fatura-detalhes" id="det-${mes}">
                ${agrupado[mes].itens.map(i => `<div class="item-linha"><span>${i.data.split('-')[2]} - ${i.desc} <br><small style="color:#aaa;">${i.tipo === 'emp_cartao' ? '(Empréstimo de Cartão)' : ''}</small></span><b>R$ ${i.valor.toFixed(2)}</b></div>`).join('')}
            </div>
        </div>`;
    });
}

function exportarBackup() { const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db)); const a = document.createElement('a'); a.href = data; a.download = 'backup_v20.json'; a.click(); }
function confirmarReset() { if(confirm("Apagar tudo?")) { localStorage.clear(); location.reload(); } }
