# DTO

[API Documentation](https://neatau.github.io/dto/interfaces/DTOInterface.html)

```sh
$ npm install @neatau/dto
```

TypeScript library that provides a foundation for defining and passing DTOs from
your input layer (e.g. REST controllers, GraphQL resolvers, RabbitMQ messages,
...) into your service layer, built on top of [Zod](https://zod.dev).

Problems solved:

- Clean and feature rich implementation of your DTO layer.
  - Deterministic JSON serialization.
  - Deterministic hashing.
  - Deep equality checks between DTOs.
  - Conversion to other commonly required data structures such as
    `URLSearchParams`.
- Validation and type inference via Zod.

![Diagram](https://raw.githubusercontent.com/neatau/dto/refs/heads/main/docs/dto.png)

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
