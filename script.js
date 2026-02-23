// --- DATABASE v12.0 ---
let db = JSON.parse(localStorage.getItem('ecoDB_v12')) || {
    Nubank: { nome: "Nubank", meta: 1100, limite: 5000, fechamento: 13, vencimento: 20, gastos: [], cor: '#8a05be' },
    MercadoPago: { nome: "Mercado Pago", meta: 800, limite: 3000, fechamento: 10, vencimento: 17, gastos: [], cor: '#009ee3' },
    saldos: { contaNu: 0, contaMP: 0 },
    receitas: [],
    faturasPagas: []
};

// --- FUNÇÃO PARA MOSTRAR/ESCONDER EDIÇÃO ---
function toggleEdicaoCartao(id) {
    const form = document.getElementById(`form-edit-${id}`);
    const info = document.getElementById(`info-estatica-${id}`);
    form.classList.toggle('active');
    
    if(form.classList.contains('active')) {
        // Preenche os inputs com os valores atuais do DB
        const cartao = id === 'nu' ? db.Nubank : db.MercadoPago;
        document.getElementById(`edit-nome-${id}`).value = cartao.nome;
        document.getElementById(`edit-limite-${id}`).value = cartao.limite;
        document.getElementById(`edit-meta-${id}`).value = cartao.meta;
        document.getElementById(`edit-fecha-${id}`).value = cartao.fechamento;
        document.getElementById(`edit-venc-${id}`).value = cartao.vencimento;
        document.getElementById(`edit-cor-${id}`).value = cartao.cor;
    }
}

// --- SALVAR ALTERAÇÕES DO CARTÃO ---
function salvarAlteracoesCartao(id) {
    const cartao = id === 'nu' ? db.Nubank : db.MercadoPago;
    
    cartao.nome = document.getElementById(`edit-nome-${id}`).value;
    cartao.limite = parseFloat(document.getElementById(`edit-limite-${id}`).value);
    cartao.meta = parseFloat(document.getElementById(`edit-meta-${id}`).value);
    cartao.fechamento = parseInt(document.getElementById(`edit-fecha-${id}`).value);
    cartao.vencimento = parseInt(document.getElementById(`edit-venc-${id}`).value);
    cartao.cor = document.getElementById(`edit-cor-${id}`).value;

    localStorage.setItem('ecoDB_v12', JSON.stringify(db));
    document.getElementById(`form-edit-${id}`).classList.remove('active');
    
    // Atualiza as cores dinâmicas no CSS (Opcional: aplicar a cor do cartão)
    if(id === 'nu') document.documentElement.style.setProperty('--nubank', cartao.cor);
    else document.documentElement.style.setProperty('--mercadopago', cartao.cor);

    atualizarUI();
    alert("Dados do cartão atualizados!");
}

// --- ATUALIZAÇÃO DA UI ESPECÍFICA DE CARTÕES ---
function atualizarUICartoes() {
    // Atualiza Labels Nubank
    document.getElementById('label-nome-nu').innerText = db.Nubank.nome;
    document.getElementById('val-meta-nu').innerText = `R$ ${db.Nubank.meta.toFixed(2)}`;
    document.getElementById('val-limite-nu').innerText = `R$ ${db.Nubank.limite.toFixed(2)}`;
    document.getElementById('val-fecha-nu').innerText = db.Nubank.fechamento;
    document.getElementById('val-venc-nu').innerText = db.Nubank.vencimento;
    document.getElementById('card-nu-display').style.borderLeftColor = db.Nubank.cor;

    // Atualiza Labels Mercado Pago
    document.getElementById('label-nome-mp').innerText = db.MercadoPago.nome;
    document.getElementById('val-meta-mp').innerText = `R$ ${db.MercadoPago.meta.toFixed(2)}`;
    document.getElementById('val-limite-mp').innerText = `R$ ${db.MercadoPago.limite.toFixed(2)}`;
    document.getElementById('val-fecha-mp').innerText = db.MercadoPago.fechamento;
    document.getElementById('val-venc-mp').innerText = db.MercadoPago.vencimento;
    document.getElementById('card-mp-display').style.borderLeftColor = db.MercadoPago.cor;
}

// Chame atualizarUICartoes() dentro da sua função atualizarUI() principal
