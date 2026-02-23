let cartaoAtivoFatura = "Nubank";
let db = JSON.parse(localStorage.getItem('ecoDB_v11')) || {
    Nubank: { meta: 1100, vencimento: 20, gastos: [], cor: '#8a05be' },
    MercadoPago: { meta: 800, vencimento: 17, gastos: [], cor: '#009ee3' },
    saldos: { contaNu: 0, contaMP: 0 },
    receitas: [],
    faturasPagas: []
};

// Navegação Principal
function navegar(aba, elemento) {
    document.querySelectorAll('.secao-app').forEach(s => s.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    elemento.classList.add('active');
    document.getElementById('titulo-aba').innerText = elemento.querySelector('span').innerText;
    atualizarUI();
}

function mudarCartaoFatura(nome) {
    cartaoAtivoFatura = nome;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if(nome === 'Nubank') document.getElementById('tab-nu').classList.add('active');
    else document.getElementById('tab-mp').classList.add('active');
    atualizarUI();
}

function ajustarFormasPagamento() {
    const tipo = document.getElementById('lanc-tipo').value;
    const formaSelect = document.getElementById('lanc-forma');
    formaSelect.innerHTML = tipo === "despesa" ? 
        `<option value="Crédito">💳 Crédito</option><option value="Débito">🏧 Débito</option><option value="Pix">📱 Pix</option>` :
        `<option value="Salário">💵 Salário</option><option value="Pix">📱 Pix Recebido</option>`;
}

function adicionarGasto() {
    const data = document.getElementById('lanc-data').value;
    const tipo = document.getElementById('lanc-tipo').value;
    const cartao = document.getElementById('lanc-cartao').value;
    const forma = document.getElementById('lanc-forma').value;
    const desc = document.getElementById('lanc-desc').value;
    const valor = parseFloat(document.getElementById('lanc-valor').value);
    const cat = document.getElementById('lanc-cat').value;

    if (!data || !desc || isNaN(valor) || !forma) return alert("Preencha todos os campos!");

    if (tipo === "receita") db.receitas.push({ id: Date.now(), data, desc, valor, forma });
    else db[cartao].gastos.push({ id: Date.now(), data, desc, valor, cat, forma });
    
    salvar();
    alert("Salvo com sucesso!");
}

function salvar() {
    localStorage.setItem('ecoDB_v11', JSON.stringify(db));
    atualizarUI();
}

function toggleFatura(id) { document.getElementById(id).classList.toggle('show'); }

function atualizarUI() {
    // Balão de Metas
    const metaNu = parseFloat(db.Nubank.meta) || 0;
    const metaMP = parseFloat(db.MercadoPago.meta) || 0;
    const metaTotal = metaNu + metaMP;
    const gastoAtual = db.Nubank.gastos.reduce((a,b)=>a+b.valor,0) + db.MercadoPago.gastos.reduce((a,b)=>a+b.valor,0);
    
    document.getElementById('uso-meta-texto').innerText = `R$ ${gastoAtual.toFixed(2)} / R$ ${metaTotal.toFixed(2)}`;
    const perc = metaTotal > 0 ? (gastoAtual / metaTotal) * 100 : 0;
    document.getElementById('meta-bar').style.width = Math.min(perc, 100) + "%";
    document.getElementById('meta-percentual').innerText = `${perc.toFixed(1)}% consumido`;

    // Dashboard
    const totalReceitas = db.receitas.reduce((a,b)=>a+b.valor,0);
    const totalContas = (parseFloat(db.saldos.contaNu)||0) + (parseFloat(db.saldos.contaMP)||0);
    let fatAberto = 0;
    ['Nubank','MercadoPago'].forEach(c => {
        db[c].gastos.forEach(g => { if(!db.faturasPagas.includes(`${c}-${g.data.substring(0,7)}`)) fatAberto += g.valor; });
    });
    document.getElementById('dash-receitas').innerText = `R$ ${totalReceitas.toFixed(2)}`;
    document.getElementById('dash-faturas').innerText = `R$ ${fatAberto.toFixed(2)}`;
    document.getElementById('dash-saldo-total').innerText = `R$ ${(totalReceitas + totalContas - fatAberto).toFixed(2)}`;

    // Aba Faturas
    const container = document.getElementById('lista-faturas-agrupadas');
    if(container) {
        container.innerHTML = "";
        const agrup = {};
        db[cartaoAtivoFatura].gastos.forEach(g => {
            const m = g.data.substring(0,7);
            if(!agrup[m]) agrup[m] = { tot: 0, itens: [] };
            agrup[m].tot += g.valor; agrup[m].itens.push(g);
        });
        Object.keys(agrup).sort().reverse().forEach(m => {
            container.innerHTML += `<div class="fatura-bloco"><div class="fatura-resumo" onclick="toggleFatura('det-${m}')"><strong>${m}</strong> - R$ ${agrup[m].tot.toFixed(2)}</div><div class="fatura-detalhes" id="det-${m}">${agrup[m].itens.map(i => `<div class="item-linha"><span>${i.desc}</span><span>R$ ${i.valor.toFixed(2)}</span></div>`).join('')}</div></div>`;
        });
    }
}

window.onload = () => {
    document.getElementById('lanc-data').valueAsDate = new Date();
    ajustarFormasPagamento();
    // Preencher configs
    document.getElementById('cfg-meta-nu').value = db.Nubank.meta;
    document.getElementById('cfg-venc-nu').value = db.Nubank.vencimento;
    document.getElementById('cfg-meta-mp').value = db.MercadoPago.meta;
    document.getElementById('cfg-venc-mp').value = db.MercadoPago.vencimento;
    document.getElementById('saldo-nu').value = db.saldos.contaNu;
    document.getElementById('saldo-mp').value = db.saldos.contaMP;
    atualizarUI();
};

function salvarConfig() {
    db.Nubank.meta = document.getElementById('cfg-meta-nu').value;
    db.Nubank.vencimento = document.getElementById('cfg-venc-nu').value;
    db.MercadoPago.meta = document.getElementById('cfg-meta-mp').value;
    db.MercadoPago.vencimento = document.getElementById('cfg-venc-mp').value;
    salvar();
}

function salvarSaldos() {
    db.saldos.contaNu = document.getElementById('saldo-nu').value;
    db.saldos.contaMP = document.getElementById('saldo-mp').value;
    salvar();
}

function confirmarReset() { if(confirm("Zerar tudo?")) { localStorage.clear(); location.reload(); } }
function exportarBackup() {
    const d = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const a = document.createElement('a'); a.href = d; a.download = 'backup_v11.json'; a.click();
}
