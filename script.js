let cartaoAtual = "Nubank";
let db = JSON.parse(localStorage.getItem('ecoDB')) || {
    Nubank: { total: 0, meta: 1100, lene: 406, gastos: [], cor: '#8a05be' },
    MercadoPago: { total: 0, meta: 800, lene: 0, gastos: [], cor: '#009ee3' }
};

// --- NAVEGAÇÃO ---
function navegar(aba, elemento) {
    document.querySelectorAll('.aba-conteudo').forEach(a => a.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    elemento.classList.add('active');
    
    document.getElementById('titulo-aba').innerText = aba === 'dashboard' ? 'Dashboard' : 'Meus Cartões';
    atualizarUI();
}

// --- GESTÃO DE DADOS ---
function mudarCartao(nome, elemento) {
    cartaoAtual = nome;
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    elemento.classList.add('active');
    
    const visual = document.getElementById('cartao-visual');
    visual.style.borderLeftColor = db[cartaoAtual].cor;
    
    atualizarUI();
}

function adicionarGasto() {
    const d = document.getElementById('desc').value;
    const v = parseFloat(document.getElementById('valor').value);
    const c = document.getElementById('cat').value;

    if(!d || isNaN(v)) return alert("Dados inválidos!");

    db[cartaoAtual].total += v;
    db[cartaoAtual].gastos.unshift({
        id: Date.now(),
        d, v, c, data: new Date().toLocaleDateString()
    });
    
    salvar();
    document.getElementById('desc').value = "";
    document.getElementById('valor').value = "";
}

function excluirGasto(id) {
    if(!confirm("Deseja excluir este lançamento?")) return;
    
    const index = db[cartaoAtual].gastos.findIndex(g => g.id === id);
    if(index > -1) {
        db[cartaoAtual].total -= db[cartaoAtual].gastos[index].v;
        db[cartaoAtual].gastos.splice(index, 1);
        salvar();
    }
}

function processarTexto() {
    const texto = document.getElementById('textoImportacao').value;
    const regexValor = /(\d+[\.,]\d{2})/g;
    const valoresEncontrados = texto.match(regexValor);

    if (valoresEncontrados) {
        let soma = 0;
        valoresEncontrados.forEach(vStr => {
            const vLimpo = parseFloat(vStr.replace(',', '.'));
            soma += vLimpo;
            db[cartaoAtual].gastos.unshift({
                id: Date.now() + Math.random(),
                d: "Importação", v: vLimpo, c: "Outros", data: new Date().toLocaleDateString()
            });
        });
        db[cartaoAtual].total += soma;
        salvar();
        document.getElementById('textoImportacao').value = "";
        alert("Importação concluída!");
    }
}

// --- INTERFACE ---
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
    const scoreTxt = document.getElementById('score-valor');
    bar.style.width = Math.min(percGeral, 100) + "%";
    
    if(percGeral < 60) scoreTxt.innerText = "90 (Excelente)";
    else if(percGeral < 85) scoreTxt.innerText = "65 (Cuidado)";
    else scoreTxt.innerText = "30 (Crítico)";

    // Cartões
    document.getElementById('nome-cartao').innerText = cartaoAtual;
    document.getElementById('fatura-valor-oficial').innerText = `R$ ${info.total.toFixed(2)}`;
    document.getElementById('fatura-meta-ajustada').innerText = `Meta Real: R$ ${(info.total - info.lene).toFixed(2)}`;
    
    const lista = document.getElementById('lista-lancamentos-fatura');
    lista.innerHTML = info.gastos.map(g => `
        <div class="item-gasto">
            <span><strong>${g.d}</strong><br><small>${g.c} • ${g.data}</small></span>
            <div style="display:flex; align-items:center">
                <span style="font-weight:bold">R$ ${g.v.toFixed(2)}</span>
                <i class="fas fa-trash-alt btn-delete" onclick="excluirGasto(${g.id})"></i>
            </div>
        </div>
    `).join('');
}

function exportarBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const a = document.createElement('a');
    a.href = dataStr; a.download = 'ecofinance_backup.json'; a.click();
}

function confirmarReset() {
    if(confirm("ATENÇÃO: Isso apagará todos os dados salvos no seu celular. Deseja continuar?")) {
        localStorage.clear();
        location.reload();
    }
}

// Início
window.onload = atualizarUI;
