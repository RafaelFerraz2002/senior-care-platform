/** Fonte da hora atual. Injeta-se em vez de chamar `new Date()`, para os testes controlarem o tempo. */
export abstract class Relogio {
  abstract agora(): Date;
}

export class RelogioSistema extends Relogio {
  agora(): Date {
    return new Date();
  }
}

export class RelogioDeTeste extends Relogio {
  private instante: number;

  constructor(inicio: Date) {
    super();
    this.instante = inicio.getTime();
  }

  agora(): Date {
    return new Date(this.instante);
  }

  avancar(ms: number): void {
    this.instante += ms;
  }

  definir(data: Date): void {
    this.instante = data.getTime();
  }
}
