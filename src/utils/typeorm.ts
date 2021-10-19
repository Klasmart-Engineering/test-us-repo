import {
    BaseEntity,
    EntityMetadata,
    getConnection,
    SelectQueryBuilder,
} from 'typeorm'
import { RelationIdLoader } from 'typeorm/query-builder/relation-id/RelationIdLoader'
import { RelationCountLoader } from 'typeorm/query-builder/relation-count/RelationCountLoader'
import { RawSqlResultsToEntityTransformer } from 'typeorm/query-builder/transformer/RawSqlResultsToEntityTransformer'
import { Alias } from 'typeorm/query-builder/Alias'

export function scopeHasJoin<E extends BaseEntity>(
    scope: SelectQueryBuilder<E>,
    joinedEntity: EntityMetadata['target']
): boolean {
    return (
        scope.expressionMap.joinAttributes.find(
            (joinAttribute) => joinAttribute.metadata?.target === joinedEntity
        ) !== undefined
    )
}

export async function convertRawToEntities<Entity = unknown>(
    raw: unknown[],
    queryBuilder: SelectQueryBuilder<Entity>
): Promise<(Entity | undefined)[]> {
    const connection = getConnection()
    const queryRunner = connection.createQueryRunner()
    const relationIdLoader = new RelationIdLoader(
        connection,
        queryRunner,
        queryBuilder.expressionMap.relationIdAttributes
    )
    const relationCountLoader = new RelationCountLoader(
        connection,
        queryRunner,
        queryBuilder.expressionMap.relationCountAttributes
    )
    const rawRelationIdResults = await relationIdLoader.load(raw)
    const rawRelationCountResults = await relationCountLoader.load(raw)

    const transformer = new RawSqlResultsToEntityTransformer(
        queryBuilder.expressionMap,
        connection.driver,
        rawRelationIdResults,
        rawRelationCountResults,
        queryRunner
    )

    // convert one-by-one to avoid de-duplication
    const entities: (Entity | undefined)[] = []
    for (const row of raw) {
        const entity = convertRawToEntity<Entity>(
            row,
            transformer,
            queryBuilder.expressionMap.mainAlias!
        )
        entities.push(entity)
    }

    return entities
}

function convertRawToEntity<Entity = unknown>(
    raw: unknown,
    transformer: RawSqlResultsToEntityTransformer,
    alias: Alias
): Entity | undefined {
    const entities: Entity[] = transformer.transform([raw], alias)
    if (entities.length === 0) {
        return undefined
    }
    return entities[0]
}
