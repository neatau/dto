import { faker } from '@faker-js/faker';
import { createHash } from 'crypto';
import { JwtPayload, verify } from 'jsonwebtoken';
import { z, ZodError } from 'zod';
import { DTO } from '.';

describe('DTO', () => {
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

  it('will allow creation of a new DTO instance', () => {
    const dto = new CreateUserDTO({
      first: faker.person.firstName(),
      last: faker.person.lastName(),
      email: faker.internet.email(),
    });

    expect(dto).toBeInstanceOf(CreateUserDTO);
    expect(CreateUserDTO.getSchema()).toBe(CreateUserSchema);
  });

  describe('getData()', () => {
    it('will return the parsed data', () => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = faker.internet.email();

      const dto = new CreateUserDTO({
        first,
        last,
        email,
      });

      const data = dto.getData();

      expect(dto.fullName).toBe(`${first} ${last}`);
      expect(data.first).toBe(first);
      expect(data.last).toBe(last);
      expect(data.email).toBe(email);
    });

    it('will throw if the data does not validate against the zod schema', () => {
      const dto = new CreateUserDTO({
        first: 'A',
        last: 'B',
        email: 'invalid-email',
      });

      expect(() => dto.getData()).toThrow(ZodError);
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
  });

  describe('getUnsafeData()', () => {
    it('should return the raw data without validation', () => {
      const dto = new CreateUserDTO({
        first: null,
        last: 1345,
        email: 'invalid-email',
      } as any);

      const data = dto.getUnsafeData();

      expect(data).toEqual({
        first: null,
        last: 1345,
        email: 'invalid-email',
      });
    });
  });

  describe('getDataItem()', () => {
    it('should return the correct data item from the DTO', () => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = faker.internet.email();

      const dto = new CreateUserDTO({
        first,
        last,
        email,
      });

      expect(dto.getDataItem('first')).toBe(first);
      expect(dto.getDataItem('last')).toBe(last);
      expect(dto.getDataItem('email')).toBe(email);
    });
  });

  describe('getError()', () => {
    it('should return a ZodError for failed validation', () => {
      const dto = new CreateUserDTO({
        first: 'A',
        last: 'B',
        email: 'invalid-email',
      });

      expect(dto.getError()).toBeInstanceOf(ZodError);
    });

    it('should return a custom error if a transformer is configured', () => {
      class ExampleDTO extends DTO({
        schema: z.object({
          name: z.string().max(5),
        }),
        transformError: (error) => new Error(`Custom error`),
      }) {}

      const dto = new ExampleDTO({
        name: 'This name is too long',
      });

      expect(dto.getError()).toBeInstanceOf(Error);
      expect((dto.getError() as any).message).toBe('Custom error');
    });

    it('should return null if there are no errors', () => {
      const dto = new CreateUserDTO({
        first: faker.person.firstName(),
        last: faker.person.lastName(),
        email: faker.internet.email(),
      });

      expect(dto.getError()).toBeNull();
    });
  });

  describe('toSearchParams()', () => {
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

  describe('toJSONString()', () => {
    it('should return the correct JSON string representation of the DTO', () => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = faker.internet.email();

      const dto = new CreateUserDTO({
        first,
        last,
        email,
      });

      expect(dto.toJSONString()).toBe(
        JSON.stringify({
          email,
          first,
          last,
        }),
      );
    });

    it('should return a pretty-printed JSON string if requested', () => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = faker.internet.email();

      const dto = new CreateUserDTO({
        first,
        last,
        email,
      });

      expect(dto.toJSONString(true)).toBe(
        JSON.stringify(
          {
            email,
            first,
            last,
          },
          null,
          2,
        ),
      );
    });
  });

  describe('toHash()', () => {
    it('should return the correct hash of the DTO data', () => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = faker.internet.email();

      const dto = new CreateUserDTO({
        first,
        last,
        email,
      });

      expect(dto.toHash()).toBe(
        createHash('sha1').update(dto.toJSONString()).digest('hex'),
      );
    });

    it('should return the correct hash using a different algorithm', () => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = faker.internet.email();

      const dto = new CreateUserDTO({
        first,
        last,
        email,
      });

      expect(dto.toHash('md5')).toBe(
        createHash('md5').update(dto.toJSONString()).digest('hex'),
      );
    });

    it('should create the same hash for two DTOs with the same contents', () => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = faker.internet.email();

      const dto1 = new CreateUserDTO({
        first,
        email,
        last,
      });

      const dto2 = new CreateUserDTO({
        email,
        first,
        last,
      });

      expect(dto1.toHash()).toBe(dto2.toHash());

      console.log(String(dto1));
    });
  });

  describe('toJWT()', () => {
    it('will create a JWT from the DTO data', () => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = faker.internet.email();

      const dto = new CreateUserDTO({
        first,
        last,
        email,
      });

      const jwt = dto.toJWT('test', 3600);
      const parsed = verify(jwt, 'test');

      expect(parsed).toEqual({
        email,
        first,
        last,
        iat: expect.any(Number),
        exp: (parsed as JwtPayload).iat! + 3600,
      });
    });
  });

  describe('equals()', () => {
    class CreateArticleDTO extends DTO({
      schema: z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1),
        tags: z.array(z.string()).optional(),
      }),
    }) {}

    it('should correctly compare equality between two DTOs', () => {
      const first = new CreateArticleDTO({
        content: 'Content 1',
        title: 'Title 1',
      });

      const second = new CreateArticleDTO({
        title: 'Title 1',
        content: 'Content 1',
      });

      const third = new CreateArticleDTO({
        title: 'Title 2',
        tags: ['tag3'],
        content: 'Content 2',
      });

      const fourth = new CreateArticleDTO({
        title: 'Title 2',
        content: 'Content 2',
        tags: ['tag3', 'tag4'],
      });

      const fourthAgain = new CreateArticleDTO({
        tags: ['tag3', 'tag4'],
        content: 'Content 2',
        title: 'Title 2',
      });

      const fifth = new CreateArticleDTO({
        title: 'Title 3',
        content: 'Content 3',
      });

      expect(first.equals(second)).toBe(true);
      expect(first.equals(third)).toBe(false);
      expect(first.equals(fourth)).toBe(false);
      expect(first.equals(fifth)).toBe(false);
      expect(fourth.equals(fourthAgain)).toBe(true);
    });
  });

  describe('clone()', () => {
    it('should clone the DTO', () => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = faker.internet.email();

      const dto = new CreateUserDTO({
        first,
        last,
        email,
      });

      const clone = dto.clone();

      expect(clone).toBeInstanceOf(CreateUserDTO);
      expect(clone).not.toBe(dto);
      expect(dto.id).not.toBe(clone.id);
      expect(clone.equals(dto)).toBe(true);
    });
  });

  describe('with()', () => {
    it('will create a new DTO with the merged data', () => {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = faker.internet.email();

      const dto = new CreateUserDTO({
        first,
        last,
        email,
      });

      const newFirst = faker.person.firstName();
      const newLast = faker.person.lastName();

      const newDto = dto.with({
        first: newFirst,
        last: newLast,
      });

      const newEmail = faker.internet.email();

      const newEmailDto = newDto.with({
        email: newEmail,
      });

      expect(newDto).toBeInstanceOf(CreateUserDTO);
      expect(newDto.id).not.toBe(dto.id);
      expect(newDto.getData()).toEqual({
        first: newFirst,
        last: newLast,
        email,
      });
      expect(dto.getData()).toEqual({
        first,
        last,
        email,
      });
      expect(newEmailDto).toBeInstanceOf(CreateUserDTO);
      expect(newEmailDto.id).not.toBe(newDto.id);
      expect(newEmailDto.getData()).toEqual({
        first: newFirst,
        last: newLast,
        email: newEmail,
      });
    });
  });
});
