# DTO

```sh
$ npm install @neatau/dto
```

TypeScript library that provides a foundation for defining and passing DTOs from
your input layer (e.g. REST controllers, GraphQL resolvers, ...) into your
service layer, built on top of Zod.

Problems solved:

- Clean and feature rich implementation of your DTO layer.
  - Deterministic JSON serialization.
  - Deterministic hashing.
  - Deep equality checks between DTOs.
  - Conversion to other commonly required data structures such as
    `URLSearchParams`.
- Validation and type inference via Zod.

## Examples

### Basic Usage

```typescript
// Defines a new DTO class.
class CreateArticleDTO extends DTO({
  schema: z.object({
    title: z.string().min(3).max(300),
    body: z.string().min(25).max(2500),
    authorId: z.uuid(),
  }),
}) {
  // Other getters or DTO functionality here.
}

// Somewhere in your service layer...
async function createArticle(dto: CreateArticleDTO) {
  const { title, body, authorId } = dto.getData();

  // Store in the database, send to API, whatever.
  await database.save(Article, {
    title,
    body,
    authorId,
  });
}

// Make the call with a DTO instance.
await createArticle(
  new CreateArticleDTO({
    title: 'This is a title',
    body: 'This is the article body',
    authorId: '03da2971-ad92-4332-a757-5605864e7941',
  }),
);
```

### Custom Errors

Provide a `transformError()` callback to transform any `ZodError`s thrown during
interaction with the DTO into your own custom error class.

```typescript
class CustomErrorDTO extends DTO({
  schema: z.object({
    value: z.string().max(10),
  }),
  transformError: (zodError) => new Error('There was an error'),
}) {
  //
}
```

### Functionality Glossary

- `dto.getData()` - Parses and returns the data within the DTO. Throws if the
  data does not validate against the Zod schema for that DTO.
- `dto.getDataItem()` - Returns a single data item by key from the DTO.
- `dto.equals(target)` - Determine whether a DTO is equal to a target DTO using
  deep equality check.
- `dto.toJSONString()` - Convert the data within the DTO to a deterministic JSON
  string using deep sort on the keys.
- `dto.toHash(algo)` - Produce a deterministic hash of the data within the DTO.
- `dto.toSearchParams()` - Produce a `URLSearchParams` of the data within the
  DTO.
