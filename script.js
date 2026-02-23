let cartaoAtual = "Nubank";
let db = JSON.parse(localStorage.getItem('ecoDB_v4')) || {
    Nubank: { total: 0, meta: 1100, limite: 5000, fechamento: 13, vencimento: 20, lene: 406, gastos: [], cor: '#8a05be' },
    MercadoPago: { total: 0, meta: 800, limite: 2000, fechamento: 10, vencimento: 17, lene: 0, gastos: [], cor: '#009ee3' },
    saldos: { contaNu: 0, contaMP: 0 },
    historico: []
};

// --- NAVEGAÇÃO ---
function navegar(aba, elemento) {
    document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    elemento.classList.add('active');
    document.getElementById('titulo-aba').innerText = aba.charAt(0).toUpperCase() + aba.slice(1);
    atualizarUI();
}

// --- LOGICA FINANCEIRA ---
function mudarCartao(nome, elemento) {
    cartaoAtual = nome;
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    elemento.classList.add('active');
    
    // Carregar configurações nos inputs
    const info = db[cartaoAtual];
    document.getElementById('cfg-meta').value = info.meta;
    document.getElementById('cfg-limite').value = info.limite;
    document.getElementById('cfg-fechamento').value = info.fechamento;
    document.getElementById('cfg-vencimento').value = info.vencimento;
    
    atualizarUI();
}

function salvarConfigCartao() {
    db[cartaoAtual].meta = parseFloat(document.getElementById('cfg-meta').value);
    db[cartaoAtual].limite = parseFloat(document.getElementById('cfg-limite').value);
    db[cartaoAtual].fechamento = parseInt(document.getElementById('cfg-fechamento').value);
    db[cartaoAtual].vencimento = parseInt(document.getElementById('cfg-vencimento').value);
    salvar();
}

function salvarSaldos() {
    db.saldos.contaNu = parseFloat(document.getElementById('saldo-nu').value) || 0;
    db.saldos.contaMP = parseFloat(document.getElementById('saldo-mp').value) || 0;
    salvar();
}

function adicionarGasto() {
    const desc = document.getElementById('lanc-desc').value;
    const valor = parseFloat(document.getElementById('lanc-valor').value);
    const data = document.getElementById('lanc-data').value;
    const cat = document.getElementById('lanc-cat').value;

    if(!desc || isNaN(valor) || !data) return alert("Preencha todos os campos!");

    db[cartaoAtual].total += valor;
    db[cartaoAtual].gastos.unshift({ id: Date.now(), d: desc, v: valor, c: cat, data: data });
    
    salvar();
    document.getElementById('lanc-desc').value = "";
    document.getElementById('lanc-valor').value = "";
}

function excluirGasto(id) {
    const index = db[cartaoAtual].gastos.findIndex(g => g.id === id);
    if(index > -1) {
        db[cartaoAtual].total -= db[cartaoAtual].gastos[index].v;
        db[cartaoAtual].gastos.splice(index, 1);
        salvar();
    }
}

function editarGasto(id) {
    const gasto = db[cartaoAtual].gastos.find(g => g.id === id);
    const novoDesc = prompt("Nova descrição:", gasto.d);
    const novoValor = prompt("Novo valor:", gasto.v);
    if(novoDesc && novoValor) {
        db[cartaoAtual].total = (db[cartaoAtual].total - gasto.v) + parseFloat(novoValor);
        gasto.d = novoDesc;
        gasto.v = parseFloat(novoValor);
        salvar();
    }
}

function salvar() {
    localStorage.setItem('ecoDB_v4', JSON.stringify(db));
    atualizarUI();
}

// --- INTERFACE ---
function atualizarUI() {
    const info = db[cartaoAtual];
    const totalContas = db.saldos.contaNu + db.saldos.contaMP;
    const totalFaturas = db.Nubank.total + db.MercadoPago.total;
    const liquido = totalContas - totalFaturas;

    // Dash
    document.getElementById('saldo-liquido').innerText = `R$ ${liquido.toFixed(2)}`;
    document.getElementById('dash-contas').innerText = `R$ ${totalContas.toFixed(2)}`;
    document.getElementById('dash-faturas').innerText = `R$ ${totalFaturas.toFixed(2)}`;
    
    const percScore = (totalFaturas / (db.Nubank.meta + db.MercadoPago.meta)) * 100;
    document.getElementById('score-bar').style.width = Math.min(percScore, 100) + "%";
    document.getElementById('score-valor').innerText = `Uso da Meta: ${percScore.toFixed(1)}%`;

    // Cartão Selecionado
    document.getElementById('fatura-valor-oficial').innerText = `R$ ${info.total.toFixed(2)}`;
    document.getElementById('fatura-meta-ajustada').innerText = `Meta Real: R$ ${(info.total - info.lene).toFixed(2)}`;
    document.getElementById('info-limite-disponivel').innerText = `Limite Disponível: R$ ${(info.limite - info.total).toFixed(2)}`;

    // Listas
    const lista = document.getElementById('lista-lancamentos-fatura');
    lista.innerHTML = info.gastos.map(g => `
        <div class="item-gasto">
            <span onclick="editarGasto(${g.id})"><strong>${g.d}</strong><br><small>${g.data} • ${g.c}</small></span>
            <div>
                <b>R$ ${g.v.toFixed(2)}</b>
                <i class="fas fa-trash btn-del" onclick="excluirGasto(${g.id})"></i>
            </div>
        </div>
    `).join('');

    // Preencher campos de saldo
    document.getElementById('saldo-nu').value = db.saldos.contaNu;
    document.getElementById('saldo-mp').value = db.saldos.contaMP;
}

window.onload = () => {
    // Definir data de hoje no input de lançamento
    document.getElementById('lanc-data').valueAsDate = new Date();
    atualizarUI();
};
