# Laboratório de imagens

Bancada para iterar o prompt de geração de imagem (OpenAI, modelo `gpt-image-2.5-sunburst`) até chegar no padrão de croqui desejado. Não faz parte do app: é só para experimentar.

```
prompts/      instruções em texto (v1, v2...). Aceitam {RAZAO}, {PCT_W} e {PCT_H}
descricoes/   o JSON de cada pedido simulado (gerado pelo montador real do app)
referencias/  imagens usadas como referência de estilo (--ref)
saidas/       imagens geradas + o prompt exato de cada uma (.txt)
```

## Rodar

```bash
pip install openai
export OPENAI_API_KEY=...            # PowerShell: $env:OPENAI_API_KEY = "..."

python laboratorio-imagens/gerar.py v5 arco --ref referencias/janela-arco.png
python laboratorio-imagens/gerar.py v3 4f          # sem referência
```

O resultado vai para `saidas/<prompt>-<caso>-<data-hora>.png`. A chave nunca é gravada em arquivo.

## Criar um caso novo ou atualizar as descrições

Edite `gerar-descricoes.ts` e rode `npx tsx laboratorio-imagens/gerar-descricoes.ts` na raiz. As descrições usam `lib/prompt-imagem.ts`, então refletem o que o app enviaria.

## Histórico

As imagens `saidas/historico-*` vieram das primeiras rodadas. `historico-v1..v3` usaram uma descrição anterior (janela de 2 folhas, 1,80 × 1,20 m, ferragem LO); `v4` e `v5` usam as descrições atuais.

| Versão | O que testou |
|---|---|
| v1 | Prompt do app na época (foto de catálogo) |
| v2 | Croqui de linhas técnicas — técnico demais |
| v3 | Foto plana de catálogo, fundo branco, só texto |
| v4 | v3 + imagem de referência de estilo (a preferida até aqui) |
| v5 | v4 + ferragem só no centro + proporção explícita |

**Problema aberto:** o modelo não respeita a proporção largura:altura (pedida 1,45, veio ~1,9). Pedir porcentagem do quadro não resolveu.
