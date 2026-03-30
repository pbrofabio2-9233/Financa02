// ==========================================
// AUTH.JS - Gerenciamento de Login e Sessão do Firebase
// ==========================================

// Variável global para guardar os dados do usuário logado
window.usuarioLogado = null;

// Alterna visualmente entre os formulários de Login e Cadastro
window.alternarTelaAuth = function(tela) {
    const formLogin = document.getElementById('form-login');
    const formCadastro = document.getElementById('form-cadastro');
    const subtitle = document.getElementById('auth-subtitle');

    if (tela === 'cadastro') {
        formLogin.style.display = 'none';
        formCadastro.style.display = 'block';
        subtitle.innerText = 'Crie sua conta para começar';
    } else {
        formLogin.style.display = 'block';
        formCadastro.style.display = 'none';
        subtitle.innerText = 'Entre para acessar suas finanças';
    }
};

// Exibe a tela de carregamento durante o login/cadastro
window.mostrarCarregamentoAuth = function(mostrar, texto = "Processando...") {
    const formLogin = document.getElementById('form-login');
    const formCadastro = document.getElementById('form-cadastro');
    const loading = document.getElementById('auth-loading');
    const loadingText = document.getElementById('auth-loading-text');

    if (mostrar) {
        formLogin.style.display = 'none';
        formCadastro.style.display = 'none';
        loading.style.display = 'block';
        loadingText.innerText = texto;
    } else {
        loading.style.display = 'none';
        alternarTelaAuth('login');
    }
};

// ==========================================
// AUTENTICAÇÃO VIA E-MAIL E SENHA
// ==========================================

// Função para Criar Conta
window.authRegistrar = function() {
    const nome = document.getElementById('cad-nome').value.trim();
    const email = document.getElementById('cad-email').value.trim();
    const senha = document.getElementById('cad-senha').value;

    if (!email || !senha) {
        alert('Atenção: Preencha E-mail e Senha para criar a conta.');
        return;
    }

    if (senha.length < 6) {
        alert('Atenção: A senha deve ter pelo menos 6 caracteres.');
        return;
    }

    mostrarCarregamentoAuth(true, "Criando sua conta...");

    auth.createUserWithEmailAndPassword(email, senha)
        .then((userCredential) => {
            const user = userCredential.user;
            if (nome) {
                user.updateProfile({ displayName: nome });
            }
            alert('Conta criada com sucesso! Bem-vindo(a).');
            document.getElementById('auth-container').style.display = 'none';
        })
        .catch((error) => {
            mostrarCarregamentoAuth(false);
            let msgErro = "Ocorreu um erro ao criar a conta.";
            
            if (error.code === 'auth/email-already-in-use') msgErro = "Este e-mail já está cadastrado.";
            else if (error.code === 'auth/invalid-email') msgErro = "E-mail com formato inválido.";
            
            alert('Erro: ' + msgErro + '\n\nMotivo: ' + error.message);
        });
};

// Função para Fazer Login
window.authLogin = function() {
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;

    if (!email || !senha) {
        alert('Atenção: Preencha seu e-mail e senha.');
        return;
    }

    mostrarCarregamentoAuth(true, "Entrando...");

    auth.signInWithEmailAndPassword(email, senha)
        .then((userCredential) => {
            document.getElementById('auth-container').style.display = 'none';
            console.log("Usuário logado via E-mail:", userCredential.user.uid);
        })
        .catch((error) => {
            mostrarCarregamentoAuth(false);
            let msgErro = "E-mail ou senha incorretos.";
            
            if (error.code === 'auth/too-many-requests') {
                msgErro = "Muitas tentativas falhas. Tente novamente mais tarde.";
            } else if (error.code === 'auth/invalid-credential') {
                msgErro = "Dados incorretos. Verifique seu e-mail e senha.";
            }
            
            alert('Erro de Autenticação: ' + msgErro);
        });
};

// ==========================================
// AUTENTICAÇÃO VIA GOOGLE
// ==========================================
window.authLoginGoogle = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    mostrarCarregamentoAuth(true, "Conectando ao Google...");

    auth.signInWithPopup(provider)
        .then((result) => {
            document.getElementById('auth-container').style.display = 'none';
            console.log("Usuário autenticado via Google:", result.user.uid);
        })
        .catch((error) => {
            mostrarCarregamentoAuth(false);
            if (error.code !== 'auth/popup-closed-by-user') {
                console.error("Erro no login com Google:", error);
                alert("Ocorreu um erro ao conectar com o Google: " + error.message);
            }
        });
};

// Função para Sair (Logout)
window.authLogout = function() {
    if(confirm("Deseja realmente desconectar sua conta?")) {
        auth.signOut().then(() => {
            window.location.reload();
        }).catch((error) => {
            console.error("Erro ao sair:", error);
        });
    }
};

// ==========================================
// FUNÇÕES DO PERFIL DO USUÁRIO
// ==========================================

// Atualiza a foto e o nome no cabeçalho e no modal
window.atualizarInterfacePerfil = function(user) {
    if (!user) return;

    const fotoHeader = document.getElementById('header-user-foto');
    const nomeHeader = document.getElementById('header-user-nome');
    const fotoModal = document.getElementById('modal-user-foto');
    const nomeModal = document.getElementById('input-perfil-nome');
    const emailModal = document.getElementById('input-perfil-email');

    // Define nome padrão se estiver vazio
    const nomeCompleto = user.displayName || 'Usuário';
    const primeiroNome = nomeCompleto.split(' ')[0]; 
    
    // Gera foto com inicial caso não tenha foto do Google
    const iniciais = primeiroNome.substring(0, 2).toUpperCase();
    const fotoUrl = user.photoURL || `https://ui-avatars.com/api/?name=${iniciais}&background=2563eb&color=fff&bold=true`;

    if (fotoHeader) fotoHeader.src = fotoUrl;
    if (nomeHeader) nomeHeader.innerText = primeiroNome;
    if (fotoModal) fotoModal.src = fotoUrl;
    if (nomeModal) nomeModal.value = nomeCompleto;
    if (emailModal) emailModal.value = user.email;
};

// Abre e fecha o Modal de Perfil
window.abrirModalPerfil = function() {
    const m = document.getElementById('modal-perfil-usuario');
    m.style.display = 'flex';
    setTimeout(() => m.classList.add('active'), 10);
};

window.fecharModalPerfil = function() {
    const m = document.getElementById('modal-perfil-usuario');
    m.classList.remove('active');
    setTimeout(() => m.style.display = 'none', 300);
};

// Salva o novo nome digitado
window.salvarPerfilUsuario = function() {
    const novoNome = document.getElementById('input-perfil-nome').value.trim();
    
    if (!novoNome) {
        alert("O nome não pode ficar vazio.");
        return;
    }

    const btn = event.target;
    btn.innerText = "Salvando...";

    window.usuarioLogado.updateProfile({
        displayName: novoNome
    }).then(() => {
        alert("Perfil atualizado com sucesso!");
        atualizarInterfacePerfil(window.usuarioLogado); 
        fecharModalPerfil();
    }).catch((error) => {
        alert("Erro ao atualizar o perfil: " + error.message);
    }).finally(() => {
        btn.innerText = "Salvar Alterações";
    });
};

// ==========================================
// OBSERVADOR DE ESTADO (O FISCAL DA PORTA)
// ==========================================
auth.onAuthStateChanged((user) => {
    const authContainer = document.getElementById('auth-container');
    
    if (user) {
        window.usuarioLogado = user;
        authContainer.style.display = 'none';
        
        // Atualiza a foto e o nome na interface
        if (typeof atualizarInterfacePerfil === 'function') {
            atualizarInterfacePerfil(user);
        }
        
        // Carrega o banco de dados da nuvem
        if (typeof load === 'function') load();
        
    } else {
        window.usuarioLogado = null;
        authContainer.style.display = 'flex';
        mostrarCarregamentoAuth(false);
    }
});