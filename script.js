let cartaoAtivoFaturas = "Nubank";
let db = JSON.parse(localStorage.getItem('ecoDB_v7')) || {
    Nubank: { meta: 1100, vencimento: 20, gastos: [], cor: '#8a05be' },
    MercadoPago: { meta: 800, vencimento: 17, gastos: [], cor: '#009ee3' },
    saldos: { contaNu: 0, contaMP: 0 },
    faturasPagas: []
};

// --- NAVEGAÇÃO PRINCIPAL (MENU INFERIOR) ---
function navegar(idAba, elemento) {
    // 1. Ocultar todas as seções
    document.querySelectorAll('.secao-app').forEach(secao => {
        secao.classList.remove('active');
    });

    // 2. Mostrar a seção selecionada
    const abaAlvo = document.getElementById(`aba-${idAba}`);
    if (abaAlvo) {
        abaAlvo.classList.add('active');
    }

    // 3. Atualizar botões do menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    elemento.classList.add('active');

    // 4. Mudar Título
    const titulos = { dashboard: 'Dashboard', cartoes: 'Cartões', faturas: 'Faturas', contas: 'Contas' };
    document.getElementById('titulo-aba').innerText = titulos[idAba];

    atualizarUI();
}

// --- CONTROLE DE CARTÕES NA ABA FATURAS ---
function mudarCartaoFatura(nome) {
    cartaoAtivoFaturas = nome;
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    if(nome === 'Nubank') document.getElementById('tab-nu').classList.add('active');
    else document.getElementById('tab-mp').classList.add('active');
    atualizarUI();
}

// --- FUNÇÕES DE DADOS ---
function adicionarGasto() {
    const data = document.getElementById('lanc-data').value;
    const cartao = document.getElementById('lanc-cartao').value;
    const desc = document.getElementById('lanc-desc').value;
    const valor = parseFloat(document.getElementById('lanc-valor').value);
    const cat = document.getElementById('lanc-cat').value;

    if(!data || !desc || isNaN(valor)) return alert("Preencha todos os campos!");

    db[cartao].gastos.push({ id: Date.now(), data, desc, valor, cat });
    salvar();
    
    document.getElementById('lanc-desc').value = "";
    document.getElementById('lanc-valor').value = "";
}

function salvar() {
    localStorage.setItem('ecoDB_v7', JSON.stringify(db));
    atualizarUI();
}

function toggleFatura(id) {
    document.getElementById(id).classList.toggle('show');
}

function alternarPagamentoFatura(fID) {
    const idx = db.faturasPagas.indexOf(fID);
    if(idx > -1) db.faturasPagas.splice(idx, 1);
    else db.faturasPagas.push(fID);
    salvar();
}

function salvarSaldos() {
    db.saldos.contaNu = document.getElementById('saldo-nu').value;
    db.saldos.contaMP = document.getElementById('saldo-mp').value;
    salvar();
}

function salvarConfig() {
    db.Nubank.meta = document.getElementById('cfg-meta-nu').value;
    db.Nubank.vencimento = document.getElementById('cfg-venc-nu').value;
    db.MercadoPago.meta = document.getElementById('cfg-meta-mp').value;
    db.MercadoPago.vencimento = document.getElementById('cfg-venc-mp').value;
    salvar();
}

// --- ATUALIZAÇÃO VISUAL ---
function atualizarUI() {
    const totalContas = (parseFloat(db.saldos.contaNu) || 0) + (parseFloat(db.saldos.contaMP) || 0);
    let totalFaturasAbertas = 0;

    // Lógica para Faturas do Cartão Selecionado
    const agrupado = {};
    db[cartaoAtivoFaturas].gastos.forEach(g => {
        const mes = g.data.substring(0, 7);
        if(!agrupado[mes]) agrupado[mes] = { total: 0, itens: [] };
        agrupado[mes].total += g.valor;
        agrupado[mes].itens.push(g);
    });

    const containerFaturas = document.getElementById('lista-faturas-agrupadas');
    if(containerFaturas) {
        containerFaturas.innerHTML = "";
        Object.keys(agrupado).sort().reverse().forEach(mes => {
            const fID = `${cartaoAtivoFaturas}-${mes}`;
            const paga = db.faturasPagas.includes(fID);
            const d = agrupado[mes];

            containerFaturas.innerHTML += `
                <div class="fatura-bloco">
                    <div class="fatura-resumo" style="border-left-color: ${db[cartaoAtivoFaturas].cor}" onclick="toggleFatura('det-${mes}')">
                        <div style="display:flex; justify-content:space-between">
                            <strong>${mes}</strong>
                            <b>R$ ${d.total.toFixed(2)}</b>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-top:5px; font-size:11px">
                            <span>Vencimento: dia ${db[cartaoAtivoFaturas].vencimento}</span>
                            <span style="color:${paga ? '#27ae60':'#e74c3c'}; font-weight:bold" onclick="event.stopPropagation(); alternarPagamentoFatura('${fID}')">
                                ${paga ? 'PAGA' : 'ABERTA'}
                            </span>
                        </div>
                    </div>
                    <div class="fatura-detalhes" id="det-${mes}">
                        ${d.itens.map(i => `<div class="item-linha"><span>${i.data.split('-')[2]} - ${i.desc}</span><b>R$ ${i.valor.toFixed(2)}</b></div>`).join('')}
                    </div>
                </div>`;
        });
    }

    // Cálculo Global para Dashboard
    ['Nubank', 'MercadoPago'].forEach(c => {
        const auxArr = {};
        db[c].gastos.forEach(g => {
            const m = g.data.substring(0, 7);
            const fID = `${c}-${m}`;
            if(!db.faturasPagas.includes(fID)) totalFaturasAbertas += g.valor;
        });
    });

    document.getElementById('dash-contas').innerText = `R$ ${totalContas.toFixed(2)}`;
    document.getElementById('dash-faturas').innerText = `R$ ${totalFaturasAbertas.toFixed(2)}`;
    document.getElementById('saldo-liquido').innerText = `R$ ${(totalContas - totalFaturasAbertas).toFixed(2)}`;
}

window.onload = () => {
    document.getElementById('lanc-data').valueAsDate = new Date();
    // Preencher campos de config
    document.getElementById('cfg-meta-nu').value = db.Nubank.meta;
    document.getElementById('cfg-venc-nu').value = db.Nubank.vencimento;
    document.getElementById('cfg-meta-mp').value = db.MercadoPago.meta;
    document.getElementById('cfg-venc-mp').value = db.MercadoPago.vencimento;
    document.getElementById('saldo-nu').value = db.saldos.contaNu;
    document.getElementById('saldo-mp').value = db.saldos.contaMP;
    atualizarUI();
};

function confirmarReset() { if(confirm("Zerar dados?")) { localStorage.clear(); location.reload(); } }
function exportarBackup() {
    const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const a = document.createElement('a'); a.href = data; a.download = 'backup.json'; a.click();
}
