// Funções de Cartão v14.0
function toggleEdicaoCartao(id) {
    const painel = document.getElementById(`form-edit-${id}`);
    painel.classList.toggle('active');
    
    if(painel.classList.contains('active')) {
        const cartao = id === 'nu' ? db.Nubank : db.MercadoPago;
        document.getElementById(`edit-nome-${id}`).value = cartao.nome || "";
        document.getElementById(`edit-limite-${id}`).value = cartao.limite || 0;
        document.getElementById(`edit-meta-${id}`).value = cartao.meta || 0;
        document.getElementById(`edit-fecha-${id}`).value = cartao.fechamento || 0;
        document.getElementById(`edit-venc-${id}`).value = cartao.vencimento || 0;
        document.getElementById(`edit-cor-${id}`).value = cartao.cor;
    }
}

function salvarAlteracoesCartao(id) {
    const cartao = id === 'nu' ? db.Nubank : db.MercadoPago;
    
    cartao.nome = document.getElementById(`edit-nome-${id}`).value;
    cartao.limite = parseFloat(document.getElementById(`edit-limite-${id}`).value);
    cartao.meta = parseFloat(document.getElementById(`edit-meta-${id}`).value);
    cartao.fechamento = parseInt(document.getElementById(`edit-fecha-${id}`).value);
    cartao.vencimento = parseInt(document.getElementById(`edit-venc-${id}`).value);
    cartao.cor = document.getElementById(`edit-cor-${id}`).value;

    document.getElementById(`form-edit-${id}`).classList.remove('active');
    
    salvar(); // Atualiza LocalStorage e toda a Interface
    alert("Dados atualizados com sucesso!");
}

// Dentro da sua função atualizarUI(), adicione:
function atualizarInfoCartoes() {
    // Nubank
    document.getElementById('label-nome-nu').innerText = db.Nubank.nome;
    document.getElementById('val-meta-nu').innerText = `R$ ${db.Nubank.meta.toFixed(2)}`;
    document.getElementById('val-limite-nu').innerText = `R$ ${db.Nubank.limite.toFixed(2)}`;
    document.getElementById('val-fecha-nu').innerText = db.Nubank.fechamento;
    document.getElementById('val-venc-nu').innerText = db.Nubank.vencimento;
    document.getElementById('card-nu-display').style.borderLeftColor = db.Nubank.cor;

    // Mercado Pago
    document.getElementById('label-nome-mp').innerText = db.MercadoPago.nome;
    document.getElementById('val-meta-mp').innerText = `R$ ${db.MercadoPago.meta.toFixed(2)}`;
    document.getElementById('val-limite-mp').innerText = `R$ ${db.MercadoPago.limite.toFixed(2)}`;
    document.getElementById('val-fecha-mp').innerText = db.MercadoPago.fechamento;
    document.getElementById('val-venc-mp').innerText = db.MercadoPago.vencimento;
    document.getElementById('card-mp-display').style.borderLeftColor = db.MercadoPago.cor;
}
