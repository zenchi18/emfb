// ============================================
// ESCOLA FERRAZ BOMBOCO — FASE 1
// Firebase Config (teus dados reais)
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyAlDo0woZt8UWekF7GRtEhb-4jin-vqEZQ",
  authDomain: "escola-ferraz-bomboco.firebaseapp.com",
  projectId: "escola-ferraz-bomboco",
  storageBucket: "escola-ferraz-bomboco.firebasestorage.app",
  messagingSenderId: "166991425422",
  appId: "1:166991425422:web:642da313518d0cc97c3edf"
};

// Inicializar (formato compatível com os <script> CDN v8)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let userAtual = null;
let dadosUser = null;
let tipoUser = null; // 'aluno', 'professor', 'admin'

// ============================================
// NAVEGAÇÃO — LANDING / LOGIN / REGISTRO
// ============================================

function mostrarLogin() {
  document.getElementById('auth-overlay').style.display = 'flex';
  document.getElementById('auth-seletor').style.display = 'block';
  document.getElementById('auth-login').style.display = 'none';
  document.getElementById('auth-registro').style.display = 'none';
}

function mostrarRegistro() {
  document.getElementById('auth-overlay').style.display = 'flex';
  document.getElementById('auth-seletor').style.display = 'none';
  document.getElementById('auth-login').style.display = 'none';
  document.getElementById('auth-registro').style.display = 'block';
}

function fecharAuth() {
  document.getElementById('auth-overlay').style.display = 'none';
}

function voltarSeletor() {
  document.getElementById('auth-seletor').style.display = 'block';
  document.getElementById('auth-login').style.display = 'none';
  document.getElementById('auth-registro').style.display = 'none';
}

function escolherTipo(tipo) {
  document.getElementById('auth-seletor').style.display = 'none';
  document.getElementById('auth-login').style.display = 'block';
  
  const titulos = {
    aluno: 'Login de Aluno',
    professor: 'Login de Professor',
    admin: 'Login da Administração'
  };
  document.getElementById('login-titulo').textContent = titulos[tipo] || 'Login';
}

// ============================================
// LOGIN
// ============================================

function entrar() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const erro = document.getElementById('login-erro');

  if (!email || !senha) {
    erro.textContent = 'Preenche o email e a senha.';
    return;
  }

  auth.signInWithEmailAndPassword(email, senha)
    .then(cred => {
      erro.textContent = '';
      // Verificar status no Firestore
      return db.collection('users').doc(cred.user.uid).get();
    })
    .then(doc => {
      if (!doc.exists) {
        erro.textContent = 'Dados de utilizador não encontrados.';
        auth.signOut();
        return;
      }
      
      const dados = doc.data();
      if (dados.status === 'pendente') {
        erro.textContent = 'A sua conta está em análise. Aguarde aprovação da secretaria.';
        auth.signOut();
        return;
      }
      if (dados.status === 'rejeitado') {
        erro.textContent = 'A sua conta foi rejeitada. Contacte a secretaria.';
        auth.signOut();
        return;
      }
      
      // Aprovado — o onAuthStateChanged trata o resto
    })
    .catch(err => {
      let msg = 'Erro no login. Tenta novamente.';
      if (err.code === 'auth/user-not-found') msg = 'Email não registado.';
      if (err.code === 'auth/wrong-password') msg = 'Senha incorreta.';
      if (err.code === 'auth/invalid-email') msg = 'Email inválido.';
      erro.textContent = msg;
    });
}

function sair() {
  auth.signOut();
}

// ============================================
// REGISTRO (COM APROVAÇÃO PENDENTE)
// ============================================

function registrar() {
  const nome = document.getElementById('reg-nome').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const senha = document.getElementById('reg-senha').value;
  const confirma = document.getElementById('reg-confirma').value;
  const tipo = document.getElementById('reg-tipo').value;
  const curso = document.getElementById('reg-curso').value;
  const turno = document.getElementById('reg-turno').value;
  const turma = document.getElementById('reg-turma').value.trim().toUpperCase();
  const numero = document.getElementById('reg-numero').value;
  const msg = document.getElementById('reg-msg');

  // Validações
  if (!nome || !email || !senha || !curso || !turno || !turma || !numero) {
    msg.style.color = '#e74c3c';
    msg.textContent = 'Preenche todos os campos.';
    return;
  }
  if (senha.length < 6) {
    msg.style.color = '#e74c3c';
    msg.textContent = 'A senha deve ter no mínimo 6 caracteres.';
    return;
  }
  if (senha !== confirma) {
    msg.style.color = '#e74c3c';
    msg.textContent = 'As senhas não coincidem.';
    return;
  }

  msg.style.color = '#3498db';
  msg.textContent = 'A criar conta, aguarde...';

  auth.createUserWithEmailAndPassword(email, senha)
    .then(cred => {
      // Guardar dados no Firestore
      return db.collection('users').doc(cred.user.uid).set({
        nome: nome,
        email: email,
        tipo: tipo,
        curso: curso,
        turno: turno,
        turma: turma,
        numero: parseInt(numero),
        status: 'pendente',
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      msg.style.color = '#27ae60';
      msg.textContent = '✅ Conta criada! Está em análise pela secretaria. Aguarde aprovação.';
      // Limpar formulário
      document.getElementById('reg-nome').value = '';
      document.getElementById('reg-email').value = '';
      document.getElementById('reg-senha').value = '';
      document.getElementById('reg-confirma').value = '';
      document.getElementById('reg-turma').value = '';
      document.getElementById('reg-numero').value = '';
    })
    .catch(err => {
      let texto = 'Erro ao criar conta.';
      if (err.code === 'auth/email-already-in-use') texto = 'Este email já está registado.';
      if (err.code === 'auth/invalid-email') texto = 'Email inválido.';
      msg.style.color = '#e74c3c';
      msg.textContent = texto;
    });
}

// ============================================
// AUTH STATE — QUEM ENTRA, O QUE VÊ
// ============================================

auth.onAuthStateChanged(user => {
  if (user) {
    // Buscar dados do utilizador
    db.collection('users').doc(user.uid).get().then(doc => {
      if (!doc.exists) {
        auth.signOut();
        return;
      }
      
      dadosUser = doc.data();
      userAtual = user;
      tipoUser = dadosUser.tipo;
      
      // Esconder landing/login, mostrar app
      document.getElementById('landing-page').style.display = 'none';
      document.getElementById('auth-overlay').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      
      // Configurar sidebar
      document.getElementById('sidebar-nome').textContent = dadosUser.nome;
      document.getElementById('sidebar-tipo').textContent = tipoUser.toUpperCase();
      document.getElementById('topbar-turma').textContent = 'Turma: ' + (dadosUser.turma || '--');
      document.getElementById('welcome-nome').textContent = dadosUser.nome;
      
      // Mostrar menu correto
      document.getElementById('menu-aluno').style.display = 'none';
      document.getElementById('menu-professor').style.display = 'none';
      document.getElementById('menu-admin').style.display = 'none';
      
      if (tipoUser === 'aluno') {
        document.getElementById('menu-aluno').style.display = 'block';
        navegar('aluno-inicio');
        carregarAvisosAluno();
      } else if (tipoUser === 'professor') {
        document.getElementById('menu-professor').style.display = 'block';
        navegar('prof-turmas');
        preencherTurmasProfessor();
      } else if (tipoUser === 'admin') {
        document.getElementById('menu-admin').style.display = 'block';
        navegar('admin-aprovacoes');
        carregarAdminPendentes();
        carregarAdminStats();
      }
    });
  } else {
    // Ninguém logado
    userAtual = null;
    dadosUser = null;
    tipoUser = null;
    document.getElementById('app').style.display = 'none';
    document.getElementById('landing-page').style.display = 'block';
    document.getElementById('auth-overlay').style.display = 'none';
  }
});

// ============================================
// NAVEGAÇÃO INTERNA (SIDEBAR)
// ============================================

function navegar(pagina) {
  // Esconder todas as páginas
  document.querySelectorAll('.page').forEach(p => p.classList.remove('ativa'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('ativo'));
  
  // Mostrar a escolhida
  const el = document.getElementById('page-' + pagina);
  if (el) el.classList.add('ativa');
  
  const nav = document.getElementById('nav-' + pagina);
  if (nav) nav.classList.add('ativo');
  
  // Atualizar título
  const titulos = {
    'aluno-inicio': 'Início',
    'aluno-notas': 'Minhas Notas',
    'aluno-posicao': 'Minha Posição',
    'aluno-calendario': 'Calendário Escolar',
    'prof-turmas': 'Minhas Turmas',
    'prof-lancar': 'Lançar Notas',
    'prof-avisos': 'Avisos à Turma',
    'prof-estatisticas': 'Estatísticas',
    'admin-aprovacoes': 'Aprovações Pendentes',
    'admin-estatisticas': 'Estatísticas da Escola',
    'admin-turmas': 'Gestão de Turmas'
  };
  document.getElementById('page-titulo').textContent = titulos[pagina] || 'Portal';
  
  // Carregar dados específicos
  if (pagina === 'aluno-notas') carregarNotasAluno();
  if (pagina === 'aluno-posicao') carregarPosicaoAluno();
  if (pagina === 'prof-estatisticas') carregarEstatisticasProfessor();
  if (pagina === 'admin-aprovacoes') carregarAdminPendentes();
  if (pagina === 'admin-estatisticas') carregarAdminStats();
}

// ============================================
// ALUNO — AVISOS NO INÍCIO
// ============================================

function carregarAvisosAluno() {
  if (!dadosUser || !dadosUser.turma) return;
  
  db.collection('avisos').doc(dadosUser.turma).get().then(doc => {
    const container = document.querySelector('#page-aluno-inicio .grid-cards');
    if (!container) return;
    
    // Manter os avisos estáticos e adicionar os dinâmicos no futuro
    // Por agora, os avisos estáticos no HTML já servem para Fase 1
  });
}

// ============================================
// ALUNO — NOTAS
// ============================================

function carregarNotasAluno() {
  const trimestre = document.getElementById('aluno-seletor-trimestre').value;
  const tbody = document.getElementById('aluno-tbody-notas');
  
  if (!userAtual) {
    tbody.innerHTML = '<tr><td colspan="7" class="vazio">Erro: não logado</td></tr>';
    return;
  }
  
  tbody.innerHTML = '<tr><td colspan="7" class="vazio">Carregando notas...</td></tr>';
  
  db.collection('notas').doc(userAtual.uid).get().then(doc => {
    if (!doc.exists || !doc.data()[trimestre]) {
      tbody.innerHTML = '<tr><td colspan="7" class="vazio">Nenhuma nota registada neste trimestre.</td></tr>';
      return;
    }
    
    const notasTrimestre = doc.data()[trimestre];
    let html = '';
    
    // Para cada disciplina no trimestre
    for (let disciplina in notasTrimestre) {
      const avaliacoes = notasTrimestre[disciplina];
      const mini = avaliacoes['Mini-Teste'] || '--';
      const prof = avaliacoes['Prova do Professor'] || '--';
      const trim = avaliacoes['Prova Trimestral'] || '--';
      const exame = avaliacoes['Exame'] || '--';
      
      // Calcular média simples dos valores numéricos existentes
      let soma = 0, count = 0;
      if (avaliacoes['Mini-Teste']) { soma += parseFloat(avaliacoes['Mini-Teste']); count++; }
      if (avaliacoes['Prova do Professor']) { soma += parseFloat(avaliacoes['Prova do Professor']); count++; }
      if (avaliacoes['Prova Trimestral']) { soma += parseFloat(avaliacoes['Prova Trimestral']); count++; }
      if (avaliacoes['Exame']) { soma += parseFloat(avaliacoes['Exame']); count++; }
      
      const media = count > 0 ? (soma / count).toFixed(1) : '--';
      
      let estado = '', classe = '';
      if (media !== '--') {
        const m = parseFloat(media);
        if (m >= 10) { estado = '✅ Aprovado'; classe = 'estado-aprovado'; }
        else if (m >= 8) { estado = '⚠️ Recuperação'; classe = 'estado-recuperacao'; }
        else { estado = '❌ Reprovado'; classe = 'estado-reprovado'; }
      } else {
        estado = '--'; classe = '';
      }
      
      html += `<tr>
        <td><strong>${disciplina}</strong></td>
        <td>${mini}</td>
        <td>${prof}</td>
        <td>${trim}</td>
        <td>${exame}</td>
        <td><strong>${media}</strong></td>
        <td class="${classe}">${estado}</td>
      </tr>`;
    }
    
    tbody.innerHTML = html;
  }).catch(() => {
    tbody.innerHTML = '<tr><td colspan="7" class="vazio">Erro ao carregar notas.</td></tr>';
  });
}

// ============================================
// ALUNO — POSIÇÃO NA TURMA
// ============================================

function carregarPosicaoAluno() {
  if (!dadosUser || !dadosUser.turma) return;
  
  const turma = dadosUser.turma;
  document.getElementById('posicao-turma').textContent = turma;
  
  db.collection('pautas').doc(turma).get().then(doc => {
    if (!doc.exists) {
      document.getElementById('posicao-numero').textContent = '--';
      document.getElementById('posicao-media').textContent = '--';
      return;
    }
    
    const alunos = doc.data().alunos || [];
    // Ordenar por média decrescente
    alunos.sort((a, b) => b.media - a.media);
    
    // Encontrar posição do aluno atual
    const minhaPos = alunos.findIndex(a => a.uid === userAtual.uid) + 1;
    const meusDados = alunos.find(a => a.uid === userAtual.uid);
    
    if (minhaPos > 0) {
      document.getElementById('posicao-numero').textContent = minhaPos;
      document.getElementById('posicao-media').textContent = meusDados ? meusDados.media : '--';
    } else {
      document.getElementById('posicao-numero').textContent = '--';
      document.getElementById('posicao-media').textContent = '--';
    }
  });
}

// ============================================
// PROFESSOR — PREENCHER TURMAS NOS SELECTS
// ============================================

function preencherTurmasProfessor() {
  if (!dadosUser || !dadosUser.turmas) return;
  
  const turmas = dadosUser.turmas; // array no perfil do professor
  
  // Preencher select de lançamento
  const selLancar = document.getElementById('prof-lancar-turma');
  const selAviso = document.getElementById('prof-aviso-turma');
  
  // Limpar e adicionar opção padrão
  selLancar.innerHTML = '<option value="">Selecione...</option>';
  selAviso.innerHTML = '<option value="">Selecione...</option>';
  
  turmas.forEach(t => {
    selLancar.innerHTML += `<option value="${t}">${t}</option>`;
    selAviso.innerHTML += `<option value="${t}">${t}</option>`;
  });
  
  // Preencher lista de turmas na página
  const lista = document.getElementById('prof-lista-turmas');
  let html = '';
  turmas.forEach(t => {
    html += `<div class="turma-card"><h4>👥 Turma ${t}</h4><p>Clique em "Lançar Notas" para adicionar avaliações.</p></div>`;
  });
  lista.innerHTML = html || '<p class="vazio">Nenhuma turma atribuída.</p>';
}

function atualizarAlunosLancar() {
  const turma = document.getElementById('prof-lancar-turma').value;
  const selAluno = document.getElementById('prof-lancar-aluno');
  
  if (!turma) {
    selAluno.innerHTML = '<option value="">Selecione a turma primeiro...</option>';
    return;
  }
  
  selAluno.innerHTML = '<option value="">Carregando alunos...</option>';
  
  // Buscar alunos da turma na pauta
  db.collection('pautas').doc(turma).get().then(doc => {
    if (!doc.exists) {
      selAluno.innerHTML = '<option value="">Nenhum aluno nesta turma</option>';
      return;
    }
    
    const alunos = doc.data().alunos || [];
    selAluno.innerHTML = '<option value="">Selecione o aluno...</option>';
    alunos.forEach(a => {
      selAluno.innerHTML += `<option value="${a.uid}">${a.nome}</option>`;
    });
  });
}

// ============================================
// PROFESSOR — LANÇAR NOTA (SEM EDIÇÃO DEPOIS)
// ============================================

function lancarNotaProfessor() {
  const uidAluno = document.getElementById('prof-lancar-aluno').value;
  const trimestre = document.getElementById('prof-lancar-trimestre').value;
  const tipo = document.getElementById('prof-lancar-tipo').value;
  const disciplina = document.getElementById('prof-lancar-disciplina').value;
  const notaVal = parseFloat(document.getElementById('prof-lancar-nota').value);
  const msg = document.getElementById('prof-lancar-msg');
  
  if (!uidAluno || !trimestre || !disciplina || isNaN(notaVal) || notaVal < 0 || notaVal > 20) {
    msg.style.color = '#e74c3c';
    msg.textContent = 'Preenche todos os campos corretamente (nota 0-20).';
    return;
  }
  
  msg.style.color = '#3498db';
  msg.textContent = 'A guardar...';
  
  // Estrutura: notas/{uid}/{trimestre}/{disciplina}/{tipo} = nota
  const caminho = {};
  caminho[trimestre + '.' + disciplina + '.' + tipo] = notaVal;
  
  db.collection('notas').doc(uidAluno).update(caminho)
    .then(() => {
      msg.style.color = '#27ae60';
      msg.textContent = '✅ Nota guardada com sucesso! Não pode ser editada.';
      document.getElementById('prof-lancar-nota').value = '';
    })
    .catch(err => {
      // Se o documento não existir ainda, usar set com merge
      const dados = {};
      dados[trimestre] = {};
      dados[trimestre][disciplina] = {};
      dados[trimestre][disciplina][tipo] = notaVal;
      
      db.collection('notas').doc(uidAluno).set(dados, { merge: true })
        .then(() => {
          msg.style.color = '#27ae60';
          msg.textContent = '✅ Nota guardada com sucesso! Não pode ser editada.';
          document.getElementById('prof-lancar-nota').value = '';
        })
        .catch(err2 => {
          msg.style.color = '#e74c3c';
          msg.textContent = 'Erro: ' + err2.message;
        });
    });
}

// ============================================
// PROFESSOR — ENVIAR AVISO
// ============================================

function enviarAviso() {
  const turma = document.getElementById('prof-aviso-turma').value;
  const texto = document.getElementById('prof-aviso-texto').value.trim();
  const msg = document.getElementById('prof-aviso-msg');
  
  if (!turma || !texto) {
    msg.style.color = '#e74c3c';
    msg.textContent = 'Selecione a turma e escreva a mensagem.';
    return;
  }
  
  const aviso = {
    texto: texto,
    data: new Date().toLocaleDateString('pt-AO'),
    autor: dadosUser ? dadosUser.nome : 'Professor'
  };
  
  db.collection('avisos').doc(turma).set({
    lista: firebase.firestore.FieldValue.arrayUnion(aviso)
  }, { merge: true })
    .then(() => {
      msg.style.color = '#27ae60';
      msg.textContent = '✅ Aviso enviado com sucesso!';
      document.getElementById('prof-aviso-texto').value = '';
    })
    .catch(err => {
      msg.style.color = '#e74c3c';
      msg.textContent = 'Erro: ' + err.message;
    });
}

// ============================================
// PROFESSOR — ESTATÍSTICAS
// ============================================

function carregarEstatisticasProfessor() {
  // Na Fase 1, estatísticas simples baseadas na primeira turma do professor
  if (!dadosUser || !dadosUser.turmas || dadosUser.turmas.length === 0) return;
  
  const turma = dadosUser.turmas[0];
  
  db.collection('pautas').doc(turma).get().then(doc => {
    if (!doc.exists) {
      document.getElementById('prof-stat-total').textContent = '--';
      document.getElementById('prof-stat-media').textContent = '--';
      document.getElementById('prof-stat-melhor').textContent = '--';
      document.getElementById('prof-stat-risco').textContent = '--';
      return;
    }
    
    const alunos = doc.data().alunos || [];
    document.getElementById('prof-stat-total').textContent = alunos.length;
    
    if (alunos.length === 0) return;
    
    const soma = alunos.reduce((acc, a) => acc + (a.media || 0), 0);
    const media = (soma / alunos.length).toFixed(1);
    document.getElementById('prof-stat-media').textContent = media;
    
    const melhor = Math.max(...alunos.map(a => a.media || 0));
    document.getElementById('prof-stat-melhor').textContent = melhor;
    
    const risco = alunos.filter(a => (a.media || 0) < 10).length;
    document.getElementById('prof-stat-risco').textContent = risco;
  });
}

// ============================================
// ADMIN — APROVAÇÕES PENDENTES
// ============================================

function carregarAdminPendentes() {
  const container = document.getElementById('admin-lista-pendentes');
  container.innerHTML = '<p class="vazio">A carregar contas pendentes...</p>';
  
  db.collection('users').where('status', '==', 'pendente').get()
    .then(snapshot => {
      if (snapshot.empty) {
        container.innerHTML = '<p class="vazio">Nenhuma conta pendente de aprovação.</p>';
        return;
      }
      
      let html = '';
      snapshot.forEach(doc => {
        const u = doc.data();
        html += `<div class="pendente-card">
          <div class="pendente-info">
            <strong>${u.nome}</strong>
            <span>${u.email}</span>
            <span>Tipo: ${u.tipo} | Turma: ${u.turma || '--'} | Curso: ${u.curso || '--'}</span>
          </div>
          <div class="pendente-acoes">
            <button onclick="aprovarConta('${doc.id}')" class="btn-aprovar">✅ Aprovar</button>
            <button onclick="rejeitarConta('${doc.id}')" class="btn-rejeitar">❌ Rejeitar</button>
          </div>
        </div>`;
      });
      
      container.innerHTML = html;
    })
    .catch(() => {
      container.innerHTML = '<p class="vazio">Erro ao carregar pendentes.</p>';
    });
}

function aprovarConta(uid) {
  db.collection('users').doc(uid).update({ status: 'aprovado' })
    .then(() => {
      carregarAdminPendentes();
      carregarAdminStats();
    });
}

function rejeitarConta(uid) {
  db.collection('users').doc(uid).update({ status: 'rejeitado' })
    .then(() => {
      carregarAdminPendentes();
      carregarAdminStats();
    });
}

// ============================================
// ADMIN — ESTATÍSTICAS GERAIS
// ============================================

function carregarAdminStats() {
  // Total de alunos
  db.collection('users').where('tipo', '==', 'aluno').where('status', '==', 'aprovado').get()
    .then(snap => {
      document.getElementById('admin-stat-alunos').textContent = snap.size;
    });
  
  // Total de professores
  db.collection('users').where('tipo', '==', 'professor').where('status', '==', 'aprovado').get()
    .then(snap => {
      document.getElementById('admin-stat-professores').textContent = snap.size;
    });
  
  // Turmas ativas (contar docs em pautas)
  db.collection('pautas').get().then(snap => {
    document.getElementById('admin-stat-turmas').textContent = snap.size;
  });
  
  // Pendentes
  db.collection('users').where('status', '==', 'pendente').get()
    .then(snap => {
      document.getElementById('admin-stat-pendentes').textContent = snap.size;
    });
}

// ============================================
// INICIALIZAÇÃO
// ============================================
console.log('Escola Ferraz Bomboco — Fase 1 carregada.');
