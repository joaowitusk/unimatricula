
# Planejamento do UniMatrícula

## 1. Problema

O processo de oferta de turmas e matrícula universitária
precisa apresentar as disciplinas, professores, horários
e vagas de forma organizada para alunos e instituição.

## 2. Objetivo geral

Desenvolver uma aplicação web front-end que simule o processo
de atendimento e matrícula universitária.

## 3. Usuários previstos

### Aluno
- Consultar ofertas.
- Filtrar turmas.
- Realizar matrícula.
- Consultar matrículas.
- Cancelar matrícula.

### Instituição
- Cadastrar disciplinas.
- Criar ofertas de turmas.
- Definir professor, dia, turno, horário e vagas.
- Consultar a ocupação das turmas.

Observação: nesta versão demonstrativa, não existe autenticação.
As duas visões são acessíveis pela mesma interface.

## 4. Casos de uso

### UC01 — Consultar ofertas
Ator: aluno.

Fluxo:
1. Acessar ofertas de turmas.
2. Consultar as informações disponíveis.
3. Aplicar filtros.
4. Visualizar as vagas restantes.

### UC02 — Realizar matrícula
Ator: aluno.

Pré-condições:
- A turma deve existir.
- Deve haver vagas disponíveis.
- O aluno não pode estar matriculado na mesma turma.
- Não deve existir conflito de horário.

Fluxo:
1. Selecionar uma turma.
2. Solicitar matrícula.
3. Confirmar a operação.
4. Registrar a matrícula.
5. Atualizar a quantidade de vagas.

### UC03 — Consultar e cancelar matrícula
Ator: aluno.

Fluxo:
1. Acessar minhas matrículas.
2. Consultar as turmas registradas.
3. Selecionar cancelamento.
4. Confirmar a operação.
5. Liberar a vaga.

### UC04 — Cadastrar disciplina
Ator: instituição.

Fluxo:
1. Informar código, nome e carga horária.
2. Validar os campos.
3. Impedir códigos duplicados.
4. Salvar a disciplina.

### UC05 — Ofertar turma
Ator: instituição.

Fluxo:
1. Selecionar uma disciplina.
2. Informar professor, dia, turno e horário.
3. Definir a quantidade de vagas.
4. Validar as informações.
5. Salvar a oferta.

## 5. Regras de negócio

- Cada disciplina possui código único.
- Uma turma deve estar associada a uma disciplina existente.
- Uma turma possui professor, dia, turno, horário e capacidade.
- O código de horário segue dia × 10 + turno.
- A quantidade de vagas não pode ser menor que um.
- Um aluno não pode se matricular duas vezes na mesma turma.
- Uma turma lotada não aceita novas matrículas.
- O aluno não pode ter matrículas com horários sobrepostos.
- O sistema impede a exclusão de turmas com matrículas.
- O sistema impede a exclusão de disciplinas com turmas vinculadas.

## 6. Tecnologias

- HTML5: estrutura.
- CSS3: apresentação visual.
- JavaScript: lógica e validações.
- Bootstrap 5: componentes e responsividade.
- LocalStorage: persistência local.

## 7. Testes previstos

- Consultar ofertas.
- Filtrar por dia e turno.
- Matricular-se em uma turma disponível.
- Tentar matrícula duplicada.
- Tentar matrícula em turma lotada.
- Verificar conflito de horário.
- Cancelar uma matrícula.
- Cadastrar disciplina com código novo.
- Tentar cadastrar código duplicado.
- Criar oferta com dados válidos.
- Tentar excluir turma com matrícula.
- Atualizar o navegador e verificar os dados salvos.

## 8. Limitações e melhorias futuras

A versão atual é demonstrativa e não possui servidor,
autenticação ou banco de dados compartilhado.

Possíveis evoluções:
- Integração com API.
- Banco de dados remoto.
- Perfis de acesso.
- Controle de pré-requisitos.
- Relatórios acadêmicos.
- Balanceamento de carga horária dos professores.
