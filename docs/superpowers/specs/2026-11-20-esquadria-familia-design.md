# Esquadrias: escolher a família primeiro e filtrar o formulário

## Intenção
Hoje o formulário de Esquadrias mostra todos os campos e todas as opções de uma vez. O usuário escolhe primeiro a **família** da esquadria e o formulário passa a mostrar só o que é possível para ela. Fonte das famílias: tabela de preços da Madel (PCQ, PCV, PB, PBV, VCQ, VA, JAAV, JCV, JGV, VP, MAX, VB, caixilho fixo, batente fixo, by window).

## Objetivos / não-objetivos
- Objetivo: campo "Tipo de esquadria" com 5 famílias; opções de Tipo de abertura filtradas por família; campos que não se aplicam somem.
- Objetivo: mecanismo genérico na config dos produtos, reaproveitável pelos outros croquis depois.
- Não-objetivo: escolher o "modelo da tabela" (JCV, PBV...), registrar código de preço, filtrar Lado de abertura por abertura.
- Não-objetivo: mudar o `dependeDe` atual nem os outros produtos.

## Famílias e aberturas permitidas
| Família | Aberturas |
|---|---|
| Porta de correr | Correr, Pantográfica, Camarão, Giro |
| Porta balcão | Abrir/Abrir, Correr/Abrir, Giro |
| Janela | Correr, Abrir/Abrir, Correr/Abrir, Guilhotina/Abrir, Pantográfica, By Window, Giro |
| Vitrô | Correr, Abrir/Abrir, Pivotante, Basculante, Max-ar, Giro |
| Fixo | nenhuma (some Abertura, Lado de abertura e Ferragem) |

Categoria (Panorâmico, Semi-panorâmico, Quadriculado, Veneziana) vale para todas as famílias. Palheta só com Veneziana marcada. Vidros só com categoria de vidro marcada.

## Abordagens
1. **Propriedades novas nos campos de `ConfigProduto`** (escolhida): `visivelQuando` e `opcoesPorValor`. Um ponto decide o que é visível; formulário, validação, documento e prompt usam o mesmo.
2. Uma config por família: duplica campos; descartada.
3. Reaproveitar `dependeDe`: ele só torna obrigatório, e mudar o significado quebraria os outros produtos; descartada.

## Decisões
- `visivelQuando: { campoId, valores }`: campo só aparece (e só vale) quando o campo de origem tem um dos valores. Campo oculto não é obrigatório, não vai ao documento nem ao prompt.
- `opcoesPorValor: { campoId, mapa }`: lista de opções do campo depende do valor de outro campo.
- Trocar a família descarta as respostas de campos que ficaram ocultos ou cujo valor deixou de ser permitido.
- Rascunhos antigos sem família: o formulário mostra só a escolha da família até o usuário decidir.
- Minhas escolhas (corrigíveis): palheta "Reta" continua; Lado de abertura não é filtrado por abertura; Fixo mantém Medidas, Madeira, Guarnição e Categoria.
- Prompt da imagem passa a usar a família ("janela de correr") em `tipo_especifico`.

## Fica para quem constrói
Nome das chaves e local da função de visibilidade; ajustes nos testes existentes.
