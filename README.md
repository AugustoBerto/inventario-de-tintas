# DASS Inventory — MVP

Aplicação de inventário de amostras e padrões de cor.

## Pré-requisitos

- Node.js 20 ou superior
- PostgreSQL
- DASS API Gateway em `http://localhost:2399`
- DASS Auth Service acessível pelo gateway

## Configuração

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run migration:run
npm run dev
```

No ambiente local deste workspace, o backend pode carregar `JWT_SECRET` e a senha
do PostgreSQL diretamente do `.env` do `dass_auth_service` por meio de
`AUTH_ENV_FILE`. Em outros ambientes, informe as variáveis explicitamente.

## Endereços locais

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3050`
- Gateway: `http://localhost:2399`
- API pelo gateway: `http://localhost:2399/api/inventory`

## Verificação

```bash
npm run typecheck
npm test
npm run build
```

## Operação

```bash
# Aplicar migrations pendentes
npm run migration:run

# Gerar backup
npm run db:backup -- /tmp/inventory.dump

# Restaurar em um banco novo para validação
npm run db:restore -- /tmp/inventory.dump inventory_restore_check

# Executar o backend compilado com reinício automático
npm run build
pm2 start ecosystem.config.cjs
```

A restauração sobre o banco ativo é bloqueada pelo script.

## Documentação

- [Homologação e publicação](docs/HOMOLOGACAO_MVP.md)
