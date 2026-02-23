let cartaoAtual = "Nubank";
let db = JSON.parse(localStorage.getItem('ecoDB')) || {
    Nubank: { total: 0, meta: 1100, lene: 406, gastos: [], cor: '#8a05be' },
    MercadoPago: { total: 0, meta: 800, lene: 0, gastos: [], cor: '#009ee3' }
};

function mudarCartao(nome) {
    cartaoAtual = nome;
    document.getElementById('btnNu').classList.toggle('active', nome === 'Nubank');
    document.getElementById('btnMP').classList.toggle('active', nome === 'MercadoPago');
    atualizarUI(true);
}

function adicionarGasto() {
    const d = document.getElementById('desc').value;
    const v = parseFloat(document.getElementById('valor').value);
    const c = document.getElementById('cat').value;

    if(!d || isNaN(v)) return alert("Preencha descrição e valor!");

    db[cartaoAtual].total += v;
    db[cartaoAtual].gastos.unshift({d, v, c, data: new Date().toLocaleDateString()});
    
    salvarESincronizar();
    
    document.getElementById('desc').value = "";
    document.getElementById('valor').value = "";
}

function processarTexto() {
    const texto = document.getElementById('textoImportacao').value;
    const regexValor = /(\d+[\.,]\d{2})/g;
    const valoresEncontrados = texto.match(regexValor);

    if (valoresEncontrados) {
        let totalImportado = 0;
        valoresEncontrados.forEach(vStr => {
            const vLimpo = parseFloat(vStr.replace(',', '.'));
            totalImportado += vLimpo;
            db[cartaoAtual].gastos.unshift({ d: "Importação", v: vLimpo, c: "Outros", data: new Date().toLocaleDateString() });
        });
        db[cartaoAtual].total += totalImportado;
        salvarESincronizar();
        document.getElementById('textoImportacao').value = "";
        alert("Importado com sucesso!");
    }
}

function salvarESincronizar() {
    localStorage.setItem('ecoDB', JSON.stringify(db));
    atualizarUI(true);
}

function atualizarUI(reconstruirLista = false) {
    const info = db[cartaoAtual];
    const metaReal = info.total - info.lene;
    const perc = (info.total / info.meta) * 100;

    document.getElementById('totalVisual').innerText = `R$ ${info.total.toFixed(2)}`;
    document.getElementById('metaAjustada').innerText = `Meta Real: R$ ${metaReal.toFixed(2)}`;
    
    const fill = document.getElementById('progresso');
    fill.style.width = Math.min(perc, 100) + "%";
    fill.style.backgroundColor = perc > 85 ? '#d63031' : info.cor;

    if(reconstruirLista) {
        const listaDiv = document.getElementById('lista');
        listaDiv.innerHTML = info.gastos.map(g => `
            <div class="item-gasto">
                <span><strong>${g.d}</strong><br><small>${g.c}</small></span>
                <span style="color:#d63031; font-weight:bold;">R$ ${g.v.toFixed(2)}</span>
            </div>
        `).join('');
    }
}

function exportarBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "backup_financeiro.json");
    dlAnchor.click();
}

// Inicializa o App
window.onload = () => atualizarUI(true);
