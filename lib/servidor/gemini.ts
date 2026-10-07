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
    const status = resposta.status === 429 ? 429 : 502;
    const mensagem =
      resposta.status === 429
        ? "Limite de uso do serviço de imagens atingido. Tente novamente em instantes."
        : "O serviço de geração de imagem retornou um erro.";
    throw new ErroGeracaoImagem(mensagem, status);
  }

  const imagem = extrairImagem(await resposta.json());
  if (!imagem) throw new ErroGeracaoImagem("O serviço não devolveu nenhuma imagem. Tente novamente.", 502);
  return imagem;
}
