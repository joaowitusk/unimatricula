"use strict";

/*
 * UniMatrícula
 * Sistema Acadêmico com Autenticação e API Node.js / SQLite
 */

const API_URL = "http://localhost:3000/api";
let usuarioLogado = JSON.parse(localStorage.getItem("unimatricula_usuario")) || null;

let dados = {
    disciplinas: [],
    turmas: [],
    matriculas: []
};

const DIAS = {
    2: "Segunda-feira",
    3: "Terça-feira",
    4: "Quarta-feira",
    5: "Quinta-feira",
    6: "Sexta-feira",
    7: "Sábado"
};

const TURNOS = {
    1: "Manhã",
    2: "Tarde",
    3: "Noite"
};

// --------------------------------------------------
// 1. AUTENTICAÇÃO E CONTROLE DE SESSÃO
// --------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    configurarLogin();
    
    if (usuarioLogado) {
        iniciarSistema();
    } else {
        mostrarTelaLogin();
    }
});

function configurarLogin() {
    const formLogin = document.getElementById("formLogin");
    if (!formLogin) return;

    formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value.trim();
        const senha = document.getElementById("loginSenha").value.trim();

        try {
            const resposta = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, senha })
            });
            const resultado = await resposta.json();

            if (!resposta.ok) {
                mostrarMensagem(resultado.erro || "E-mail ou senha inválidos.", "danger");
                return;
            }

            usuarioLogado = resultado;
            localStorage.setItem("unimatricula_usuario", JSON.stringify(usuarioLogado));
            
            formLogin.reset();
            iniciarSistema();
            mostrarMensagem("Login realizado com sucesso!");
        } catch (erro) {
            console.error("Erro no login:", erro);
            mostrarMensagem("Erro ao conectar com o servidor.", "danger");
        }
    });
}
// --------------------------------------------------
// SUPLEMENTO: MOSTRAR / OCULTAR SENHA (OLHINHO)
// --------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("loginSenha");
    const toggleIcon = document.getElementById("toggleIcon");

    if (toggleBtn && passwordInput && toggleIcon) {
        toggleBtn.addEventListener("click", () => {
            const isPassword = passwordInput.type === "password";
            passwordInput.type = isPassword ? "text" : "password";
            
            // Alterna o ícone do olho (Bootstrap Icons)
            toggleIcon.classList.toggle("bi-eye", !isPassword);
            toggleIcon.classList.toggle("bi-eye-slash", isPassword);
        });
    }
});

function logout() {
    confirmarAcao(
        "Deseja realmente encerrar a sessão?",
        () => {
            localStorage.removeItem("unimatricula_usuario");
            usuarioLogado = null;
            mostrarTelaLogin();
            mostrarMensagem("Sessão encerrada com sucesso.");
        },
        "Encerrar sessão"
    );
}

function mostrarTelaLogin() {
    const loginScreen = document.getElementById("loginScreen");
    const appContainer = document.getElementById("appContainer");
    
    if (loginScreen) loginScreen.style.display = "flex";
    if (appContainer) appContainer.style.display = "none";
}

async function iniciarSistema() {
    const loginScreen = document.getElementById("loginScreen");
    const appContainer = document.getElementById("appContainer");
    
    if (loginScreen) loginScreen.style.display = "none";
    if (appContainer) appContainer.style.display = "flex";

    const nomeEl = document.getElementById("userName");
    const emailEl = document.getElementById("userEmail");
    const inicialEl = document.getElementById("userInitial");
    const badgeEl = document.getElementById("userRoleBadge");

    if (nomeEl) nomeEl.textContent = usuarioLogado.nome;
    if (emailEl) emailEl.textContent = usuarioLogado.email;
    if (inicialEl) inicialEl.textContent = usuarioLogado.nome.substring(0, 2).toUpperCase();
    if (badgeEl) badgeEl.textContent = usuarioLogado.perfil === 'instituicao' ? 'Gestão Acadêmica' : 'Portal do Aluno';

    document.querySelectorAll(".menu-instituicao").forEach(el => {
        el.style.display = usuarioLogado.perfil === 'instituicao' ? 'flex' : 'none';
    });

    await carregarDadosDoServidor();
    navegarPara("dashboard");
}

async function carregarDadosDoServidor() {
    try {
        const [resDisc, resTurmas, resMatriculas] = await Promise.all([
            fetch(`${API_URL}/disciplinas`),
            fetch(`${API_URL}/turmas`),
            fetch(`${API_URL}/matriculas/${usuarioLogado.id}`)
        ]);

        dados.disciplinas = await resDisc.json();
        dados.turmas = await resTurmas.json();
        
        const idsMatriculas = await resMatriculas.json();
        dados.matriculas = idsMatriculas.map((turmaId, index) => ({
            id: index + 1,
            turmaId: turmaId,
            alunoId: usuarioLogado.id,
            data: new Date().toISOString()
        }));

        renderizarTudo();
    } catch (erro) {
        console.error("Erro ao carregar dados da API:", erro);
        mostrarMensagem("Erro ao carregar dados do servidor.", "danger");
    }
}

// --------------------------------------------------
// 2. FUNÇÕES AUXILIARES
// --------------------------------------------------

function obterDisciplina(id) {
    return dados.disciplinas.find(disciplina => disciplina.id === Number(id) || disciplina.codigo === id);
}

function obterTurma(id) {
    return dados.turmas.find(turma => turma.id === Number(id));
}

function obterNomeDisciplina(id) {
    const disc = dados.disciplinas.find(d => d.id === Number(d) || d.codigo === id);
    return disc?.nome || "Disciplina indisponível";
}

function codigoHorario(turma) {
    return Number(turma.dia) * 10 + Number(turma.turno);
}

function vagasOcupadas(turmaId) {
    const turma = obterTurma(turmaId);
    return turma ? Number(turma.vagasOcupadas || 0) : 0;
}

function vagasDisponiveis(turma) {
    return Math.max(0, Number(turma.vagasTotais) - vagasOcupadas(turma.id));
}

function matriculado(turmaId) {
    return dados.matriculas.some(
        matricula => matricula.turmaId === Number(turmaId) && matricula.alunoId === usuarioLogado.id
    );
}

function formatarDia(dia) {
    return DIAS[dia] || "Dia não definido";
}

function formatarTurno(turno) {
    return TURNOS[turno] || "Turno não definido";
}

function obterCodigoTurma(turma) {
    return String(codigoHorario(turma)).padStart(2, "0");
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function vazio(mensagem) {
    return `
        <tr>
            <td colspan="10">
                <div class="empty-state">
                    <i class="bi bi-inbox"></i>
                    <p>${escaparHTML(mensagem)}</p>
                </div>
            </td>
        </tr>
    `;
}

function mostrarMensagem(mensagem, tipo = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const toastHTML = `
        <div id="${id}" class="toast align-items-center text-bg-${escaparHTML(tipo)} border-0" role="status">
            <div class="d-flex">
                <div class="toast-body">${escaparHTML(mensagem)}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
            </div>
        </div>
    `;

    container.insertAdjacentHTML("beforeend", toastHTML);
    const elemento = document.getElementById(id);
    const toast = bootstrap.Toast.getOrCreateInstance(elemento, { delay: 3500 });
    elemento.addEventListener("hidden.bs.toast", () => elemento.remove());
    toast.show();
}

function confirmarAcao(mensagem, callback, titulo = "Confirmar ação") {
    document.getElementById("confirmTitle").textContent = titulo;
    document.getElementById("confirmMessage").textContent = mensagem;

    const modalElemento = document.getElementById("confirmModal");
    const botao = document.getElementById("confirmAction");
    const modal = bootstrap.Modal.getOrCreateInstance(modalElemento);

    const novoBotao = botao.cloneNode(true);
    botao.replaceWith(novoBotao);

    novoBotao.addEventListener("click", () => {
        modal.hide();
        callback();
    }, { once: true });

    modal.show();
}

// --------------------------------------------------
// 3. NAVEGAÇÃO
// --------------------------------------------------

const titulosPaginas = {
    dashboard: ["Dashboard", "Visão geral do sistema acadêmico"],
    ofertas: ["Ofertas de turmas", "Consulte as disciplinas disponíveis"],
    matriculas: ["Minhas matrículas", "Acompanhe suas inscrições acadêmicas"],
    disciplinas: ["Disciplinas", "Gerenciamento do catálogo acadêmico"],
    turmas: ["Gerenciar turmas", "Cadastro e gerenciamento das ofertas"]
};

function navegarPara(pagina) {
    if (!titulosPaginas[pagina]) return;

    document.querySelectorAll(".page-section").forEach(secao => {
        secao.classList.toggle("active", secao.id === `page-${pagina}`);
    });

    document.querySelectorAll(".sidebar-nav .nav-link").forEach(botao => {
        botao.classList.toggle("active", botao.dataset.page === pagina);
    });

    const [titulo, subtitulo] = titulosPaginas[pagina];
    document.getElementById("pageTitle").textContent = titulo;
    document.getElementById("pageSubtitle").textContent = subtitulo;

    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("open");

    renderizarTudo();
}

document.querySelectorAll("[data-page]").forEach(botao => {
    botao.addEventListener("click", () => navegarPara(botao.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(botao => {
    botao.addEventListener("click", () => navegarPara(botao.dataset.go));
});

const menuToggle = document.getElementById("menuToggle");
if (menuToggle) {
    menuToggle.addEventListener("click", () => {
        document.getElementById("sidebar").classList.toggle("open");
    });
}

function renderizarTudo() {
    renderizarDashboard();
    renderizarOfertas();
    renderizarMatriculas();
    renderizarDisciplinas();
    renderizarTurmas();
}

// --------------------------------------------------
// 4. DASHBOARD
// --------------------------------------------------

function renderizarDashboard() {
    const elDisc = document.getElementById("totalDisciplinas");
    const elTurmas = document.getElementById("totalTurmas");
    const elMat = document.getElementById("totalMatriculas");
    const elVagas = document.getElementById("totalVagas");

    if (elDisc) elDisc.textContent = dados.disciplinas.length;
    if (elTurmas) elTurmas.textContent = dados.turmas.length;
    if (elMat) elMat.textContent = dados.matriculas.length;

    if (elVagas) {
        const totalVagas = dados.turmas.reduce((total, turma) => total + vagasDisponiveis(turma), 0);
        elVagas.textContent = totalVagas;
    }

    const turmasDisponiveis = dados.turmas.filter(turma => vagasDisponiveis(turma) > 0).slice(0, 5);
    const corpo = document.getElementById("dashboardTurmas");
    if (!corpo) return;

    if (turmasDisponiveis.length === 0) {
        corpo.innerHTML = vazio("Não existem ofertas com vagas disponíveis.");
        return;
    }

    corpo.innerHTML = turmasDisponiveis.map(turma => `
        <tr>
            <td>
                <span class="subject-name">${escaparHTML(obterNomeDisciplina(turma.codigoDisciplina || turma.disciplinaId))}</span>
                <span class="subject-code">Turma ${escaparHTML(obterCodigoTurma(turma))}</span>
            </td>
            <td>${escaparHTML(turma.professor)}</td>
            <td>
                ${escaparHTML(formatarDia(turma.dia))}
                <br>
                <span class="text-secondary">${escaparHTML(turma.horario || "Horário padrão")}</span>
            </td>
            <td>
                <span class="badge-soft">${vagasDisponiveis(turma)} vagas</span>
            </td>
        </tr>
    `).join("");
}

// --------------------------------------------------
// 5. OFERTAS E FILTROS
// --------------------------------------------------

function renderizarOfertas() {
    const inputPesquisa = document.getElementById("filtroOferta");
    const inputTurno = document.getElementById("filtroTurno");
    const inputDia = document.getElementById("filtroDia");
    const container = document.getElementById("listaOfertas");

    if (!container) return;

    const pesquisa = inputPesquisa ? inputPesquisa.value.trim().toLocaleLowerCase("pt-BR") : "";
    const turno = inputTurno ? inputTurno.value : "";
    const dia = inputDia ? inputDia.value : "";

    const turmasFiltradas = dados.turmas.filter(turma => {
        const nome = obterNomeDisciplina(turma.codigoDisciplina || turma.disciplinaId).toLocaleLowerCase("pt-BR");
        const professor = (turma.professor || "").toLocaleLowerCase("pt-BR");

        const correspondePesquisa = nome.includes(pesquisa) || professor.includes(pesquisa);
        const correspondeTurno = !turno || Number(turma.turno) === Number(turno);
        const correspondeDia = !dia || Number(turma.dia) === Number(dia);

        return correspondePesquisa && correspondeTurno && correspondeDia;
    });

    if (turmasFiltradas.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-search"></i>
                    <p>Nenhuma turma encontrada com esses filtros.</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = turmasFiltradas.map(turma => {
        const disciplina = obterDisciplina(turma.codigoDisciplina || turma.disciplinaId);
        const vagas = vagasDisponiveis(turma);
        const jaMatriculado = matriculado(turma.id);

        let botao;
        if (usuarioLogado.perfil === 'instituicao') {
            botao = `<small class="text-muted">Apenas para alunos</small>`;
        } else if (jaMatriculado) {
            botao = `<button class="btn btn-outline-success" disabled><i class="bi bi-check-circle me-1"></i>Matriculado</button>`;
        } else if (vagas === 0) {
            botao = `<button class="btn btn-secondary" disabled>Turma lotada</button>`;
        } else {
            botao = `<button class="btn btn-primary" data-enroll="${turma.id}"><i class="bi bi-plus-circle me-1"></i>Matricular-se</button>`;
        }

        return `
            <div class="col-12 col-lg-6 col-xxl-4">
                <article class="offer-card">
                    <span class="badge-soft">${escaparHTML(disciplina?.codigo || turma.codigoDisciplina || "GER")}</span>
                    <h4>${escaparHTML(obterNomeDisciplina(turma.codigoDisciplina || turma.disciplinaId))}</h4>
                    <span class="offer-code">Turma ${escaparHTML(obterCodigoTurma(turma))}</span>
                    <div class="offer-details">
                        <div><i class="bi bi-person"></i> ${escaparHTML(turma.professor)}</div>
                        <div><i class="bi bi-calendar3"></i> ${escaparHTML(formatarDia(turma.dia))}</div>
                        <div><i class="bi bi-clock"></i> ${escaparHTML(turma.horario || "08:00-09:40")} · ${escaparHTML(formatarTurno(turma.turno))}</div>
                        <div><i class="bi bi-people"></i> ${vagas} de ${turma.vagasTotais} vagas disponíveis</div>
                    </div>
                    <div class="offer-footer">
                        <span class="badge-soft ${vagas === 0 ? "badge-warning-soft" : "badge-success-soft"}">
                            ${vagas === 0 ? "Lotada" : "Disponível"}
                        </span>
                        ${botao}
                    </div>
                </article>
            </div>
        `;
    }).join("");
}

["filtroOferta", "filtroTurno", "filtroDia"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener("input", renderizarOfertas);
        el.addEventListener("change", renderizarOfertas);
    }
});

// --------------------------------------------------
// 6. MATRÍCULAS COM API
// --------------------------------------------------

async function realizarMatricula(turmaId) {
    if (usuarioLogado.perfil !== 'aluno') {
        mostrarMensagem("Apenas alunos podem realizar matrículas.", "warning");
        return;
    }

    const turma = obterTurma(turmaId);
    if (!turma) {
        mostrarMensagem("Turma não encontrada.", "danger");
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/matriculas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alunoId: usuarioLogado.id, turmaId: turma.id })
        });
        const resultado = await resposta.json();

        if (!resposta.ok) {
            mostrarMensagem(resultado.erro || "Erro ao realizar matrícula.", "warning");
            return;
        }

        await carregarDadosDoServidor();
        mostrarMensagem("Matrícula realizada com sucesso!");
    } catch (erro) {
        console.error("Erro na matrícula:", erro);
        mostrarMensagem("Erro de comunicação com o servidor.", "danger");
    }
}

async function cancelarMatricula(matriculaId) {
    const matricula = dados.matriculas.find(item => item.id === Number(matriculaId));
    if (!matricula) {
        mostrarMensagem("Matrícula não encontrada.", "danger");
        return;
    }

    confirmarAcao(
        "Deseja realmente cancelar esta matrícula?",
        async () => {
            try {
                const resposta = await fetch(`${API_URL}/matriculas/${usuarioLogado.id}/${matricula.turmaId}`, {
                    method: "DELETE"
                });

                if (!resposta.ok) {
                    mostrarMensagem("Erro ao cancelar matrícula.", "danger");
                    return;
                }

                await carregarDadosDoServidor();
                mostrarMensagem("Matrícula cancelada. A vaga foi liberada.");
            } catch (erro) {
                console.error("Erro ao cancelar:", erro);
                mostrarMensagem("Erro de comunicação com o servidor.", "danger");
            }
        },
        "Cancelar matrícula"
    );
}

function renderizarMatriculas() {
    const corpo = document.getElementById("listaMatriculas");
    if (!corpo) return;

    const minhas = dados.matriculas.filter(matricula => matricula.alunoId === usuarioLogado.id);

    if (minhas.length === 0) {
        corpo.innerHTML = vazio("Você ainda não possui matrículas.");
        return;
    }

    corpo.innerHTML = minhas.map(matricula => {
        const turma = obterTurma(matricula.turmaId);
        if (!turma) return "";

        return `
            <tr>
                <td>
                    <span class="subject-name">${escaparHTML(obterNomeDisciplina(turma.codigoDisciplina || turma.disciplinaId))}</span>
                    <span class="subject-code">Turma ${escaparHTML(obterCodigoTurma(turma))}</span>
                </td>
                <td>${escaparHTML(turma.professor)}</td>
                <td>
                    ${escaparHTML(formatarDia(turma.dia))}
                    <br>
                    <span class="text-secondary">${escaparHTML(turma.horario || "08:00-09:40")}</span>
                </td>
                <td>${escaparHTML(formatarTurno(turma.turno))}</td>
                <td>
                    <button class="btn btn-outline-danger" data-cancel="${matricula.id}">
                        <i class="bi bi-x-circle me-1"></i> Cancelar
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// --------------------------------------------------
// 7. DISCIPLINAS COM API
// --------------------------------------------------

function renderizarDisciplinas() {
    const corpo = document.getElementById("listaDisciplinas");
    if (!corpo) return;

    if (dados.disciplinas.length === 0) {
        corpo.innerHTML = vazio("Nenhuma disciplina cadastrada.");
        atualizarSelectDisciplinas();
        return;
    }

    corpo.innerHTML = dados.disciplinas.map(disciplina => {
        const possuiTurmas = dados.turmas.some(turma => turma.codigoDisciplina === disciplina.codigo || turma.disciplinaId === disciplina.id);

        return `
            <tr>
                <td><span class="badge-soft">${escaparHTML(disciplina.codigo)}</span></td>
                <td>${escaparHTML(disciplina.nome)}</td>
                <td>${disciplina.cargaHoraria} horas</td>
                <td>
                    <button class="btn btn-outline-danger" data-delete-disciplina="${disciplina.codigo}" ${possuiTurmas ? "disabled title='Existem turmas vinculadas'" : ""}>
                        <i class="bi bi-trash me-1"></i> Excluir
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    atualizarSelectDisciplinas();
}

const formDisciplina = document.getElementById("formDisciplina");
if (formDisciplina) {
    formDisciplina.addEventListener("submit", async evento => {
        evento.preventDefault();

        const codigo = document.getElementById("codigoDisciplina").value.trim().toUpperCase();
        const nome = document.getElementById("nomeDisciplina").value.trim();
        const cargaHoraria = Number(document.getElementById("cargaHoraria").value);

        try {
            const resposta = await fetch(`${API_URL}/disciplinas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ codigo, nome, cargaHoraria })
            });
            const resultado = await resposta.json();

            if (!resposta.ok) {
                mostrarMensagem(resultado.erro || "Erro ao cadastrar disciplina.", "warning");
                return;
            }

            formDisciplina.reset();
            await carregarDadosDoServidor();
            mostrarMensagem("Disciplina cadastrada com sucesso!");
        } catch (erro) {
            console.error("Erro ao cadastrar disciplina:", erro);
            mostrarMensagem("Erro de comunicação com o servidor.", "danger");
        }
    });
}

async function excluirDisciplina(codigo) {
    confirmarAcao(
        `Deseja excluir a disciplina de código "${codigo}"?`,
        async () => {
            try {
                const resposta = await fetch(`${API_URL}/disciplinas/${codigo}`, {
                    method: "DELETE"
                });

                if (!resposta.ok) {
                    mostrarMensagem("Erro ao excluir disciplina.", "danger");
                    return;
                }

                await carregarDadosDoServidor();
                mostrarMensagem("Disciplina excluída com sucesso.");
            } catch (erro) {
                console.error("Erro ao excluir:", erro);
                mostrarMensagem("Erro de comunicação com o servidor.", "danger");
            }
        },
        "Excluir disciplina"
    );
}

// --------------------------------------------------
// 8. GERENCIAMENTO DE TURMAS COM API
// --------------------------------------------------

function atualizarSelectDisciplinas() {
    const select = document.getElementById("disciplinaTurma");
    if (!select) return;
    const valorAtual = select.value;

    select.innerHTML = `
        <option value="">Selecione uma disciplina</option>
        ${dados.disciplinas.map(disciplina => `
            <option value="${disciplina.codigo}">
                ${escaparHTML(disciplina.codigo)} — ${escaparHTML(disciplina.nome)}
            </option>
        `).join("")}
    `;

    select.value = valorAtual;
}

const formTurma = document.getElementById("formTurma");
if (formTurma) {
    formTurma.addEventListener("submit", async evento => {
        evento.preventDefault();

        const codigoDisciplina = document.getElementById("disciplinaTurma").value;
        const professor = document.getElementById("professorTurma").value.trim();
        const dia = Number(document.getElementById("diaTurma").value);
        const turno = Number(document.getElementById("turnoTurma").value);
        const vagasTotais = Number(document.getElementById("vagasTurma").value);

        if (!codigoDisciplina || !professor || !dia || !turno || !vagasTotais) {
            mostrarMensagem("Preencha todos os campos da turma.", "warning");
            return;
        }

        try {
            const resposta = await fetch(`${API_URL}/turmas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ codigoDisciplina, professor, dia, turno, vagasTotais })
            });

            if (!resposta.ok) {
                mostrarMensagem("Erro ao ofertar turma.", "warning");
                return;
            }

            formTurma.reset();
            await carregarDadosDoServidor();
            mostrarMensagem("Turma ofertada com sucesso!");
        } catch (erro) {
            console.error("Erro ao ofertar turma:", erro);
            mostrarMensagem("Erro de comunicação com o servidor.", "danger");
        }
    });
}

function renderizarTurmas() {
    const corpo = document.getElementById("listaTurmasGerenciar");
    if (!corpo) return;

    if (dados.turmas.length === 0) {
        corpo.innerHTML = vazio("Nenhuma turma ofertada.");
        return;
    }

    corpo.innerHTML = dados.turmas.map(turma => {
        const ocupadas = vagasOcupadas(turma.id);
        const disponiveis = vagasDisponiveis(turma);

        return `
            <tr>
                <td>${escaparHTML(obterNomeDisciplina(turma.codigoDisciplina || turma.disciplinaId))}</td>
                <td>${escaparHTML(turma.professor)}</td>
                <td><span class="badge-soft">${escaparHTML(obterCodigoTurma(turma))}</span></td>
                <td>
                    ${escaparHTML(formatarDia(turma.dia))} · ${escaparHTML(formatarTurno(turma.turno))}
                </td>
                <td>${ocupadas}/${turma.vagasTotais} (${disponiveis} disp.)</td>
                <td>
                    <button class="btn btn-outline-danger" data-delete-turma="${turma.id}" ${ocupadas > 0 ? "disabled title='Existem matrículas vinculadas'" : ""}>
                        <i class="bi bi-trash me-1"></i> Excluir
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

async function excluirTurma(turmaId) {
    confirmarAcao(
        "Deseja realmente excluir esta oferta de turma?",
        async () => {
            try {
                const resposta = await fetch(`${API_URL}/turmas/${turmaId}`, {
                    method: "DELETE"
                });

                if (!resposta.ok) {
                    mostrarMensagem("Erro ao excluir turma.", "danger");
                    return;
                }

                await carregarDadosDoServidor();
                mostrarMensagem("Oferta de turma excluída.");
            } catch (erro) {
                console.error("Erro ao excluir turma:", erro);
                mostrarMensagem("Erro de comunicação com o servidor.", "danger");
            }
        },
        "Excluir oferta"
    );
}

// --------------------------------------------------
// 9. EVENTOS DOS BOTÕES DINÂMICOS E RODAPÉ
// --------------------------------------------------

document.addEventListener("click", evento => {
    const botaoMatricula = evento.target.closest("[data-enroll]");
    if (botaoMatricula) {
        realizarMatricula(Number(botaoMatricula.dataset.enroll));
        return;
    }

    const botaoCancelar = evento.target.closest("[data-cancel]");
    if (botaoCancelar) {
        cancelarMatricula(Number(botaoCancelar.dataset.cancel));
        return;
    }

    const botaoExcluirDisciplina = evento.target.closest("[data-delete-disciplina]");
    if (botaoExcluirDisciplina) {
        excluirDisciplina(botaoExcluirDisciplina.dataset.deleteDisciplina);
        return;
    }

    const botaoExcluirTurma = evento.target.closest("[data-delete-turma]");
    if (botaoExcluirTurma) {
        excluirTurma(Number(botaoExcluirTurma.dataset.deleteTurma));
    }
});

const elementoAno = document.getElementById("anoAtual");
if (elementoAno) {
    elementoAno.textContent = new Date().getFullYear();
}