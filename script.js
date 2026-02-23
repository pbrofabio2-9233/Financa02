// Database v10
let db = JSON.parse(localStorage.getItem('ecoDB_v10')) || {
    Nubank: { meta: 1100, vencimento: 20, gastos: [], cor: '#8a05be' },
    MercadoPago: { meta: 800, vencimento: 17, gastos: [], cor: '#009ee3' },
    saldos: { contaNu: 0, contaMP: 0 },
    receitas: [],
    faturasPagas: []
};

// Navegação entre abas
function navegar(aba, elemento) {
    document.querySelectorAll('.secao-app').forEach(s => s.classList.remove('active'));
    document.getElementById(`aba-${aba}`).classList.add('active');
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    elemento.classList.add('active');
    
    document.getElementById('titulo-aba').innerText = elemento.querySelector('span').innerText;
    atualizarUI();
}

// CORREÇÃO DO TRIÂNGULO: Garante que as formas de pagamento existam ao trocar o tipo
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

    if (!data || !desc || isNaN(valor) || !forma) {
        return alert("Erro: Verifique se todos os campos (incluindo forma de pagamento) estão preenchidos.");
    }

    if (tipo === "receita") {
        db.receitas.push({ id: Date.now(), data, desc, valor, forma });
    } else {
        db[cartao].gastos.push({ id: Date.now(), data, desc, valor, cat, forma });
    }
    
    salvar();
    alert("Lançamento salvo!");
}

function salvar() {
    localStorage.setItem('ecoDB_v10', JSON.stringify(db));
    atualizarUI();
}

function atualizarUI() {
    // Cálculo Meta
    const metaNu = parseFloat(db.Nubank.meta) || 0;
    const metaMP = parseFloat(db.MercadoPago.meta) || 0;
    const metaTotal = metaNu + metaMP;

    const gastosNu = db.Nubank.gastos.reduce((a, b) => a + b.valor, 0);
    const gastosMP = db.MercadoPago.gastos.reduce((a, b) => a + b.valor, 0);
    const gastoAtual = gastosNu + gastosMP;

    document.getElementById('uso-meta-texto').innerText = `R$ ${gastoAtual.toFixed(2)} / R$ ${metaTotal.toFixed(2)}`;
    const perc = metaTotal > 0 ? (gastoAtual / metaTotal) * 100 : 0;
    document.getElementById('meta-bar').style.width = Math.min(perc, 100) + "%";
    document.getElementById('meta-percentual').innerText = `${perc.toFixed(1)}% consumido`;

    // Dashboard Totais
    const totalReceitas = db.receitas.reduce((a, b) => a + b.valor, 0);
    const totalContas = (parseFloat(db.saldos.contaNu) || 0) + (parseFloat(db.saldos.contaMP) || 0);
    
    let faturasAberto = 0;
    ['Nubank', 'MercadoPago'].forEach(c => {
        db[c].gastos.forEach(g => {
            const faturaID = `${c}-${g.data.substring(0,7)}`;
            if (!db.faturasPagas.includes(faturaID)) faturasAberto += g.valor;
        });
    });

    document.getElementById('dash-receitas').innerText = `R$ ${totalReceitas.toFixed(2)}`;
    document.getElementById('dash-faturas').innerText = `R$ ${faturasAberto.toFixed(2)}`;
    document.getElementById('dash-saldo-total').innerText = `R$ ${(totalReceitas + totalContas - faturasAberto).toFixed(2)}`;
}

window.onload = () => {
    document.getElementById('lanc-data').valueAsDate = new Date();
    ajustarFormasPagamento(); // CHAMA NA INICIALIZAÇÃO PARA NÃO FICAR VAZIO
    atualizarUI();
};
