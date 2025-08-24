import { createHash } from 'crypto';
import deepEqual from 'deep-equal';
import stableStringify from 'json-stable-stringify';
import { z, ZodError, ZodObject, ZodType } from 'zod';

export type DTOOptions<T extends ZodType> = {
  /**
   * The Zod schema used to validate the data within the DTO and provide the
   * shape of the data e.g. via `getData()`.
   */
  readonly schema: T;

  /**
   * Transforms an error caught while validating the DTO data into a new error
   * instance. Useful if you want to customize the error handling for your
   * DTOs e.g. by providing your own `ValidationError` type.
   *
   * @param error The original `ZodError` instance.
   */
  readonly transformError?: (error: ZodError) => unknown;
};

export type DTOInterface<T extends ZodType> = {
  /**
   * Parses and returns the data of the DTO instance. Throws a `ZodError` if the
   * data provided does not validate against the configured schema, or your own
   * custom error if a `transformError` function was provided when creating the
   * DTO class.
   */
  getData(): Readonly<z.infer<T>>;

  /**
   * Get a single data item from the DTO.
   *
   * @param field The field to retrieve from the DTO data.
   */
  getDataItem(field: keyof z.infer<T>): z.infer<T>[keyof z.infer<T>];

  /**
   * Converts the parsed data within the DTO instance to a `URLSearchParams`
   * object suitable for building a URL (e.g. for an API request).
   */
  toSearchParams(): URLSearchParams;

  /**
   * Converts the parsed data within the DTO instance to a JSON string. Creates
   * JSON strings in a deterministic structure by recursively sorting the keys.
   *
   * @param pretty Whether to format the JSON string with indentation.
   */
  toJSONString(pretty?: boolean): string;

  /**
   * Converts the parsed data within the DTO instance to a hash.
   *
   * @param algo The hashing algorithm to use (e.g. 'sha1', 'md5'). Defaults to
   * 'sha1'.
   */
  toHash(algo?: string): string;

  /**
   * Perform a deep equality check between the data contained within this DTO
   * and the target DTO of the same type.
   *
   * @param target The target DTO.
   */
  equals(target: DTOInterface<T>): boolean;
};

export type DTOConstructor<T extends ZodType> = {
  new (data: z.infer<T>): DTOInterface<T>;

  /**
   * Get the Zod schema associated with this DTO definition.
   */
  getSchema(): T;
};

/**
 * Defines an anonymous base DTO class for extension by your own DTO, which
 * accepts and applies an input Zod schema.
 *
 * @example
 *
 * ```typescript
 * class CreateUserDTO extends DTO({
 *   schema: z.object({
 *     first: z.string().min(2).max(100),
 *     last: z.string().min(2).max(100),
 *     email: z.email(),
 *   })
 * }) {
 *   get fullName() {
 *     const { first, last } = this.getData();
 *     return `${first} ${last}`;
 *   }
 * }
 *
 * const dto = new CreateUserDTO({
 *   first: 'John',
 *   last: 'Doe',
 *   email: 'john.doe@example.com',
 * });
 *
 * console.log(dto.getData());
 * console.log(dto.fullName);
 * ```
 */
export function DTO<T extends ZodObject>(
  options: DTOOptions<T>,
): DTOConstructor<T> {
  // Use WeakMap to store the data since anonymous classes don't allow
  // non-public members. Entries will be garbage collected when the DTO used as
  // the key is no longer referenced.
  const data = new WeakMap<DTOInterface<T>, z.infer<T>>();

  return class implements DTOInterface<T> {
    static getSchema() {
      return options.schema;
    }

    constructor(input: z.infer<T>) {
      data.set(this, input);
    }

    public getData(): Readonly<z.infer<T>> {
      try {
        return options.schema.parse(data.get(this)!);
      } catch (error) {
        if (options.transformError && error instanceof ZodError) {
          throw options.transformError(error);
        }

        throw error;
      }
    }

    public getDataItem(field: keyof z.infer<T>): z.infer<T>[keyof z.infer<T>] {
      return this.getData()[field];
    }

    public toSearchParams() {
      const params = new URLSearchParams();

      for (const [key, value] of Object.entries(this.getData())) {
        params.append(key, String(value));
      }

      return params;
    }

    public toJSONString(pretty = false): string {
      return String(
        stableStringify(this.getData(), pretty ? { space: 2 } : undefined),
      );
    }

    public toHash(algo: string = 'sha1'): string {
      return createHash(algo).update(this.toJSONString()).digest('hex');
    }

    public equals(target: DTOInterface<T>): boolean {
      return deepEqual(this.getData(), target.getData());
    }
  };
}
