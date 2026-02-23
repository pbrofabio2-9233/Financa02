let cartaoAtivo = "Nubank";
let db = JSON.parse(localStorage.getItem('ecoDB_v6')) || {
    Nubank: { gastos: [], cor: '#8a05be', vencimento: 20 },
    MercadoPago: { gastos: [], cor: '#009ee3', vencimento: 17 },
    saldos: { contaNu: 0, contaMP: 0 },
    faturasPagas: []
};

// --- NAVEGAÇÃO ENTRE ABAS ---
function navegar(aba, elemento) {
    // 1. Esconde todas as seções
    document.querySelectorAll('.aba-conteudo').forEach(section => section.classList.remove('active'));
    // 2. Mostra a seção clicada
    document.getElementById(`aba-${aba}`).classList.add('active');
    
    // 3. Atualiza o menu visual
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    elemento.classList.add('active');
    
    // 4. Atualiza o título
    const titulos = { 'dashboard': 'Dashboard', 'faturas': 'Faturas', 'contas': 'Configurações' };
    document.getElementById('titulo-aba').innerText = titulos[aba];
    
    atualizarUI();
}

// --- CONTROLE DE CARTÕES ---
function mudarCartao(nome) {
    cartaoAtivo = nome;
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    if(nome === 'Nubank') document.getElementById('tab-nu').classList.add('active');
    else document.getElementById('tab-mp').classList.add('active');
    atualizarUI();
}

// --- GASTOS E SALVAMENTO ---
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
    localStorage.setItem('ecoDB_v6', JSON.stringify(db));
    atualizarUI();
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

// --- ATUALIZAÇÃO DA TELA ---
function atualizarUI() {
    const totalContas = (parseFloat(db.saldos.contaNu) || 0) + (parseFloat(db.saldos.contaMP) || 0);
    let totalAbertoGeral = 0;

    // AGRUPAMENTO DE FATURAS (Cartão Ativo)
    const agrupado = {};
    db[cartaoAtivo].gastos.forEach(g => {
        const mes = g.data.substring(0, 7); // Pega AAAA-MM
        if(!agrupado[mes]) agrupado[mes] = { total: 0, itens: [] };
        agrupado[mes].total += g.valor;
        agrupado[mes].itens.push(g);
    });

    const listaFaturas = document.getElementById('lista-faturas-agrupadas');
    if(listaFaturas) {
        listaFaturas.innerHTML = "";
        Object.keys(agrupado).sort().reverse().forEach(mes => {
            const faturaID = `${cartaoAtivo}-${mes}`;
            const isPaga = db.faturasPagas.includes(faturaID);
            const dados = agrupado[mes];
            
            listaFaturas.innerHTML += `
                <div class="fatura-bloco">
                    <div class="fatura-resumo" style="border-left-color: ${db[cartaoAtivo].cor}" onclick="toggleFatura('det-${mes}')">
                        <div class="fatura-info">
                            <strong>${mes}</strong>
                            <b>R$ ${dados.total.toFixed(2)}</b>
                        </div>
                        <div class="fatura-info" style="margin-top:5px; font-size:11px; color:#888;">
                            <span>Vencimento: dia ${db[cartaoAtivo].vencimento}</span>
                            <span class="status-badge" style="background:${isPaga ? '#e8f5e9':'#ffebee'}; color:${isPaga ? '#2e7d32':'#c62828'}" 
                                  onclick="event.stopPropagation(); alternarPagamentoFatura('${faturaID}')">
                                ${isPaga ? 'PAGA' : 'ABERTA'}
                            </span>
                        </div>
                    </div>
                    <div class="fatura-detalhes" id="det-${mes}">
                        ${dados.itens.map(i => `
                            <div class="item-linha">
                                <span>${i.data.split('-')[2]} - ${i.desc}</span>
                                <span>R$ ${i.valor.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
    }

    // DASHBOARD CALCULOS
    ['Nubank', 'MercadoPago'].forEach(c => {
        const auxAgrupado = {};
        db[c].gastos.forEach(g => {
            const m = g.data.substring(0, 7);
            const fID = `${c}-${m}`;
            if(!db.faturasPagas.includes(fID)) totalAbertoGeral += g.valor;
        });
    });

    document.getElementById('dash-contas').innerText = `R$ ${totalContas.toFixed(2)}`;
    document.getElementById('dash-faturas').innerText = `R$ ${totalAbertoGeral.toFixed(2)}`;
    document.getElementById('saldo-liquido').innerText = `R$ ${(totalContas - totalAbertoGeral).toFixed(2)}`;
}

// INICIALIZAÇÃO
window.onload = () => {
    document.getElementById('lanc-data').valueAsDate = new Date();
    document.getElementById('saldo-nu').value = db.saldos.contaNu || 0;
    document.getElementById('saldo-mp').value = db.saldos.contaMP || 0;
    document.getElementById('cfg-venc-nu').value = db.Nubank.vencimento;
    document.getElementById('cfg-venc-mp').value = db.MercadoPago.vencimento;
    atualizarUI();
};

function salvarSaldos() {
    db.saldos.contaNu = document.getElementById('saldo-nu').value;
    db.saldos.contaMP = document.getElementById('saldo-mp').value;
    salvar();
}

function salvarVencimentos() {
    db.Nubank.vencimento = document.getElementById('cfg-venc-nu').value;
    db.MercadoPago.vencimento = document.getElementById('cfg-venc-mp').value;
    salvar();
}

function confirmarReset() { if(confirm("Deseja apagar TUDO?")) { localStorage.clear(); location.reload(); } }
