import type { ReactNode } from "react";
import type { Campo, CampoMultiplaEscolha, CampoOpcaoUnica, ConfigProduto } from "@/produtos/tipos";
import { PRODUTOS } from "@/produtos";
import type { EstadoPedido } from "@/lib/pedido";
import { formatarMedidaParaExibicao } from "@/lib/formatacao";
import { caminhoImagem } from "@/lib/biblioteca";
import { BIBLIOTECA } from "@/lib/biblioteca-dados";
import { DESENHO_INICIAL } from "@/lib/desenho";
import { AreaDesenho } from "./AreaDesenho";

type Props = { estado: EstadoPedido; camadaEdicao?: ReactNode };

function valorExibivelCampo(campo: Campo, valorBruto: string | undefined): string {
  if (!valorBruto) return "—";
  if (campo.tipo === "medida")
    return `${formatarMedidaParaExibicao(valorBruto, campo.casasDecimais ?? 3, campo.casasInteiras ?? 1)} ${campo.unidade}`;
  if (campo.tipo === "multipla-escolha") return valorBruto.split("|").join(", ");
  return valorBruto;
}

function opcoesSelecionadas(campo: CampoOpcaoUnica | CampoMultiplaEscolha, valor: string | undefined): string[] {
  if (!valor) return [];
  return campo.tipo === "multipla-escolha" ? valor.split("|") : [valor];
}

/** Agrupa campos em linhas: campos com o mesmo `linha` ficam lado a lado, os demais ficam sozinhos. */
function agruparPorLinha(campos: Campo[]): Campo[][] {
  const linhas: Campo[][] = [];
  const gruposPorNumero = new Map<number, Campo[]>();
  for (const campo of campos) {
    if (campo.linha === undefined) {
      linhas.push([campo]);
      continue;
    }
    const grupoExistente = gruposPorNumero.get(campo.linha);
    if (grupoExistente) {
      grupoExistente.push(campo);
    } else {
      const novoGrupo = [campo];
      gruposPorNumero.set(campo.linha, novoGrupo);
      linhas.push(novoGrupo);
    }
  }
  return linhas;
}

function CampoEspecificacao({ campo, valor }: { campo: Campo; valor: string | undefined }) {
  if (campo.tipo === "opcao-unica" || campo.tipo === "multipla-escolha") {
    const selecionadas = opcoesSelecionadas(campo, valor);
    if (campo.exibirApenasSelecionadas) {
      return (
        <span>
          {campo.label}:{" "}
          {selecionadas.length > 0 ? (
            <span className="font-bold">{selecionadas.map((opcao) => `☑ ${opcao}`).join("  ")}</span>
          ) : (
            "—"
          )}
        </span>
      );
    }
    return (
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        {!campo.ocultarLabelDocumento && <span className="font-semibold">{campo.label}:</span>}
        {campo.opcoes.map((opcao) => {
          const marcado = selecionadas.includes(opcao);
          return (
            <span key={opcao} className={marcado ? "font-bold" : ""}>
              {marcado ? "☑" : "☐"} {opcao}
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <span>
      {campo.label}: {valorExibivelCampo(campo, valor)}
    </span>
  );
}

// Papel quadriculado só no espaço vazio: com imagem (principalmente as de fundo branco),
// o quadriculado aparecia em volta e deixava um "retângulo branco" solto no desenho.
const ESTILO_GRADE_DESENHO = {
  backgroundImage:
    "linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)",
  backgroundSize: "20px 20px",
};

function textoRegua(
  config: ConfigProduto,
  idCampo: string | undefined,
  especificacoes: Record<string, string>,
  rotulo: string
) {
  if (!idCampo) return null;
  const campo = config.campos.find((c) => c.id === idCampo);
  const valor = campo ? especificacoes[campo.id] : undefined;
  if (!campo || !valor) return null;
  return `${valorExibivelCampo(campo, valor)} ${rotulo}`;
}

export function DocumentoCroqui({ estado, camadaEdicao }: Props) {
  if (!estado.tipo) return null;
  const config = PRODUTOS[estado.tipo];

  const itemBiblioteca = BIBLIOTECA.find((item) => item.id === estado.imagem.bibliotecaId);
  const imagemSrc =
    estado.imagem.origem === "upload"
      ? estado.imagem.uploadDataUrl
      : itemBiblioteca
        ? caminhoImagem(itemBiblioteca)
        : null;

  const textoLargura = textoRegua(
    config,
    config.campoLargura,
    estado.especificacoes,
    config.rotuloCampoLargura ?? "Largura"
  );
  const textoAltura = textoRegua(
    config,
    config.campoAltura,
    estado.especificacoes,
    config.rotuloCampoAltura ?? "Altura"
  );

  return (
    <div className="border-2 border-[#991b1b] bg-[#ffffff] text-[#000000]" data-testid="documento-croqui">
      <div
        data-barra-exportacao="titulo"
        className="flex h-11 w-full items-center bg-[#991b1b] px-4 text-lg leading-none font-bold text-[#ffffff]"
      >
        {config.tituloDocumento}
      </div>

      <div className="grid grid-cols-2 gap-0">
        <div className="flex flex-col border-r border-[#991b1b] p-4 text-sm">
          <div className="mb-3 border border-[#991b1b] p-2">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="whitespace-nowrap">Cliente: {estado.pedido.cliente || "—"}</span>
              <span className="whitespace-nowrap">Nº Pedido: {estado.pedido.numeroPedido || "—"}</span>
              <span className="whitespace-nowrap">Data: {estado.pedido.data || "—"}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="whitespace-nowrap">Vendedor: {estado.pedido.vendedor || "—"}</span>
              <span className="whitespace-nowrap">Loja: {estado.pedido.loja || "—"}</span>
            </div>
          </div>

          <div className="mb-3 border border-[#991b1b] p-2">
            <h2 className="mb-1 font-bold uppercase">Descrição do produto</h2>
            <p className="break-words whitespace-pre-wrap">{estado.pedido.descricao || "—"}</p>
          </div>

          {config.campos.length > 0 && (
            <div className="mb-3 border border-[#991b1b] p-2">
              <h2 className="mb-1 font-bold uppercase">Especificações técnicas</h2>
              {agruparPorLinha(config.campos).map((linha) => (
                <div key={linha.map((campo) => campo.id).join("+")} className="mb-1 flex flex-wrap gap-x-6 gap-y-1">
                  {linha.map((campo) => (
                    <CampoEspecificacao key={campo.id} campo={campo} valor={estado.especificacoes[campo.id]} />
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="mb-3 bg-[#991b1b] p-2 text-center text-[#ffffff]">
            <h3 className="font-bold">AVISO AO CLIENTE</h3>
            <p>*TODAS AS MEDIDAS E CARACTERÍSTICAS DEVERÃO SER DEVIDAMENTE CONFIRMADAS.</p>
            <p>*NÃO SERÃO ACEITAS, TROCA OU ALTERAÇÃO DE PEÇAS ESPECIAIS.</p>
            <p className="underline">*NÃO SERÁ ACEITO CANCELAMENTO, APÓS A APROVAÇÃO DESTE PROJETO.</p>
          </div>

          <p className="mb-3 text-center text-[11px] italic text-[#991b1b]">
            *O prazo de entrega entrará em vigor após o projeto assinado e datado
          </p>
          <div className="mb-3 border border-[#991b1b] p-2 text-center font-bold text-[#991b1b]">
            PRAZO DE CHEGADA DE MERCADORIA EM DEPÓSITO ATÉ {config.prazoEntregaDias} DIAS
          </div>

          <div className="mt-17 mb-3 grid grid-cols-2 gap-4 text-center text-xs">
            <div className="border-t border-[#000000] pt-1">
              ASSINATURA DO CLIENTE
              <div className="mt-6">Data _____/_____/_____</div>
            </div>
            <div className="border-t border-[#000000] pt-1">ASSINATURA DO GERENTE</div>
          </div>

          {/* Espaçador flexível: fixa o logo/selo na base da coluna, alinhado
              com o final da página (mesmo truque usado na coluna do desenho). */}
          <div className="flex-1" />

          <div className="flex items-center justify-between gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/marca/logo-madel.png" alt="Madel" className="h-16 w-auto object-contain" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marca/selo-qualidade.png"
              alt="Selo de qualidade Madel - Sob Medida - Peça Exclusiva"
              className="h-48 w-auto object-contain"
            />
          </div>
        </div>

        <div className="flex flex-col p-4">
          <div
            data-barra-exportacao="desenho"
            className="mb-2 flex h-7 w-full items-center justify-center bg-[#991b1b] text-sm leading-none font-bold text-[#ffffff]"
          >
            DESENHO DA PEÇA ESPECIAL
          </div>
          {/* Cresce para preencher o espaço até o box de compras. A imagem em si
              já tem um teto fixo em px (max-h-[560px] mais abaixo), então essa
              caixa pode esticar livremente sem risco de a foto virar gigante —
              limitar a caixa aqui só deixava sobrando espaço em branco abaixo
              dela quando havia mais altura disponível que o teto permitia. */}
          <div className="flex">
            {/* O quadro editável É a moldura (proporção fixa, sem margem interna): dá para posicionar
                itens em qualquer ponto dela, inclusive sob as réguas, que são desenhadas por cima. */}
            <div className="flex flex-1 flex-col border border-[#9ca3af]" style={imagemSrc ? undefined : ESTILO_GRADE_DESENHO}>
              <AreaDesenho
                imagemSrc={imagemSrc}
                desenho={estado.desenho ?? DESENHO_INICIAL}
                textoLargura={textoLargura}
                textoAltura={textoAltura}
                camadaEdicao={camadaEdicao}
              />
            </div>
          </div>

          {/* Se a coluna da esquerda for mais alta, a folga fica aqui e o box de compras segue no rodapé. */}
          <div className="flex-1" />

          {estado.pedido.notaAdicional && (
            <p className="mt-2 border border-[#d1d5db] p-2 text-sm break-words whitespace-pre-wrap">
              {estado.pedido.notaAdicional}
            </p>
          )}

          <p className="mt-2 text-center text-[10px] text-[#6b7280]">
            OBS: TODOS OS DESENHOS A MEDIDA DEVERÁ SER EXTERNA
            <br />E O LADO DE ABERTURA SEMPRE OLHANDO DE FORA PARA DENTRO
          </p>

          <div className="mt-2 border border-[#991b1b]">
            <div
              data-barra-exportacao="compras"
              className="flex h-6 w-full items-center justify-center bg-[#991b1b] text-xs leading-none font-bold text-[#ffffff]"
            >
              USO INTERNO PARA COMPRAS
            </div>
            <div className="p-2">
              <p>Fornecedor: {estado.compra.fornecedor || "_______________"}</p>
              <div className="mt-1 flex items-center justify-between gap-4">
                <span>{estado.compra.tabelaMadel ? "☑" : "☐"} Tabela Madel</span>
                <span>Cotação Custo: {estado.compra.custo || "_______________"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
