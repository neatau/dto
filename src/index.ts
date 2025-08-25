import cloneDeep from 'clone-deep';
import { createHash, randomUUID } from 'crypto';
import deepEqual from 'deep-equal';
import stableStringify from 'json-stable-stringify';
import { z, ZodError, ZodType } from 'zod';

export type DTOData<T extends ZodType> = Readonly<z.infer<T>>;

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
   * @param unsafeData The raw input data that failed validation.
   */
  readonly transformError?: (
    error: ZodError,
    unsafeData: DTOData<T>,
  ) => unknown;
};

export interface DTOInterface<T extends ZodType> {
  /**
   * Unique identifier assigned to the DTO at creation.
   */
  readonly id: string;

  /**
   * The creation date of the DTO.
   */
  readonly createdAt: Date;

  /**
   * Parses and returns the data of the DTO instance. Throws a `ZodError` if the
   * data provided does not validate against the configured schema, or your own
   * custom error if a `transformError` function was provided when creating the
   * DTO class.
   *
   * Caches the parsed data for repeat access.
   */
  getData(): DTOData<T>;

  /**
   * Returns the raw input data of the DTO instance without parsing, skipping
   * validation rules present on the Zod schema.
   */
  getUnsafeData(): DTOData<T>;

  /**
   * Get a single data item from the DTO.
   *
   * @param field The field to retrieve from the DTO data.
   */
  getDataItem(field: keyof DTOData<T>): DTOData<T>[keyof DTOData<T>];

  /**
   * Returns the error encountered during data parsing, if any. Applies the
   * provided `transformError` function if it exists.
   */
  getError(): unknown | null;

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
   * Converts this DTO instance to a string representation for debugging.
   */
  toString(): string;

  /**
   * Perform a deep equality check between the data contained within this DTO
   * and the target DTO of the same type.
   *
   * @param target The target DTO.
   */
  equals(target: DTOInterface<T>): boolean;

  /**
   * Creates a clone of this DTO instance.
   */
  clone(): DTOInterface<T>;

  /**
   * Produce a new DTO instance with the input data merged with the contents of
   * this DTO.
   *
   * @param data The new data to merge with the data from this DTO.
   */
  with(data: Partial<DTOData<T>>): DTOInterface<T>;
}

export type DTOConstructor<T extends ZodType> = {
  new (data: DTOData<T>): DTOInterface<T>;

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
export function DTO<T extends ZodType>(
  options: DTOOptions<T>,
): DTOConstructor<T> {
  // Use WeakMap to store the data since anonymous classes don't allow
  // non-public members. Entries will be garbage collected when the DTO used as
  // the key is no longer referenced.
  const data = new WeakMap<DTOInterface<T>, DTOData<T>>();
  const parsedData = new WeakMap<DTOInterface<T>, DTOData<T>>();

  return class implements DTOInterface<T> {
    static getSchema() {
      return options.schema;
    }

    public readonly id = randomUUID();
    public readonly createdAt = new Date();

    constructor(input: DTOData<T>) {
      data.set(this, input);
    }

    public getData(): DTOData<T> {
      const parsed = parsedData.get(this);

      if (parsed) {
        // Grab from parsed cache directly.
        return parsed;
      }

      try {
        const parsed = options.schema.parse(this.getUnsafeData());
        parsedData.set(this, parsed);

        return parsed;
      } catch (error) {
        if (options.transformError && error instanceof ZodError) {
          throw options.transformError(error, this.getUnsafeData());
        }

        throw error;
      }
    }

    public getUnsafeData(): DTOData<T> {
      const value = data.get(this);

      if (!value) {
        // Shouldn't ever happen, but if WeakMap gives us some dodgy behaviour
        // later then at least we have a stack trace to pinpoint the issue.
        throw new Error(
          `Unable to resolve data for DTO ${this.constructor.name}`,
        );
      }

      return value;
    }

    public getDataItem(field: keyof DTOData<T>): DTOData<T>[keyof DTOData<T>] {
      return this.getData()[field];
    }

    public getError(): unknown | null {
      try {
        options.schema.parse(this.getUnsafeData());
      } catch (error) {
        if (error instanceof ZodError) {
          return options.transformError
            ? options.transformError(error, this.getUnsafeData())
            : error;
        }

        throw error;
      }

      return null;
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

    public clone(): DTOInterface<T> {
      const data = this.getUnsafeData();
      return new (this.constructor as DTOConstructor<T>)(cloneDeep(data));
    }

    public with(data: Partial<DTOData<T>>): DTOInterface<T> {
      return new (this.constructor as DTOConstructor<T>)({
        ...this.getUnsafeData(),
        ...data,
      });
    }

    public toString() {
      return `${this.constructor.name}(${this.id}): ${this.toJSONString()}`;
    }
  };
}
