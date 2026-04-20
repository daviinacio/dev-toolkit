import {
  generatePeople,
  generatePerson,
} from "../../../../modules/common/lib/person.js";

export type GenerateArgs = {
  count: number;
  pretty: boolean;
};

export async function generate(options: GenerateArgs) {
  const { count, pretty } = options;
  const data = count === 1 ? generatePerson() : generatePeople(count);
  console.log(JSON.stringify(data, null, pretty ? 2 : 0));
}
