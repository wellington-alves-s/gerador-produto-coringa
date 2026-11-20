/** Dado inválido vindo do cliente (vira 400/413 nas rotas). */
export class ErroValidacao extends Error {
  constructor(
    mensagem: string,
    readonly status: number = 400
  ) {
    super(mensagem);
  }
}

export class ErroUsuarioExistente extends Error {
  constructor() {
    super("Esse usuário já existe.");
  }
}
