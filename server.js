const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Conexão com o Banco de Dados SQLite
const db = new sqlite3.Database('./unimatricula.db', (err) => {
    if (err) {
        console.error("Erro ao abrir o banco de dados:", err.message);
    } else {
        console.log("Conectado ao banco de dados SQLite com segurança.");
        criarTabelasESeed();
    }
});

// Criar tabelas e usuários iniciais com Hash
function criarTabelasESeed() {
    db.serialize(async () => {
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            perfil TEXT NOT NULL -- 'aluno' ou 'instituicao'
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS disciplinas (
            codigo TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            cargaHoraria INTEGER NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS turmas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigoDisciplina TEXT,
            professor TEXT,
            dia INTEGER,
            turno INTEGER,
            horario TEXT,
            vagasTotais INTEGER,
            vagasOcupadas INTEGER DEFAULT 0,
            FOREIGN KEY(codigoDisciplina) REFERENCES disciplinas(codigo)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS matriculas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alunoId INTEGER,
            turmaId INTEGER,
            FOREIGN KEY(alunoId) REFERENCES usuarios(id),
            FOREIGN KEY(turmaId) REFERENCES turmas(id)
        )`);

        // Inserir usuários padrão se a tabela estiver vazia (Senha padrão criptografada: '123456')
        db.get("SELECT COUNT(*) as count FROM usuarios", async (err, row) => {
            if (row.count === 0) {
                const senhaHash = await bcrypt.hash("123456", 10);
                
                // Usuários Alunos
                db.run("INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)",
                    ["Aluno Exemplo", "aluno@unimatricula.br", senhaHash, "aluno"]
                );
                // Usuários Instituição / Gestores
                db.run("INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)", 
                    ["Coordenação Acadêmica", "admin@unimatricula.br", senhaHash, "instituicao"]);

                // Dados acadêmicos iniciais
                db.run("INSERT OR IGNORE INTO disciplinas VALUES ('INF101', 'Programação Web', 60)");
                db.run("INSERT OR IGNORE INTO disciplinas VALUES ('INF102', 'Estruturas de Dados', 80)");
                db.run("INSERT OR IGNORE INTO disciplinas VALUES ('MAT101', 'Matemática para Computação', 60)");

                db.run("INSERT INTO turmas (codigoDisciplina, professor, dia, turno, horario, vagasTotais, vagasOcupadas) VALUES ('INF101', 'Ana Souza', 2, 1, '19:00-20:40', 30, 1)");
                db.run("INSERT INTO turmas (codigoDisciplina, professor, dia, turno, horario, vagasTotais, vagasOcupadas) VALUES ('INF102', 'Carlos Lima', 3, 3, '21:00-22:30', 25, 0)");
                
                db.run("INSERT INTO matriculas (alunoId, turmaId) VALUES (1, 1)");
                console.log("Banco de dados populado com usuários e dados acadêmicos seguros.");
            }
        });
    });
}

// --- ROTAS DE AUTENTICAÇÃO ---

app.post('/api/auth/login', (req, res) => {
    const { email, senha } = req.body;

    db.get("SELECT * FROM usuarios WHERE email = ?", [email], async (err, usuario) => {
        if (err || !usuario) {
            return res.status(401).json({ erro: "E-mail ou senha inválidos." });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ erro: "E-mail ou senha inválidos." });
        }

        res.json({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            perfil: usuario.perfil
        });
    });
});

app.post('/api/auth/registrar', async (req, res) => {
    const { nome, email, senha, perfil } = req.body;

    try {
        const senhaHash = await bcrypt.hash(senha, 10);
        db.run("INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)",
            [nome, email, senhaHash, perfil || 'aluno'], function(err) {
                if (err) {
                    return res.status(400).json({ erro: "Este e-mail já está cadastrado." });
                }
                res.json({ mensagem: "Usuário cadastrado com sucesso!", id: this.lastID });
            });
    } catch (e) {
        res.status(500).json({ erro: "Erro ao criptografar senha." });
    }
});

// --- ROTAS ACADÊMICAS ---

app.get('/api/disciplinas', (req, res) => {
    db.all("SELECT * FROM disciplinas", [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

app.post('/api/disciplinas', (req, res) => {
    const { codigo, nome, cargaHoraria } = req.body;
    db.run("INSERT INTO disciplinas (codigo, nome, cargaHoraria) VALUES (?, ?, ?)", [codigo, nome, cargaHoraria], function(err) {
        if (err) return res.status(400).json({ erro: "Erro ao cadastrar disciplina (código duplicado?)." });
        res.json({ mensagem: "Disciplina cadastrada com sucesso!" });
    });
});

// Rota DELETE de disciplinas com exclusão em cascata segura
app.delete('/api/disciplinas/:codigo', (req, res) => {
    const { codigo } = req.params;
    
    db.serialize(() => {
        db.run("DELETE FROM matriculas WHERE turmaId IN (SELECT id FROM turmas WHERE codigoDisciplina = ?)", [codigo], (err) => {
            if (err) console.error("Erro ao limpar matrículas:", err);
            
            db.run("DELETE FROM turmas WHERE codigoDisciplina = ?", [codigo], (err) => {
                if (err) console.error("Erro ao limpar turmas:", err);
                
                db.run("DELETE FROM disciplinas WHERE codigo = ?", [codigo], function(err) {
                    if (err) return res.status(500).json({ erro: err.message });
                    if (this.changes === 0) {
                        return res.status(404).json({ erro: "Disciplina não encontrada." });
                    }
                    res.json({ mensagem: "Disciplina e seus vínculos excluídos com sucesso!" });
                });
            });
        });
    });
});

app.get('/api/turmas', (req, res) => {
    db.all("SELECT * FROM turmas", [], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows);
    });
});

app.post('/api/turmas', (req, res) => {
    console.log("DADOS RECEBIDOS DO FRONT-END:", req.body);
    const { codigoDisciplina, professor, dia, turno, horario, vagasTotais } = req.body;
    const horarioFinal = (horario && horario.trim() !== "") ? horario : "08:00-09:40";
    db.run("INSERT INTO turmas (codigoDisciplina, professor, dia, turno, horario, vagasTotais, vagasOcupadas) VALUES (?, ?, ?, ?, ?, ?, 0)",
        [codigoDisciplina, professor, dia, turno, horarioFinal, vagasTotais], function(err) {
            if (err) return res.status(400).json({ erro: err.message });
            res.json({ mensagem: "Turma ofertada com sucesso!", id: this.lastID });
        });
});

app.delete('/api/turmas/:id', (req, res) => {
    const { id } = req.params;
    db.serialize(() => {
        db.run("DELETE FROM matriculas WHERE turmaId = ?", [id]);
        db.run("DELETE FROM turmas WHERE id = ?", [id], function(err) {
            if (err) return res.status(500).json({ erro: err.message });
            res.json({ mensagem: "Turma excluída com sucesso!" });
        });
    });
});

app.get('/api/matriculas/:alunoId', (req, res) => {
    const { alunoId } = req.params;
    db.all("SELECT turmaId FROM matriculas WHERE alunoId = ?", [alunoId], (err, rows) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(rows.map(r => r.turmaId));
    });
});

app.post('/api/matriculas', (req, res) => {
    const { alunoId, turmaId } = req.body;

    db.get("SELECT * FROM turmas WHERE id = ?", [turmaId], (err, turmaAlvo) => {
        if (err || !turmaAlvo) return res.status(404).json({ erro: "Turma não encontrada." });

        if (turmaAlvo.vagasOcupadas >= turmaAlvo.vagasTotais) {
            return res.status(400).json({ erro: "Turma lotada!" });
        }

        db.all(`SELECT t.* FROM matriculas m JOIN turmas t ON m.turmaId = t.id WHERE m.alunoId = ?`, [alunoId], (err, turmasMatriculadas) => {
            const conflito = turmasMatriculadas.some(t => t.dia === turmaAlvo.dia && t.turno === turmaAlvo.turno);
            
            if (conflito) {
                return res.status(400).json({ erro: "Conflito de horário! Você já possui outra turma neste mesmo dia e turno." });
            }

            db.serialize(() => {
                db.run("INSERT INTO matriculas (alunoId, turmaId) VALUES (?, ?)", [alunoId, turmaId]);
                db.run("UPDATE turmas SET vagasOcupadas = vagasOcupadas + 1 WHERE id = ?", [turmaId], (err) => {
                    if (err) return res.status(500).json({ erro: err.message });
                    res.json({ mensagem: "Matrícula realizada com sucesso!" });
                });
            });
        });
    });
});

app.delete('/api/matriculas/:alunoId/:turmaId', (req, res) => {
    const { alunoId, turmaId } = req.params;
    db.run("DELETE FROM matriculas WHERE alunoId = ? AND turmaId = ?", [alunoId, turmaId], function(err) {
        if (err) return res.status(500).json({ erro: err.message });
        db.run("UPDATE turmas SET vagasOcupadas = MAX(0, vagasOcupadas - 1) WHERE id = ?", [turmaId], () => {
            res.json({ mensagem: "Matrícula cancelada com sucesso!" });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});