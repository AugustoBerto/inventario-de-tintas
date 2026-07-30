# Homologação e publicação do MVP

## Checklist técnico

- [ ] `.env` do backend revisado sem valores de desenvolvimento.
- [ ] `JWT_SECRET` igual ao Auth Service.
- [ ] `INVENTORY_SERVICE` configurado no Gateway.
- [ ] PostgreSQL acessível.
- [ ] Backup criado e restauração validada em banco separado.
- [ ] Migrations aplicadas.
- [ ] `npm run check` aprovado.
- [ ] `npm run build` aprovado.
- [ ] Backend iniciado no PM2.
- [ ] Frontend compilado publicado.
- [ ] Health checks respondendo pelo Gateway.
- [ ] Primeiro administrador confirmado.

## Roteiro curto de homologação

1. Entrar, atualizar a página e sair.
2. Cadastrar uma referência mínima e outra completa.
3. Confirmar rejeição de referência duplicada.
4. Pesquisar, combinar filtros e atualizar a página.
5. Endereçar, mover com divergência e remover o endereço.
6. Executar uma ação em lote e conferir itens ignorados.
7. Validar os perfis administrador, operador e visualizador.
8. Alterar configurações e conceder um acesso.
9. Conferir amostras válida, próxima, vencida e sem validade.
10. Conferir a ordem do histórico.
11. Confirmar que exclusão administrativa exige confirmação reforçada.

## Treinamento dos usuários-chave

Duração sugerida: 30 minutos.

- 5 min: login, navegação e perfis.
- 5 min: consulta, filtros e validade.
- 5 min: cadastro e repetição de dados.
- 5 min: gavetas, recomendação e divergência.
- 5 min: ações em lote e confirmações.
- 5 min: configurações, acessos e histórico.

## Registro de aceite

```text
Versão:
Data:
Responsável:
Ambiente:
Fluxos aprovados:
Problemas encontrados:
Ressalvas:
Situação: aprovado / aprovado com ressalvas / reprovado
```

## Pós-publicação

- Monitorar logs do `inventory-api` e do Gateway.
- Confirmar backup agendado.
- Revisar acessos ativos.
- Registrar problemas sem corrigir dados diretamente no banco.
