let cartaoAtivo = "Nubank";
let db = JSON.parse(localStorage.getItem('ecoDB_v5')) || {
    Nubank: { gastos: [], cor: '#8a05be', vencimento: 20 },
    MercadoPago: { gastos: [], cor: '#009ee3', vencimento: 17 },
    saldos: { contaNu: 0, contaMP: 0 },
    faturasPagas: [] // IDs das faturas pagas (Ex: "Nubank-2026-02")
};

function navegar(aba, elemento) {
    document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    elemento.classList.add('active');
    document.getElementById('titulo-aba').innerText = aba.charAt(0).toUpperCase() + aba.slice(1);
    atualizarUI();
}

function mudarCartao(nome) {
    cartaoAtivo = nome;
    document.getElementById('tab-nu').classList.toggle('active', nome === 'Nubank');
    document.getElementById('tab-mp').classList.toggle('active', nome === 'MercadoPago');
    atualizarUI();
}

function adicionarGasto() {
    const data = document.getElementById('lanc-data').value;
    const cartao = document.getElementById('lanc-cartao').value;
    const desc = document.getElementById('lanc-desc').value;
    const valor = parseFloat(document.getElementById('lanc-valor').value);
    const cat = document.getElementById('lanc-cat').value;

    if(!data || !desc || isNaN(valor)) return alert("Preencha tudo!");

    db[cartao].gastos.push({ id: Date.now(), data, desc, valor, cat });
    salvar();
    
    document.getElementById('lanc-desc').value = "";
    document.getElementById('lanc-valor').value = "";
}

function toggleFatura(id) {
    const el = document.getElementById(id);
    el.classList.toggle('show');
}

function alternarPagamentoFatura(faturaID) {
    const index = db.faturasPagas.indexOf(faturaID);
    if(index > -1) db.faturasPagas.splice(index, 1);
    else db.faturasPagas.push(faturaID);
    salvar();
}

function salvar() {
    localStorage.setItem('ecoDB_v5', JSON.stringify(db));
    atualizarUI();
}

function atualizarUI() {
    const totalContas = db.saldos.contaNu + db.saldos.contaMP;
    let totalFaturasAbertas = 0;

    // Agrupar Gastos do Cartão Ativo por Mês
    const gastosAgrupados = {};
    db[cartaoAtivo].gastos.forEach(g => {
        const dataObj = new Date(g.data);
        const mesAno = `${dataObj.getFullYear()}-${(dataObj.getMonth() + 1).toString().padStart(2, '0')}`;
        if(!gastosAgrupados[mesAno]) gastosAgrupados[mesAno] = { total: 0, itens: [] };
        gastosAgrupados[mesAno].total += g.valor;
        gastosAgrupados[mesAno].itens.push(g);
    });

    // Renderizar Faturas
    const listaFaturas = document.getElementById('lista-faturas-agrupadas');
    listaFaturas.innerHTML = "";

    Object.keys(gastosAgrupados).sort().reverse().forEach(mes => {
        const faturaID = `${cartaoAtivo}-${mes}`;
        const isPaga = db.faturasPagas.includes(faturaID);
        const dados = gastosAgrupados[mes];
        
        if(!isPaga) totalFaturasAbertas += dados.total;

        listaFaturas.innerHTML += `
            <div class="fatura-bloco">
                <div class="fatura-resumo" style="border-left-color: ${db[cartaoAtivo].cor}" onclick="toggleFatura('det-${mes}')">
                    <div class="fatura-topo">
                        <strong>${mes}</strong>
                        <span>R$ ${dados.total.toFixed(2)}</span>
                    </div>
                    <div class="fatura-topo" style="margin-top:5px; font-size:11px; color:#888;">
                        <span>Vencimento: dia ${db[cartaoAtivo].vencimento}</span>
                        <span class="${isPaga ? 'status-pago' : 'status-aberto'}" onclick="event.stopPropagation(); alternarPagamentoFatura('${faturaID}')">
                            ${isPaga ? 'PAGA' : 'EM ABERTO'}
                        </span>
                    </div>
                </div>
                <div class="fatura-detalhes" id="det-${mes}">
                    ${dados.itens.map(i => `
                        <div class="item-lancamento">
                            <span>${i.data.split('-')[2]} - ${i.desc}</span>
                            <b>R$ ${i.valor.toFixed(2)}</b>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    // Dashboard
    document.getElementById('dash-contas').innerText = `R$ ${totalContas.toFixed(2)}`;
    document.getElementById('dash-faturas').innerText = `R$ ${totalFaturasAbertas.toFixed(2)}`;
    document.getElementById('saldo-liquido').innerText = `R$ ${(totalContas - totalFaturasAbertas).toFixed(2)}`;
}

// Inicialização
window.onload = () => {
    document.getElementById('lanc-data').valueAsDate = new Date();
    document.getElementById('saldo-nu').value = db.saldos.contaNu;
    document.getElementById('saldo-mp').value = db.saldos.contaMP;
    document.getElementById('cfg-venc-nu').value = db.Nubank.vencimento;
    document.getElementById('cfg-venc-mp').value = db.MercadoPago.vencimento;
    atualizarUI();
};

function salvarSaldos() {
    db.saldos.contaNu = parseFloat(document.getElementById('saldo-nu').value) || 0;
    db.saldos.contaMP = parseFloat(document.getElementById('saldo-mp').value) || 0;
    salvar();
}

function salvarVencimentos() {
    db.Nubank.vencimento = parseInt(document.getElementById('cfg-venc-nu').value);
    db.MercadoPago.vencimento = parseInt(document.getElementById('cfg-venc-mp').value);
    salvar();
}

function confirmarReset() { if(confirm("Apagar tudo?")) { localStorage.clear(); location.reload(); } }
