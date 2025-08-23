import { faker } from '@faker-js/faker';
import { z, ZodError } from 'zod';
import { DTO } from '.';

describe('BaseDTO', () => {
  const CreateUserSchema = z.object({
    first: z.string().min(2).max(100),
    last: z.string().min(2).max(100),
    email: z.email(),
  });

  class CreateUserDTO extends DTO({ schema: CreateUserSchema }) {
    get fullName() {
      const { first, last } = this.getData();
      return `${first} ${last}`;
    }
  }

  it('will allow creation of a new DTO instance with properties carried over', () => {
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const email = faker.internet.email();

    const dto = new CreateUserDTO({
      first,
      last,
      email,
    });

    expect(dto).toBeInstanceOf(CreateUserDTO);
    expect(CreateUserDTO.getSchema()).toBe(CreateUserSchema);

    const data = dto.getData();

    expect(dto.fullName).toBe(`${first} ${last}`);
    expect(data.first).toBe(first);
    expect(data.last).toBe(last);
    expect(data.email).toBe(email);
  });

  it('will throw a custom error if provided', () => {
    class ExampleDTO extends DTO({
      schema: z.object({
        name: z.string().max(5),
      }),
      transformError: (error) => new Error(`Custom error`),
    }) {}

    const dto = new ExampleDTO({
      name: 'This name is too long',
    });

    expect(() => dto.getData()).toThrow(Error);
    expect(() => dto.getData()).toThrow('Custom error');
  });

  it('will throw if validation errors are detected on data exxtraction', () => {
    const dto = new CreateUserDTO({
      first: 'A',
      last: 'B',
      email: 'invalid-email',
    });

    expect(() => dto.getData()).toThrow(ZodError);
  });

  describe('toSearchParams', () => {
    it('should return the correct URLSearchParams representation of the DTO', () => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = faker.internet.email();

      const dto = new CreateUserDTO({
        first,
        last,
        email,
      });

      const searchParams = dto.toSearchParams();

      expect(searchParams.get('first')).toBe(first);
      expect(searchParams.get('last')).toBe(last);
      expect(searchParams.get('email')).toBe(email);
      expect(searchParams.toString()).toBe(
        `first=${encodeURIComponent(first)}&last=${encodeURIComponent(last)}&email=${encodeURIComponent(email)}`,
      );
    });
  });
});
