let cartaoAtual = "Nubank";
let db = JSON.parse(localStorage.getItem('ecoDB')) || {
    Nubank: { total: 0, meta: 1100, lene: 406, gastos: [], cor: '#8a05be' },
    MercadoPago: { total: 0, meta: 800, lene: 0, gastos: [], cor: '#009ee3' },
    configMetas: { Alimentação: 500, Transporte: 300, Lazer: 200, Serviços: 400, Outros: 200 },
    historicoMeses: []
};

const coresCat = { Alimentação: '#ff7675', Transporte: '#74b9ff', Lazer: '#55efc4', Serviços: '#a29bfe', Outros: '#dfe6e9' };

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
    atualizarUI();
}

function adicionarGasto() {
    const desc = document.getElementById('desc').value;
    const valorTotal = parseFloat(document.getElementById('valor').value);
    const qtdParcelas = parseInt(document.getElementById('parcelas').value) || 1;
    const cat = document.getElementById('cat').value;

    if(!desc || isNaN(valorTotal)) return alert("Dados inválidos!");

    const valorParcela = valorTotal / qtdParcelas;

    // Adiciona o lançamento (Nesta versão simplificada, focamos na fatura atual)
    db[cartaoAtual].total += valorParcela;
    db[cartaoAtual].gastos.unshift({
        id: Date.now(),
        d: qtdParcelas > 1 ? `${desc} (${1}/${qtdParcelas})` : desc,
        v: valorParcela,
        c: cat,
        data: new Date().toLocaleDateString()
    });
    
    salvar();
    document.getElementById('desc').value = "";
    document.getElementById('valor').value = "";
    document.getElementById('parcelas').value = "1";
}

function excluirGasto(id) {
    const index = db[cartaoAtual].gastos.findIndex(g => g.id === id);
    if(index > -1) {
        db[cartaoAtual].total -= db[cartaoAtual].gastos[index].v;
        db[cartaoAtual].gastos.splice(index, 1);
        salvar();
    }
}

function fecharMes() {
    const mesAtual = new Date().toLocaleString('pt-br', { month: 'long' });
    const totalGeral = db.Nubank.total + db.MercadoPago.total;

    if(confirm(`Deseja encerrar o mês de ${mesAtual}? Os gastos serão movidos para o histórico.`)) {
        db.historicoMeses.unshift({ mes: mesAtual, total: totalGeral, ano: 2026 });
        // Reseta cartões
        db.Nubank.total = 0; db.Nubank.gastos = [];
        db.MercadoPago.total = 0; db.MercadoPago.gastos = [];
        salvar();
        alert("Mês encerrado com sucesso!");
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

    // Dashboard
    document.getElementById('dash-total').innerText = `R$ ${totalGeral.toFixed(2)}`;
    document.getElementById('dash-meta').innerText = `R$ ${metaRealGeral.toFixed(2)}`;
    
    const percGeral = (totalGeral / metaTotalDefinida) * 100;
    const bar = document.getElementById('score-bar');
    bar.style.width = Math.min(percGeral, 100) + "%";
    document.getElementById('score-valor').innerText = percGeral < 60 ? "90 (Excelente)" : percGeral < 85 ? "65 (Cuidado)" : "30 (Crítico)";

    // Gráfico de Categorias e Metas
    const gastosCat = { Alimentação: 0, Transporte: 0, Lazer: 0, Serviços: 0, Outros: 0 };
    [db.Nubank, db.MercadoPago].forEach(c => c.gastos.forEach(g => { if(gastosCat[g.c] !== undefined) gastosCat[g.c] += g.v }));

    const pieContainer = document.getElementById('pie-chart-container');
    const legendaDiv = document.getElementById('legendas-categorias');
    const metasDiv = document.getElementById('lista-metas-categorias');
    
    pieContainer.innerHTML = ""; legendaDiv.innerHTML = ""; metasDiv.innerHTML = "";

    Object.keys(gastosCat).forEach(cat => {
        const valor = gastosCat[cat];
        const limite = db.configMetas[cat];
        if(valor > 0) {
            const p = (valor / totalGeral) * 100;
            pieContainer.innerHTML += `<div class="pie-slice" style="width:${p}%; background:${coresCat[cat]}"></div>`;
            legendaDiv.innerHTML += `<div class="leg-item"><div class="dot" style="background:${coresCat[cat]}"></div> ${cat}</div>`;
        }
        
        const percMeta = (valor / limite) * 100;
        metasDiv.innerHTML += `
            <div class="meta-item">
                <div class="meta-header"><span>${cat}</span><span>R$ ${valor.toFixed(2)} / ${limite}</span></div>
                <div class="progress-bg"><div class="progress-fill" style="width:${Math.min(percMeta, 100)}%; background:${percMeta > 100 ? '#d63031' : coresCat[cat]}"></div></div>
            </div>
        `;
    });

    // Lista Cartão
    document.getElementById('nome-cartao').innerText = cartaoAtual;
    document.getElementById('cartao-visual').style.borderLeftColor = info.cor;
    document.getElementById('fatura-valor-oficial').innerText = `R$ ${info.total.toFixed(2)}`;
    document.getElementById('fatura-meta-ajustada').innerText = `Meta Real: R$ ${(info.total - info.lene).toFixed(2)}`;
    
    document.getElementById('lista-lancamentos-fatura').innerHTML = info.gastos.map(g => `
        <div class="item-gasto">
            <span><strong>${g.d}</strong><br><small>${g.c}</small></span>
            <div><b>R$ ${g.v.toFixed(2)}</b><i class="fas fa-times-circle btn-delete" onclick="excluirGasto(${g.id})"></i></div>
        </div>
    `).join('');

    // Histórico
    const histLista = document.getElementById('lista-historico-meses');
    if(db.historicoMeses.length > 0) {
        histLista.innerHTML = db.historicoMeses.map(h => `
            <div class="item-gasto"><span>${h.mes} / ${h.ano}</span><b>R$ ${h.total.toFixed(2)}</b></div>
        `).join('');
    }
}

function exportarBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const a = document.createElement('a'); a.href = dataStr; a.download = 'ecofinance_backup.json'; a.click();
}

function confirmarReset() {
    if(confirm("Zerar todos os dados do app?")) { localStorage.clear(); location.reload(); }
}

window.onload = atualizarUI;
