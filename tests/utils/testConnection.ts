import { createConnection } from 'typeorm'

export const createTestConnection = (
    drop: boolean = false,
    name: string = 'default'
) => {
    return createConnection({
        name: name,
        type: 'postgres',
        synchronize: drop,
        dropSchema: drop,
        entities: ['src/entities/*.ts'],
        replication: {
            master: {
                url:
                    process.env.DATABASE_URL ||
                    'postgres://postgres:kidsloop@localhost/testdb',
            },
            slaves: process.env.RO_DATABASE_URL
                ? [
                      {
                          url: process.env.RO_DATABASE_URL,
                      },
                  ]
                : [],
        },
    })
}
