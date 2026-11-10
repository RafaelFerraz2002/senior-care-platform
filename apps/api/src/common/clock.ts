/** Fonte da hora atual. Injeta-se em vez de chamar `new Date()`, para os testes controlarem o tempo. */
export abstract class Clock {
  abstract now(): Date;
}

export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}

export class TestClock extends Clock {
  private instant: number;

  constructor(start: Date) {
    super();
    this.instant = start.getTime();
  }

  now(): Date {
    return new Date(this.instant);
  }

  advance(ms: number): void {
    this.instant += ms;
  }

  set(date: Date): void {
    this.instant = date.getTime();
  }
}
