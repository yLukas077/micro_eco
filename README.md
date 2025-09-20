# RayLabs E‑commerce Back‑End

A aplicação simula um sistema de e‑commerce simples com fluxo síncrono (REST) e fluxo assíncrono (event‑driven) utilizando Node.js com TypeScript, PostgreSQL, RabbitMQ e Docker Compose.

## Visão Geral

O sistema foi dividido em quatro componentes principais executados como serviços independentes no Docker Compose:

1. **API** – expõe endpoints REST para cadastro de clientes, produtos e criação/consulta de pedidos. O status dos pedidos reflete o processamento assíncrono realizado pelos outros serviços. Autenticação é realizada via JWT com papéis de cliente e administrador.
2. **Serviço de pagamento** – consumidor de eventos que simula o processamento de pagamento. Ao receber um `ORDER_CREATED` publica um novo evento indicando sucesso (`PAYMENT_CONFIRMED`) ou falha (`PAYMENT_FAILED`).
3. **Serviço de estoque** – consumidor de eventos que atualiza o estoque e o status do pedido. Ao receber um `PAYMENT_CONFIRMED` valida estoque com bloqueio pessimista para evitar condições de corrida; se houver estoque suficiente deduz e confirma o pedido, caso contrário cancela. Ao receber `PAYMENT_FAILED` marca o pedido como pagamento falhou.
4. **Serviço de outbox** – garante confiabilidade na publicação de eventos. Sempre que um pedido é criado, um registro é inserido na tabela `outbox_event` na mesma transação. O serviço de outbox busca periodicamente registros não processados e publica na exchange RabbitMQ, marcando‑os como processados ou incrementando a contagem de tentativas. Foi implementado um limite de tentativas para evitar loops infinitos. Caso uma mensagem não possa ser publicada após várias tentativas, ela permanece na tabela para análise.

O barramento de mensagens é realizado via RabbitMQ utilizando um *exchange* do tipo **topic** chamado `events`. As mensagens são roteadas de acordo com a chave de roteamento (`eventType`), permitindo que diferentes serviços consumam apenas os eventos de interesse.


## Arquitetura

```
┌──────────────┐        REST          ┌──────────────┐
│    Cliente   │ ───────────────────► │      API     │
└──────────────┘                      └──────────────┘
                                           │
                     INSERT OUTBOX EVENT   │
                                           ▼
                                 ┌─────────────────┐
                                 │ Outbox (tabela) │
                                 └─────────────────┘
                                           │
                              Service Outbox publica
                              na exchange RabbitMQ
                                           ▼
                               ┌────────────────────┐
                               │    RabbitMQ        │
                               └────────────────────┘
                                 ▲             ▲
                      Consume    │             │   Consume
                                 │             │
           ┌─────────────────┐   │             │   ┌───────────────────┐
           │ Serviço Pagto   │◄──┘             └──►│ Serviço de Estoque │
           └─────────────────┘                     └───────────────────┘
```

## Como executar

1. Instale o Docker e o Docker Compose em sua máquina.
2. Clone este repositório e navegue até o diretório `backend`.
3. Copie o arquivo `.env.example` para `.env` e ajuste as variáveis de acordo com sua necessidade (opcional – os valores padrão já funcionam com o `docker-compose`).
4. No terminal, execute:

```bash
docker-compose up --build
```

5. Aguarde enquanto os contêineres são iniciados. A API estará disponível em `http://localhost:3000`. A documentação Swagger pode ser acessada em `http://localhost:3000/docs`.
6. Para encerrar os serviços, pressione `Ctrl+C` e depois execute `docker-compose down`.

## Considerações de Design e Trade‑offs

* **Separação de responsabilidades:** a API é responsável apenas pelo fluxo síncrono e inserção de eventos na outbox; os serviços de pagamento e estoque lidam com processamento assíncrono. Isso facilita escalabilidade independente.
* **Pub/Sub:** RabbitMQ foi escolhido pela facilidade de configuração e suporte nativo a DLQ. As chaves de roteamento são os próprios nomes de evento, simplificando o binding.
* **Consistência eventual:** o padrão outbox garante que os eventos sejam publicados mesmo em caso de falha após a transação de criação de pedido. A eventual consistência entre o status do pedido e o estoque é aceitável no contexto do desafio.
* **Resiliência:** caso os serviços de pagamento ou estoque estejam indisponíveis, as mensagens permanecem na fila até que um consumidor esteja disponível. Falhas no publish do outbox são reprocessadas com limite de tentativas. Foi configurada DLQ para `order_created` para inspeção manual.
* **Escalabilidade:** cada serviço pode ser replicado aumentando o número de consumidores. RabbitMQ garante distribuição das mensagens.
* **Segurança:** autenticação via JWT com hash de senhas usando bcrypt. Permissões diferenciadas entre cliente e administrador são aplicadas via *middleware*.