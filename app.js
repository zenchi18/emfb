// ==========================================
// CONFIGURAÇÃO FIREBASE
// PREENCHER NA SESSÃO DO FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "PREENCHER",
    authDomain: "PREENCHER",
    projectId: "PREENCHER",
    storageBucket: "PREENCHER",
    messagingSenderId: "PREENCHER",
    appId: "PREENCHER"
};

// Inicializar
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// NAVEGAÇÃO
// ==========================================
function mostrarPagina(pagina) {
    // Esconder todas
    document.querySelectorAll('.pagina').forEach(p => p.classList.remove('ativa'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('ativo'));
    
    // Mostrar a escolhida
    document.getElementById('pagina-' + pagina).classList.add('ativa');
    document.getElementById('menu-' + pagina).classList.add('ativo');
    
    // Atualizar título
    const titulos = {
        'dashboard': 'Painel Principal',
        'notas': 'Minhas Notas',
        'pautas': 'Pautas da Turma',
        'turma': 'Minha Turma',
        'admin': 'Área do Professor'
    };
    document.getElementById('titulo-pagina').textContent = titulos[pagina];
    
    // Carregar dados específicos
    if (pagina === 'notas') carregarNotas();
    if (pagina === 'pautas') carregarPautas();
    if (pagina === 'turma') carregarTurma();
    if (pagina === 'admin') carregarAdminStats();
}

// ==========================================
// LOGIN
// ==========================================
function entrar() {
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const erro = document.getElementById('erro-msg');
    
    if (!email || !senha) {
        erro.textContent = 'Preenche o email e a senha.';
        return;
    }
    
    auth.signInWithEmailAndPassword(email, senha)
        .then(() => {
            erro.textContent = '';
        })
        .catch(err => {
            let msg = 'Erro no login.';
            if (err.code === 'auth/user-not-found') msg = 'Aluno não encontrado.';
            if (err.code === 'auth/wrong-password') msg = 'Senha incorreta.';
            if (err.code === 'auth/invalid-email') msg = 'Email inválido.';
            erro.textContent = msg;
        });
}

function sair() {
    auth.signOut();
}

// ==========================================
// AUTH STATE
// ==========================================
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('tela-login').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        
        // Buscar dados do utilizador
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                const dados = doc.data();
                document.getElementById('nome-usuario').textContent = dados.nome || user.email;
                document.getElementById('tag-turma').textContent = 'Turma: ' + (dados.turma || '--');
                
                // Mostrar menu admin se for professor
                if (dados.tipo === 'admin' || dados.tipo === 'professor') {
                    document.getElementById('menu-admin').style.display = 'flex';
                }
                
                // Guardar turma globalmente
                window.turmaAtual = dados.turma || '12A';
                window.userUid = user.uid;
                
                // Carregar dashboard
                carregarDashboard(dados.turma || '12A', user.uid);
            }
        });
        
        mostrarPagina('dashboard');
    } else {
        document.getElementById('tela-login').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
});

// ==========================================
// DASHBOARD
// ==========================================
function carregarDashboard(turma, uid) {
    // Buscar notas para média
    db.collection('notas').doc(uid).get().then(doc => {
        if (doc.exists) {
            const notas = doc.data();
            let total = 0, count = 0;
            
            // Calcular média do trimestre atual (t3)
            if (notas.t3) {
                for (let mat in notas.t3) {
                    total += parseFloat(notas.t3[mat]);
                    count++;
                }
            }
            
            const media = count > 0 ? (total / count).toFixed(1) : '--';
            document.getElementById('dash-media').textContent = media;
            document.getElementById('dash-disciplinas').textContent = count;
        }
    });
    
    // Buscar posição na turma
    db.collection('pautas').doc(turma).get().then(doc => {
        if (doc.exists) {
            const alunos = doc.data().alunos || [];
            const pos = alunos.findIndex(a => a.uid === uid) + 1;
            document.getElementById('dash-posicao').textContent = pos > 0 ? pos + 'º' : '--';
        }
    });
}

// ==========================================
// NOTAS
// ==========================================
function carregarNotas() {
    const trimestre = document.getElementById('seletor-trimestre').value;
    const tbody = document.getElementById('corpo-notas');
    
    if (!window.userUid) {
        tbody.innerHTML = '<tr><td colspan="4" class="vazio">Erro: não logado</td></tr>';
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="4" class="vazio">Carregando...</td></tr>';
    
    db.collection('notas').doc(window.userUid).get().then(doc => {
        if (!doc.exists || !doc.data()[trimestre]) {
            tbody.innerHTML = '<tr><td colspan="4" class="vazio">Nenhuma nota registada neste trimestre.</td></tr>';
            return;
        }
        
        const notas = doc.data()[trimestre];
        let html = '';
        
        for (let materia in notas) {
            const nota = parseFloat(notas[materia]);
            let classif = '', estado = '', classe = '';
            
            if (nota >= 10) { classif = 'Aprovado'; estado = '✅ Aprovado'; classe = 'estado-aprovado'; }
            else if (nota >= 8) { classif = 'Recuperação'; estado = '⚠️ Recuperação'; classe = 'estado-recuperacao'; }
            else { classif = 'Reprovado'; estado = '❌ Reprovado'; classe = 'estado-reprovado'; }
            
            html += `<tr>
                <td>${materia}</td>
                <td><strong>${nota}</strong></td>
                <td>${classif}</td>
                <td class="${classe}">${estado}</td>
            </tr>`;
        }
        
        tbody.innerHTML = html;
    });
}

// ==========================================
// PAUTAS
// ==========================================
function carregarPautas() {
    const tbody = document.getElementById('corpo-pauta');
    tbody.innerHTML = '<tr><td colspan="4" class="vazio">Carregando...</td></tr>';
    
    if (!window.turmaAtual) {
        tbody.innerHTML = '<tr><td colspan="4" class="vazio">Turma não definida</td></tr>';
        return;
    }
    
    db.collection('pautas').doc(window.turmaAtual).get().then(doc => {
        if (!doc.exists) {
            tbody.innerHTML = '<tr><td colspan="4" class="vazio">Pauta não disponível</td></tr>';
            return;
        }
        
        const alunos = doc.data().alunos || [];
        // Ordenar por média decrescente
        alunos.sort((a, b) => b.media - a.media);
        
        let html = '';
        alunos.forEach((a, index) => {
            let classif = a.media >= 10 ? 'Aprovado' : 'Reprovado';
            let cor = a.media >= 10 ? 'estado-aprovado' : 'estado-reprovado';
            
            html += `<tr>
                <td><span class="posicao-destaque">${index + 1}</span></td>
                <td>${a.nome}</td>
                <td><strong>${a.media}</strong></td>
                <td class="${cor}">${classif}</td>
            </tr>`;
        });
        
        tbody.innerHTML = html;
    });
}

// ==========================================
// TURMA
// ==========================================
function carregarTurma() {
    const grid = document.getElementById('grid-turma');
    grid.innerHTML = '<p class="vazio">Carregando...</p>';
    
    if (!window.turmaAtual) {
        grid.innerHTML = '<p class="vazio">Turma não definida</p>';
        return;
    }
    
    db.collection('pautas').doc(window.turmaAtual).get().then(doc => {
        if (!doc.exists) {
            grid.innerHTML = '<p class="vazio">Lista não disponível</p>';
            return;
        }
        
        const alunos = doc.data().alunos || [];
        let html = '';
        
        alunos.forEach(a => {
            html += `<div class="aluno-card">
                <div class="aluno-foto">👤</div>
                <div class="aluno-nome">${a.nome}</div>
                <div class="aluno-info">Média: ${a.media}</div>
            </div>`;
        });
        
        grid.innerHTML = html;
    });
}

// ==========================================
// ADMIN - LANÇAR NOTA
// ==========================================
function lancarNota() {
    const alunoId = document.getElementById('admin-aluno').value.trim();
    const trimestre = document.getElementById('admin-trimestre').value;
    const disciplina = document.getElementById('admin-disciplina').value;
    const notaVal = parseFloat(document.getElementById('admin-nota-valor').value);
    const msg = document.getElementById('admin-msg');
    
    if (!alunoId || isNaN(notaVal) || notaVal < 0 || notaVal > 20) {
        msg.style.color = '#e74c3c';
        msg.textContent = 'Preenche todos os campos corretamente (nota 0-20).';
        return;
    }
    
    // Verificar se é email ou UID
    let uidDestino = alunoId;
    
    // Se for email, procurar UID
    db.collection('users').where('email', '==', alunoId).get().then(snapshot => {
        if (!snapshot.empty) {
            uidDestino = snapshot.docs[0].id;
        }
        
        // Guardar nota
        const updateObj = {};
        updateObj[trimestre + '.' + disciplina] = notaVal;
        
        db.collection('notas').doc(uidDestino).set(updateObj, { merge: true })
            .then(() => {
                msg.style.color = '#27ae60';
                msg.textContent = '✅ Nota guardada com sucesso!';
                document.getElementById('admin-aluno').value = '';
                document.getElementById('admin-nota-valor').value = '';
            })
            .catch(err => {
                msg.style.color = '#e74c3c';
                msg.textContent = 'Erro: ' + err.message;
            });
    });
}

function carregarAdminStats() {
    if (!window.turmaAtual) return;
    
    db.collection('pautas').doc(window.turmaAtual).get().then(doc => {
        if (doc.exists) {
            const alunos = doc.data().alunos || [];
            document.getElementById('stat-total').textContent = alunos.length;
            
            const soma = alunos.reduce((acc, a) => acc + a.media, 0);
            const media = alunos.length > 0 ? (soma / alunos.length).toFixed(1) : '--';
            document.getElementById('stat-media-turma').textContent = media;
        }
    });
}
