const URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Modelo configurável por ambiente: confirme o nome vigente na documentação do Gemini.
const MODELO_PADRAO = "gemini-2.5-flash-image";

export type ReferenciaImagem = { mimeType: string; base64: string };
export type ImagemGerada = { mimeType: string; base64: string };

export class ErroGeracaoImagem extends Error {
  constructor(
    mensagem: string,
    readonly status: number
  ) {
    super(mensagem);
  }
}

type DetalheErro = { mensagem: string; status?: string };

async function lerDetalheErro(resposta: Response): Promise<DetalheErro> {
  try {
    const corpo = await resposta.json();
    return { mensagem: String(corpo?.error?.message ?? "").slice(0, 600), status: corpo?.error?.status };
  } catch {
    return { mensagem: "" };
  }
}

/** Traduz a resposta de erro do Gemini em uma mensagem útil para quem está usando o app. */
export function classificarErro(statusHttp: number, mensagemOriginal: string): ErroGeracaoImagem {
  const texto = mensagemOriginal.toLowerCase();
  if (statusHttp === 429) {
    const semCota = /limit:\s*0|free.?tier|billing|plan and billing/.test(texto);
    return semCota
      ? new ErroGeracaoImagem(
          "O serviço de imagens está sem cota disponível para esta chave (o plano gratuito pode não incluir geração de imagem). Avise o responsável pelo sistema.",
          429
        )
      : new ErroGeracaoImagem("Muitas gerações em pouco tempo. Aguarde cerca de 1 minuto e tente novamente.", 429);
  }
  if (statusHttp === 404) {
    return new ErroGeracaoImagem("O modelo de imagem configurado não está disponível. Avise o responsável pelo sistema.", 502);
  }
  if (statusHttp === 400 || statusHttp === 401 || statusHttp === 403) {
    return new ErroGeracaoImagem(
      "O serviço de imagens recusou a requisição (chave inválida ou sem permissão). Avise o responsável pelo sistema.",
      502
    );
  }
  return new ErroGeracaoImagem("O serviço de geração de imagem retornou um erro. Tente novamente em instantes.", 502);
}

export function chaveConfigurada(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

type PartesResposta = { inlineData?: { mimeType?: string; data?: string }; text?: string };

export function extrairImagem(resposta: unknown): ImagemGerada | null {
  const candidatos = (resposta as { candidates?: { content?: { parts?: PartesResposta[] } }[] })?.candidates;
  const partes = candidatos?.[0]?.content?.parts ?? [];
  for (const parte of partes) {
    if (parte.inlineData?.data) {
      return { mimeType: parte.inlineData.mimeType ?? "image/png", base64: parte.inlineData.data };
    }
  }
  return null;
}

export async function gerarImagemComGemini(prompt: string, referencia?: ReferenciaImagem): Promise<ImagemGerada> {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new ErroGeracaoImagem("Geração de imagem não configurada neste ambiente.", 503);

  const modelo = process.env.GEMINI_IMAGE_MODEL || MODELO_PADRAO;
  const partes: unknown[] = [{ text: prompt }];
  if (referencia) partes.push({ inlineData: { mimeType: referencia.mimeType, data: referencia.base64 } });

  let resposta: Response;
  try {
    resposta = await fetch(`${URL_BASE}/${modelo}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
      body: JSON.stringify({
        contents: [{ parts: partes }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });
  } catch {
    throw new ErroGeracaoImagem("Não foi possível contatar o serviço de geração de imagem.", 502);
  }

  if (!resposta.ok) {
    const detalhe = await lerDetalheErro(resposta);
    // Só vai para os logs do servidor (Vercel → Logs); a chave nunca aparece aqui nem na URL.
    console.error(`[gerar-imagem] Gemini respondeu ${resposta.status} (modelo ${modelo}):`, detalhe);
    throw classificarErro(resposta.status, detalhe.mensagem);
  }

  const imagem = extrairImagem(await resposta.json());
  if (!imagem) throw new ErroGeracaoImagem("O serviço não devolveu nenhuma imagem. Tente novamente.", 502);
  return imagem;
}
