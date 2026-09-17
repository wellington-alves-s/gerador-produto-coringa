import type { Campo } from "@/produtos/tipos";
import { PRODUTOS } from "@/produtos";
import type { EstadoPedido } from "@/lib/pedido";
import { formatarBufferMedida } from "@/lib/formatacao";
import { caminhoImagem } from "@/lib/biblioteca";
import { BIBLIOTECA } from "@/lib/biblioteca-dados";

type Props = { estado: EstadoPedido };

function valorExibivelCampo(campo: Campo, valorBruto: string | undefined): string {
  if (!valorBruto) return "—";
  if (campo.tipo === "medida") return `${formatarBufferMedida(valorBruto)} ${campo.unidade}`;
  if (campo.tipo === "multipla-escolha") return valorBruto.split("|").join(", ");
  return valorBruto;
}

export function DocumentoCroqui({ estado }: Props) {
  if (!estado.tipo) return null;
  const config = PRODUTOS[estado.tipo];

  const itemBiblioteca = BIBLIOTECA.find((item) => item.id === estado.imagem.bibliotecaId);
  const imagemSrc =
    estado.imagem.origem === "upload"
      ? estado.imagem.uploadDataUrl
      : itemBiblioteca
        ? caminhoImagem(itemBiblioteca)
        : null;

  return (
    <div className="border-2 border-red-800 bg-white text-black" data-testid="documento-croqui">
      <div className="bg-red-800 px-4 py-2 text-lg font-bold text-white">{config.tituloDocumento}</div>

      <div className="grid grid-cols-2 gap-0">
        <div className="border-r border-red-800 p-4 text-sm">
          <div className="mb-3 border border-red-800 p-2">
            <p>Cliente: {estado.pedido.cliente || "—"}</p>
            <p>
              Nº Pedido: {estado.pedido.numeroPedido || "—"} · Data: {estado.pedido.data || "—"} · Vendedor:{" "}
              {estado.pedido.vendedor || "—"} · Loja: {estado.pedido.loja || "—"}
            </p>
          </div>

          <div className="mb-3 border border-red-800 p-2">
            <h2 className="mb-1 font-bold uppercase">Descrição do produto</h2>
            <p>{estado.pedido.descricao || "—"}</p>
          </div>

          {config.campos.length > 0 && (
            <div className="mb-3 border border-red-800 p-2">
              <h2 className="mb-1 font-bold uppercase">Especificações técnicas</h2>
              {config.campos.map((campo) => (
                <p key={campo.id}>
                  {campo.label}: {valorExibivelCampo(campo, estado.especificacoes[campo.id])}
                </p>
              ))}
            </div>
          )}

          <div className="mb-3 bg-red-800 p-2 text-center text-white">
            <h3 className="font-bold">AVISO AO CLIENTE</h3>
            <p>*TODAS AS MEDIDAS E CARACTERÍSTICAS DEVERÃO SER DEVIDAMENTE CONFIRMADAS.</p>
            <p>*NÃO SERÃO ACEITAS, TROCA OU ALTERAÇÃO DE PEÇAS ESPECIAIS.</p>
            <p>*NÃO SERÁ ACEITO CANCELAMENTO, APÓS A APROVAÇÃO DESTE PROJETO.</p>
          </div>

          <div className="mb-3 border border-red-800 p-2 text-center font-bold text-red-800">
            PRAZO DE CHEGADA DE MERCADORIA EM DEPÓSITO ATÉ {config.prazoEntregaDias} DIAS
          </div>

          <div className="mb-3 grid grid-cols-2 gap-4 text-center text-xs">
            <div className="border-t border-black pt-1">ASSINATURA DO CLIENTE</div>
            <div className="border-t border-black pt-1">ASSINATURA DO GERENTE</div>
          </div>

          <div className="border border-red-800 p-2">
            <p>Fornecedor: {estado.compra.fornecedor || "_______________"}</p>
            <p>Custo: {estado.compra.custo || "_______________"}</p>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-2 bg-red-800 p-1 text-center text-sm font-bold text-white">
            DESENHO DA PEÇA ESPECIAL
          </div>
          <div className="flex min-h-[300px] items-center justify-center border border-gray-400 p-6">
            {imagemSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagemSrc} alt="Desenho do produto" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-gray-400">Sem imagem</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
