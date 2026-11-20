"""Laboratório de imagens: gera a imagem de uma esquadria a partir de um prompt + uma descrição e salva em saidas/.

Uso (na raiz do projeto):
    python laboratorio-imagens/gerar.py v5 arco --ref referencias/janela-arco.png

Requer `pip install openai` e a variável de ambiente OPENAI_API_KEY.
"""
import argparse
import base64
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

from openai import OpenAI

AQUI = Path(__file__).parent
MODELO = "gpt-image-2.5-sunburst"


def razao_largura_altura(descricao: str) -> float:
    """Lê "largura ≈ 1,45 vezes a altura" da descrição; sem a frase, a peça é tratada como quadrada."""
    achado = re.search(r"largura ≈ (\d+,\d+) vezes a altura", descricao)
    return float(achado.group(1).replace(",", ".")) if achado else 1.0


def quadro(razao: float) -> tuple[str, int, int]:
    if razao >= 1.15:
        return "1536x1024", 1536, 1024
    if razao <= 0.87:
        return "1024x1536", 1024, 1536
    return "1024x1024", 1024, 1024


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("prompt", help="nome do arquivo em prompts/ (sem .txt), ex.: v5")
    p.add_argument("caso", help="nome do arquivo em descricoes/ (sem .json), ex.: arco")
    p.add_argument("--ref", help="imagem de referência de estilo (caminho relativo a laboratorio-imagens/)")
    p.add_argument("--modelo", default=MODELO)
    args = p.parse_args()

    if not os.environ.get("OPENAI_API_KEY"):
        sys.exit("Defina a variável de ambiente OPENAI_API_KEY antes de rodar.")

    descricao = (AQUI / "descricoes" / f"{args.caso}.json").read_text(encoding="utf-8")
    razao = razao_largura_altura(descricao)
    tamanho, qw, qh = quadro(razao)
    # A peça cabe numa caixa de 80% do quadro, mantendo a razão (usado pelos placeholders do prompt).
    larg = min(0.80 * qw, 0.80 * qh * razao)
    instrucao = (AQUI / "prompts" / f"{args.prompt}.txt").read_text(encoding="utf-8").strip().format(
        RAZAO=f"{razao:.2f}".replace(".", ","),
        PCT_W=round(100 * larg / qw),
        PCT_H=round(100 * larg / razao / qh),
    )
    prompt = f"{instrucao}\n\n{descricao}"

    client = OpenAI()
    inicio = time.time()
    if args.ref:
        with open(AQUI / args.ref, "rb") as ref:
            resultado = client.images.edit(model=args.modelo, image=ref, prompt=prompt, size=tamanho)
    else:
        resultado = client.images.generate(model=args.modelo, prompt=prompt, size=tamanho)

    base = AQUI / "saidas" / f"{args.prompt}-{args.caso}-{datetime.now():%Y%m%d-%H%M%S}"
    base.with_suffix(".png").write_bytes(base64.b64decode(resultado.data[0].b64_json))
    base.with_suffix(".txt").write_text(prompt, encoding="utf-8")  # o prompt exato, para comparar rodadas
    print(f"{base.with_suffix('.png')} ({tamanho}, {time.time() - inicio:.0f}s)")


if __name__ == "__main__":
    main()
