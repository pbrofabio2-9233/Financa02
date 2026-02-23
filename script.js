let cartaoAtivoFatura = "Nubank";
let db = JSON.parse(localStorage.getItem('ecoDB_v9')) || {
    Nubank: { meta: 1100, vencimento: 20, gastos: [], cor: '#8a05be' },
    MercadoPago: { meta: 800, vencimento: 17, gastos: [], cor: '#009ee3' },
    saldos: { contaNu: 0, contaMP: 0 },
    receitas: [],
    faturasPagas: []
};

function navegar(aba, botao) {
    document.querySelectorAll('.secao-app').forEach(s => s.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    botao.classList.add('active');
    document.getElementById('titulo-aba').innerText = botao.innerText;
    atualizarUI();
}

function mudarCartaoFatura(nome) {
    cartaoAtivoFatura = nome;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(nome === 'Nubank' ? 'tab-nu' : 'tab-mp').classList.add('active');
    atualizarUI();
}

function ajustarFormasPagamento() {
    const tipo = document.getElementById('lanc-tipo').value;
    const formaSelect = document.getElementById('lanc-forma');
    formaSelect.innerHTML = "";

    if (tipo === "despesa") {
        formaSelect.innerHTML = `
            <option value="Crédito">💳 Crédito</option>
            <option value="Débito">🏧 Débito</option>
            <option value="Pix">📱 Pix</option>
            <option value="Boleto">📄 Boleto</option>`;
    } else {
        formaSelect.innerHTML = `
            <option value="Salário">💵 Salário</option>
            <option value="Pix">📱 Pix Recebido</option>`;
    }
}

function adicionarGasto() {
    const data = document.getElementById('lanc-data').value;
    const tipo = document.getElementById('lanc-tipo').value;
    const cartao = document.getElementById('lanc-cartao').value;
    const forma = document.getElementById('lanc-forma').value;
    const desc = document.getElementById('lanc-desc').value;
    const valor = parseFloat(document.getElementById('lanc-valor').value);
    const cat = document.getElementById('lanc-cat').value;

    if (!data || !desc || isNaN(valor)) return alert("Preencha tudo!");

    if (tipo === "receita") {
        db.receitas.push({ id: Date.now(), data, desc, valor, forma });
    } else {
        db[cartao].gastos.push({ id: Date.now(), data, desc, valor, cat, forma });
    }
    
    salvar();
    alert("Lançamento concluído!");
}

function salvar() {
    localStorage.setItem('ecoDB_v9', JSON.stringify(db));
    atualizarUI();
}

function atualizarUI() {
    // Calculo de Metas
    const metaTotal = parseFloat(db.Nubank.meta) + parseFloat(db.MercadoPago.meta);
    const gastoAtualCartoes = db.Nubank.gastos.reduce((a, b) => a + b.valor, 0) + db.MercadoPago.gastos.reduce((a, b) => a + b.valor, 0);
    
    document.getElementById('uso-meta-texto').innerText = `R$ ${gastoAtualCartoes.toFixed(2)} / R$ ${metaTotal.toFixed(2)}`;
    const perc = (gastoAtualCartoes / metaTotal) * 100;
    document.getElementById('meta-bar').style.width = Math.min(perc, 100) + "%";
    document.getElementById('meta-percentual').innerText = `${perc.toFixed(1)}% consumido`;

    // Totais Dashboard
    const totalReceitas = db.receitas.reduce((a, b) => a + b.valor, 0);
    const totalContas = (parseFloat(db.saldos.contaNu) || 0) + (parseFloat(db.saldos.contaMP) || 0);
    
    let faturasEmAberto = 0;
    ['Nubank', 'MercadoPago'].forEach(c => {
        const aux = {};
        db[c].gastos.forEach(g => {
            const m = g.data.substring(0, 7);
            if (!db.faturasPagas.includes(`${c}-${m}`)) faturasEmAberto += g.valor;
        });
    });

    document.getElementById('dash-receitas').innerText = `R$ ${totalReceitas.toFixed(2)}`;
    document.getElementById('dash-faturas').innerText = `R$ ${faturasEmAberto.toFixed(2)}`;
    document.getElementById('dash-saldo-total').innerText = `R$ ${(totalReceitas + totalContas - faturasEmAberto).toFixed(2)}`;

    // Renderizar Faturas (Aba Faturas)
    const container = document.getElementById('lista-faturas-agrupadas');
    if (container) {
        container.innerHTML = "";
        const agrupado = {};
        db[cartaoAtivoFatura].gastos.forEach(g => {
            const mes = g.data.substring(0, 7);
            if (!agrupado[mes]) agrupado[mes] = { total: 0, itens: [] };
            agrupado[mes].total += g.valor;
            agrupado[mes].itens.push(g);
        });
        Object.keys(agrupado).sort().reverse().forEach(mes => {
            container.innerHTML += `<div class="fatura-bloco"><div class="fatura-resumo"><strong>${mes}</strong> - R$ ${agrupado[mes].total.toFixed(2)}</div></div>`;
        });
    }
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

window.onload = () => {
    document.getElementById('lanc-data').valueAsDate = new Date();
    ajustarFormasPagamento();
    atualizarUI();
};
