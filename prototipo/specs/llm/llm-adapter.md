# Contrato `ILlmAdapter` (ADR-011)

Contrato del Anti-Corruption Layer para el proveedor del modelo de lenguaje del asistente virtual
(Iteración 6). El `AsistenteService` solo conoce este contrato: cambiar de proveedor o de modelo es
implementar otro adaptador, sin tocar el núcleo (QA-05c). Código: [`backend/src/integration/llm/ILlmAdapter.ts`](../../backend/src/integration/llm/ILlmAdapter.ts).

## Operación

```ts
completar(entrada: EntradaLlm, timeoutMs: number): Promise<RespuestaLlm>
```

Una llamada resuelve **un paso** del turno. El ciclo (LLM → herramientas → LLM) lo maneja el
`AsistenteService`, que también impone el plazo total del turno y el máximo de pasos (ADR-014).

## DTOs neutros

| DTO | Campos |
|---|---|
| `EntradaLlm` | `instrucciones` (rol y reglas, fijas durante el turno), `idioma` (`es`, `en`, `pt`), `mensajes: MensajeLlm[]`, `herramientas: DefinicionHerramientaLlm[]` |
| `MensajeLlm` | `{ rol: "usuario", texto }` · `{ rol: "asistente", texto, llamadas?, datosProveedor? }` · `{ rol: "resultados", resultados: ResultadoLlamada[] }` |
| `DefinicionHerramientaLlm` | `nombre`, `descripcion`, `esquema` (JSON Schema de los argumentos; ver [`../asistente/herramientas.schema.json`](../asistente/herramientas.schema.json)) |
| `LlamadaHerramienta` | `id`, `nombre`, `argumentos` |
| `ResultadoLlamada` | `llamadaId`, `contenido` (JSON del resultado), `esError?` |
| `RespuestaLlm` | `texto` y `llamadas` (si hay llamadas, el turno sigue), `datosProveedor?` |

- `datosProveedor` es **opaco** para el núcleo: el adaptador que lo produjo lo reenvía sin cambios
  dentro del mismo turno (por ejemplo, los bloques de razonamiento del proveedor real). Entre
  turnos el historial viaja solo como texto.
- Lo que entra en `mensajes` y en los resultados de herramientas lo arma el `ContextoLlmBuilder`
  con lista blanca de campos (QA-04f): nunca credenciales, tokens, emails, precios, direcciones ni
  contenidos de correos. Los campos `*_no_confiable` son datos de terceros, no instrucciones.

## Fallas

Toda falla del proveedor se traduce a `LlmNoDisponible(motivo)`, con `motivo` en
`TIMEOUT | ERROR_PROVEEDOR | CIRCUITO_ABIERTO | SATURADO`. El núcleo no conoce errores HTTP ni
del SDK del proveedor. Ante esta falla, el turno termina con `estado: DEGRADADO` y la derivación
directa a la agencia (ADR-014).

## Implementaciones

| Adaptador | Uso |
|---|---|
| `ClaudeAdapter` | Proveedor real (`LLM_PROVEEDOR=claude`, clave en `ANTHROPIC_API_KEY`). Una llamada a la Messages API por paso, herramientas en modo estricto. |
| `MockLlmAdapter` | Por defecto. Llama al LLM simulado del servicio `mocks` (`POST /llm/completar`), con modos normal, lento y caído. |
| `LlmConResiliencia` | Decorador que envuelve a cualquiera de los dos: timeout por llamada, circuit breaker compartido en Redis y bulkhead por nodo (ADR-014). |

Ningún adaptador accede a la base de datos.
