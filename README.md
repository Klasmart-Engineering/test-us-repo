| Statements                                                            | Branches                                                            | Functions                                                            | Lines                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| ![Statements](https://img.shields.io/badge/Coverage-68.92%25-red.svg) | ![Branches](https://img.shields.io/badge/Coverage-37.41%25-red.svg) | ![Functions](https://img.shields.io/badge/Coverage-67.04%25-red.svg) | ![Lines](https://img.shields.io/badge/Coverage-71.9%25-red.svg) |

# Setup

-   `docker run -d --name=postgres -p 5432:5432 -e POSTGRES_PASSWORD=kidsloop postgres`

-   `npm i`

-   Create a `.env` file by copying the contents of `.env.example`

# Restart

1. `docker start postgres`
2. `npm start`

# Testing

### Update the README coverage badges:

1. `npm run coverage`
2. `npm run make-badges`

### Running tests unit and integration during development:

Make sure the postgres docker container is running, if you are not using the [docker-compose](<(#docker)>)

```bash
docker container exec -it postgres psql -U postgres -c "create database testdb;"
```

-   `npm run test:unit`
-   `npm run test:integration`
-   `npm test` (to run unit & integration, for now we have to run acceptance separately)

Optionally, install the [Mocha Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter) VSCode extension for a nice UI and more fine-grained control.

### Running tests acceptance during development:

**Make sure you have the [docker-compose running](#docker) first**

-   `npm run test:acceptance`

# Connecting to a locally running frontend

## Prerequisites

### 1 - Your local DB contains a user record for your account on the auth service

-   Launch hub.alpha.kidsloop.net
-   Inspect requests to the user-service to find your auth token
-   Find your user ID and email from the token using jwt.io
-   Add a new user on your local DB with this user ID and email

```shell
docker exec -it postgres psql -U postgres
```

```shell
INSERT INTO "user"(user_id, email) VALUES('<my-user-id>', '<my-email>');
```

### 2 - Your user has been assigned to a organisation

-   Create an organisation on your local DB for your user

```
mutation {
  user(user_id: <my-user-id>) {
    createOrganization(organization_name:"my-org") {
      organization_id
    }
  }
}
```

## Starting local development servers

-   Follow [instructions to set up the frontend on your machine](https://bitbucket.org/calmisland/kidsloop-hub-frontend/src/dev/README.md)
-   Start the backend in local mode: `npm run start:local`
-   Start the frontend: `npm run start`
-   Open the frontend in your browser and login using your credentials from the process above
-   Note: you may need to allow the insecure hosts (frontend and backend) in your browser when launching for the first time

### Docker

You can also run the application with its dependencies through a docker-compose. For this just run:

```bash
docker-compose up
```

Finally, you can list the items in the bucket with the regular client:

```bash
aws s3 ls s3://kidsloop-alpha-account-asset-objects/ --endpoint http://localhost:456
```

# Diagnosing

## Via TypeORM

Enable the `DATABASE_LOGGING` environment variable to enable TypeORM logging, e.g. `DATABASE_LOGGING=true npm start`

## Via Docker

It is also possible to look at the postgres logs from the docker container

(I don't recommend doing this but in extreme situations)

Replace the docker currrent container with another that logs output

1. `docker container stop postgres`
2. `docker system prune -f --volumes`

Then build a container that logs

3. `docker run -d --name=postgres -p 5432:5432 -e POSTGRES_PASSWORD=kidsloop postgres postgres -c log_statement=all`
4. `docker start postgres`
5. `docker container exec -it postgres psql -U postgres -c "create database testdb;"`
6. Open a new terminal window perhaps in a different folder
7. `docker logs -tf postgres 1>postgres.log 2>postgres.err &`
8. `tail -f postgress.err`

A vast amount of postgres sql commands will be in the postgres.err file.

You could just run the test that is causing issues.

Even so you may need to resort to tools like grep and less to find the commands of interest

# How to

## Test CSV upload with Postman

Make a request with below body (`form-data`), please replace `file_path` with your real file path.

```
{
  "operations": "{\"query\":\"mutation UploadAgeRangesFromCSV($file: Upload!) {\n uploadAgeRangesFromCSV(file: $file)\n{filename, mimetype, encoding}}\"}",
  "map": "{\"0\": [\"variables.file\"]}",
  0: "file_path",
}
```

Remember include `Authorization` with JWT token in request's header.

## Create a database migration

The user-service uses [TypeORM migrations](https://github.com/typeorm/typeorm/blob/master/docs/migrations.md) for managing database schema changes. If you need to change the database schema or modify existing data, you can create a new migration:

-   Make the required schema changes
-   Use the TypeORM CLI to create a migration file: `npm run typeorm migration:create -- -n <MigrationName>`
-   Implement the migration logic in the `up` method of the migration file and the rollback logic in the `down` method
-   Start the application and verify that the migration has run as expected

TypeORM can also attempt to automatically generate SQL required for migrations:

-   Run `npm run typeorm migration:generate -- -n <MigrationName>`
-   Check the generated SQL _very_ carefully and make any required changes
-   Note that only schema changes are generated - any changes to existing data will require manual migration

### Testing database migrations

The migration will only ever run once, so if you need to rerun it during development, you need to:

-   Restore the database to it's original state
-   Delete the corresponding migration row from the `migrations` Postgres table
-   Rerun the application

# Useful Tools

-   [VSCode](https://code.visualstudio.com/), for a feature rich development environment
-   [Postman](https://www.postman.com/), for testing API requests
-   [Postico](https://eggerapps.at/postico/), for working with Postgres databases on macOS
