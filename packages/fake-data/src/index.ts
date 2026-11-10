import { Faker, pt_PT } from '@faker-js/faker';

export interface FakeDataGenerator {
  nomePessoa(): string;
  dataNascimento(): Date;
}

/**
 * FakeDataGenerator de dados fictícios (nunca reais) para seeds, testes e demonstrações.
 * Cada gerador tem a sua própria instância do faker: a mesma semente dá sempre os mesmos dados.
 */
/** Data de referência fixa, para as datas geradas dependerem só da semente e não do relógio. */
const referenceDate = new Date('2026-01-01T00:00:00Z');

export function createFakeDataGenerator(seed: number): FakeDataGenerator {
  const faker = new Faker({ locale: [pt_PT] });
  faker.seed(seed);
  return {
    nomePessoa: () => faker.person.fullName(),
    // Pessoas idosas (65 a 95 anos em 2026), o público das respostas sociais.
    dataNascimento: () =>
      faker.date.birthdate({ mode: 'age', min: 65, max: 95, refDate: referenceDate }),
  };
}
