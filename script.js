let cartaoAtual = "Nubank";
let db = JSON.parse(localStorage.getItem('ecoDB')) || {
    Nubank: { total: 0, meta: 1100, lene: 406, gastos: [], cor: '#8a05be' },
    MercadoPago: { total: 0, meta: 800, lene: 0, gastos: [], cor: '#009ee3' },
    configMetas: { 
        Alimentação: 500, 
        Transporte: 300, 
        Lazer: 200, 
        Serviços: 400 
    },
    historicoMensal: [] // Para guardar totais de meses passados
};

function navegar(aba, elemento) {
    document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    elemento.classList.add('active');
    document.getElementById('titulo-aba').innerText = aba.charAt(0).toUpperCase() + aba.slice(1);
    atualizarUI();
}

function mudarCartao(nome, elemento) {
    cartaoAtual = nome;
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    elemento.classList.add('active');
    document.getElementById('cartao-visual').style.borderLeftColor = db[cartaoAtual].cor;
    atualizarUI();
}

function adicionarGasto() {
    const d = document.getElementById('desc').value;
    const v = parseFloat(document.getElementById('valor').value);
    const c = document.getElementById('cat').value;

    if(!d || isNaN(v)) return alert("Preencha descrição e valor!");

    db[cartaoAtual].total += v;
    db[cartaoAtual].gastos.unshift({ id: Date.now(), d, v, c, data: new Date().toLocaleDateString() });
    
    salvar();
    document.getElementById('desc').value = "";
    document.getElementById('valor').value = "";
}

function excluirGasto(id) {
    const index = db[cartaoAtual].gastos.findIndex(g => g.id === id);
    if(index > -1) {
        db[cartaoAtual].total -= db[cartaoAtual].gastos[index].v;
        db[cartaoAtual].gastos.splice(index, 1);
        salvar();
    }
}

function salvar() {
    localStorage.setItem('ecoDB', JSON.stringify(db));
    atualizarUI();
}

function atualizarUI() {
    const info = db[cartaoAtual];
    const totalGeral = db.Nubank.total + db.MercadoPago.total;
    const metaTotalDefinida = db.Nubank.meta + db.MercadoPago.meta;
    const metaRealGeral = (db.Nubank.total - db.Nubank.lene) + (db.MercadoPago.total - db.MercadoPago.lene);

    // 1. Dashboard Principal
    document.getElementById('dash-total').innerText = `R$ ${totalGeral.toFixed(2)}`;
    document.getElementById('dash-meta').innerText = `R$ ${metaRealGeral.toFixed(2)}`;
    
    const percGeral = (totalGeral / metaTotalDefinida) * 100;
    const scoreBar = document.getElementById('score-bar');
    const scoreTxt = document.getElementById('score-valor');
    scoreBar.style.width = Math.min(percGeral, 100) + "%";
    scoreTxt.innerText = percGeral < 60 ? "90 (Excelente)" : percGeral < 85 ? "65 (Cuidado)" : "30 (Crítico)";

    // 2. Metas por Categoria
    const listaMetas = document.getElementById('lista-metas-categorias');
    listaMetas.innerHTML = "";
    
    const gastosPorCat = { Alimentação: 0, Transporte: 0, Lazer: 0, Serviços: 0 };
    // Soma gastos de ambos os cartões
    [db.Nubank, db.MercadoPago].forEach(cartao => {
        cartao.gastos.forEach(g => { if(gastosPorCat[g.c] !== undefined) gastosPorCat[g.c] += g.v; });
    });

    Object.keys(db.configMetas).forEach(cat => {
        const gasto = gastosPorCat[cat];
        const limite = db.configMetas[cat];
        const perc = (gasto / limite) * 100;
        const cor = perc > 100 ? "#d63031" : perc > 80 ? "#fdcb6e" : "#00b894";

        listaMetas.innerHTML += `
            <div class="meta-item">
                <div class="meta-header">
                    <span>${cat}</span>
                    <span>R$ ${gasto.toFixed(2)} / ${limite}</span>
                </div>
                <div class="progress-bg"><div class="progress-fill" style="width:${Math.min(perc, 100)}%; background:${cor}"></div></div>
            </div>
        `;
    });

    // 3. Cartões & Faturas
    document.getElementById('nome-cartao').innerText = cartaoAtual;
    document.getElementById('fatura-valor-oficial').innerText = `R$ ${info.total.toFixed(2)}`;
    document.getElementById('fatura-meta-ajustada').innerText = `Meta Real: R$ ${(info.total - info.lene).toFixed(2)}`;
    
    const listaFatura = document.getElementById('lista-lancamentos-fatura');
    listaFatura.innerHTML = info.gastos.map(g => `
        <div class="item-gasto">
            <span><strong>${g.d}</strong><br><small>${g.c} • ${g.data}</small></span>
            <div style="display:flex; align-items:center">
                <span style="font-weight:bold">R$ ${g.v.toFixed(2)}</span>
                <i class="fas fa-trash-alt btn-delete" onclick="excluirGasto(${g.id})"></i>
            </div>
        </div>
    `).join('');

    // 4. Histórico Mensal (Simulado com os dados atuais)
    const histDiv = document.getElementById('lista-historico-meses');
    histDiv.innerHTML = `
        <div class="historico-mes-item">
            <span>Mês Atual (Fevereiro)</span>
            <span style="font-weight:bold">R$ ${totalGeral.toFixed(2)}</span>
        </div>
    `;
}

function exportarBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const a = document.createElement('a');
    a.href = dataStr; a.download = 'ecofinance_backup.json'; a.click();
}

function confirmarReset() {
    if(confirm("Apagar todos os dados?")) { localStorage.clear(); location.reload(); }
}

window.onload = atualizarUI;
