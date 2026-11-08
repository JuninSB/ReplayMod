# Contrato HTTP local

Base padrão: `http://127.0.0.1:8000`. Respostas de erro usam `{ "error": "mensagem" }` com 400, 401, 403, 404, 409, 413 ou 500 conforme a causa. O servidor não expõe tokens no script hospedado.

| Método e rota | Uso | Entrada principal | Saída |
| --- | --- | --- | --- |
| `GET /health` | Saúde | nenhuma | `{status:"ok",runtime:"node"}` |
| `GET /recorder.lua` | Script executor | nenhuma | texto Luau |
| `POST /api/auth/local` | Token loopback | `{serverId}` | `{uploadToken}` |
| `POST /api/auth/redeem` | Resgatar código em modo LAN | `{code,serverId}` | `{ticket,expiresInSeconds:90}` |
| `POST /api/auth/exchange` | Trocar ticket por token | `{ticket,serverId}` | `{uploadToken,expiresInSeconds:3600}` |
| `POST /api/replay/chunk` | Envio autenticado | `X-Upload-Token`, `uploadId`, `serverId`, `chunkIndex`, `totalChunks`, `chunkData` | parcial ou `{ok,replayId,replayName}` |
| `GET /api/replay/local-chunk` | Fallback loopback | mesmos campos na query, sem token | parcial ou confirmação |
| `POST /api/replay` | Envio completo | token e replay JSON | `{ok,replayId,replayName}` |
| `GET /api/replays` | Biblioteca | nenhuma | `{replays:[...]}` |
| `GET /api/replay/latest?replayId=...` | Replay | ID opcional | payload persistido |
| `GET /api/servers` e `/api/snapshot/latest` | Snapshots legados | `serverId` opcional | lista/payload |
| `GET /api/asset/texture`, `/api/asset/mesh` | Proxy Roblox | `src` | bytes de asset ou erro |
| `GET /api/material/map` | Mapa local/CDN | `material`, `type` | imagem ou erro |

O proxy de mesh converte FileMesh 1.00, 1.01, 2.00, 3.00, 3.01, 4.00, 4.01, 5.00 e 7.00 (Draco) para OBJ. Nos formatos 3–5 e 7, entrega o primeiro LOD quando ele está indicado. Assets sem acesso público ou em formatos ainda não suportados retornam erro; a textura é uma requisição separada.

`base.lighting` das novas gravações inclui `brightness`, `clockTime`, `ambient`, `outdoorAmbient`, `fogColor`, `fogStart`, `fogEnd`, `exposureCompensation`, `globalShadows`, `sunDirection` e, quando existe, `atmosphere` com cor, decay, density, haze e glare. Gravações antigas sem esses campos usam valores de fallback no player.

`chunkIndex` começa em 0. O upload transmite texto JSON sem compactar novamente. O payload de captura pode trazer `frameBlocks:[{codec:"json"|"lz4",data,originalBytes?}]`; o servidor expande e persiste `frames[]`. Para compatibilidade, `codec:"lz4"` e `originalBytes` também são aceitos no bloco de transporte POST. Blocos de um `uploadId` devem concordar em `serverId` e `totalChunks`; conteúdo repetido diferente gera 409. O payload completo exige `serverId`, `base.parts`, `frames` ordenados por `t` e `durationMs` válido.

Cada frame contém `t` em milissegundos e listas opcionais `a` (peças criadas), `u` (patches de peças existentes), `d` (IDs de peças removidas), `da` (decals criados), `du` (decals atualizados) e `dd` (IDs de decals removidos). Decals têm `id` estável e `partPath` com o ID da peça; `du` pode omitir propriedades sem apagá-las. Os campos de decal são `face`, `texture`, `transparency`, `color3`, `className` e `instancePath`. O patch de peça mantém propriedades omitidas. Para limpar `meshId` ou `textureId`, o gravador envia `""`; para limpar `meshScale`, `meshOffset` ou `surfaceAppearance`, envia `false`. O player interpreta esses valores como ausência do componente.

JSON malformado, JSON de tipo diferente de objeto e `replayId` com codificação de URL inválida retornam 400. O teste de integração também verifica que o replay enviado continua disponível após reiniciar o processo Node.

Peças de cabeça em modelos com `Humanoid` podem incluir `characterName`, mesmo quando `path` é um ID estável como `part_9`. Um patch envia `characterName:""` se a peça deixa de representar a cabeça. O player mantém compatibilidade com caminhos `Workspace/...` antigos.

Snapshots legados com `__transport:"compact-v1"` são expandidos antes de persistir. As rotas de snapshot, thumbnail e cleanup permanecem para compatibilidade com capturas antigas.

Quando a URL pública não contém `127.0.0.1`, o servidor mostra no terminal um código numérico de 20 dígitos válido por 30 minutos e um resgate. O ticket dura 90 segundos, é de uso único e fica vinculado a `serverId` e ao IP; o token de upload dura uma hora com o mesmo vínculo. A API é local e sem contas; na LAN, a leitura de replays continua aberta a quem alcança o servidor. Use somente rede confiável.
