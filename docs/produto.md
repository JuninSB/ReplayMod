# Product scope

Replay Mod records the scene replicated to a Roblox client, sends captures to a local server, and plays them in a desktop or mobile browser. The local workflow needs no public domain or tunnel.

## Fluxos essenciais

| Ação | Origem | Resultado esperado | Falha tratada |
| --- | --- | --- | --- |
| Abrir gravador | `loadstring(game:HttpGet(.../recorder.lua))()` | Painel Roblox aparece | URL inacessível ou executor incompatível é erro real |
| Gravar | Painel Roblox | Cena base e deltas de peças e decals criados, alterados e removidos | Erro de amostragem para captura e mostra mensagem |
| Pausar/retomar | Painel Roblox | Tempo gravado exclui pausa; retomada sincroniza objetos | Estado de preparação impede ação duplicada |
| Enviar | Painel Roblox | Replay persistido e ID confirmado | POST tenta transporte alternativo local; erro mantém gravação |
| Abrir biblioteca | Webview | Lista replays e snapshots reais | Estado vazio e erro de rede são distintos |
| Reproduzir | Player web | Deltas, câmera, timeline e velocidade coerentes | Asset ausente mantém geometria de fallback |

## Expected behavior

1. Server starts on `127.0.0.1:8000`; `/health` and `/recorder.lua` respond.
2. A chunked replay upload appears in `/api/replays` and remains available after restart.
3. Playback retains properties omitted from a delta, applies decal events, supports backward seeking, and changes speed.
4. Primary controls remain usable by touch on compact portrait and landscape screens.
5. Access, invalid-content, and network errors are not shown as success.

## Platform limits

Capture sees only objects replicated to the client. A configured 20 ticks/s is a target, not a guarantee; actual rate depends on the game and executor. Deterministic physics, server scripts, audio, and voxel terrain are outside this representation. Asset delivery respects Roblox permissions; unsupported formats and private assets can remain unavailable.
