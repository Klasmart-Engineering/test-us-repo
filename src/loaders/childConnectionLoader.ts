import { BaseEntity, getManager, SelectQueryBuilder } from 'typeorm'
import { filterHasProperty } from '../utils/pagination/filtering'
import {
    getPageInfoAndEdges,
    getPaginationQuery,
    IChildPaginationArgs,
    IPaginatedResponse,
    IPaginationArgs,
} from '../utils/pagination/paginate'
import { ISortingConfig } from '../utils/pagination/sorting'
import { convertRawToEntities } from '../utils/typeorm'

export interface IChildConnectionDataloaderKey<
    SourceEntity extends BaseEntity
> {
    readonly parent: {
        id: string
        filterKey: string
        pivot: string
    }
    readonly args: IChildPaginationArgs<SourceEntity>
    readonly includeTotalCount: boolean
}

export const childConnectionLoader = async <Entity extends BaseEntity, Node>(
    items: readonly IChildConnectionDataloaderKey<Entity>[],
    connectionQuery: (
        args: IPaginationArgs<Entity>
    ) => Promise<SelectQueryBuilder<Entity>>,
    entityToNodeMapFunction: (source: Entity) => Node | Promise<Node>,
    sort: ISortingConfig
): Promise<IPaginatedResponse<Node>[]> => {
    if (items.length === 0) {
        return []
    }
    // extract query info that was added to each Dataloader key
    const parentIds = items.map((i) => i.parent.id)

    const args = items[0]?.args as IChildPaginationArgs<Entity>
    const parent = items[0]?.parent
    const includeTotalCount = items[0]?.includeTotalCount
    const groupByProperty = parent.pivot

    // not allowed to filter by the parent entity
    if (args.filter && filterHasProperty(parent.filterKey, args.filter)) {
        throw new Error(
            `Cannot filter by parent ID ${parent.filterKey} in a child connection.`
        )
    }

    // Create the Dataloader map of parentId: childConnectionNode[]
    const parentMap = new Map<string, IPaginatedResponse<Node>>(
        parentIds.map((parentId) => [
            parentId,
            {
                totalCount: 0,
                pageInfo: {
                    hasPreviousPage: true,
                    hasNextPage: true,
                    startCursor: '',
                    endCursor: '',
                },
                edges: [],
            },
        ])
    )

    // Create the base scope with necessary joins, filters, and selects
    // Sorting and pagination is done separately in the paginationScope
    const baseScope = await connectionQuery({
        direction: args.direction || 'FORWARD',
        directionArgs: {
            cursor: args.cursor,
        },
        scope: args.scope,
        filter: {
            [parent.filterKey]: {
                operator: 'in',
                value: parentIds as string[],
            },
            ...args.filter,
        },
    })

    //
    // Get the total counts per parent and update the dataloader map
    //
    if (includeTotalCount) {
        // select the parentId to group by
        baseScope.addSelect(`${groupByProperty} as "parentId"`)

        // Create the query to get total children counts per parent (ignores pagination filters etc)
        const countScope = getManager()
            .createQueryBuilder()
            .select(['"parentId"', 'count(*)'])
            .from(`(${baseScope.getQuery()})`, 'subquery')
            .groupBy('"parentId"')
            .setParameters(baseScope.getParameters())

        // Get the counts and update the dataloader map
        const parentCounts: {
            parentId: string
            count: string
        }[] = await countScope.getRawMany()
        for (const parentCount of parentCounts) {
            parentMap.set(parentCount.parentId, {
                totalCount: parseInt(parentCount.count),
                pageInfo: {
                    hasPreviousPage: true,
                    hasNextPage: true,
                    startCursor: '',
                    endCursor: '',
                },
                edges: [],
            })
        }
    }

    //
    // Get the children per parent and update the dataloader map
    //

    // apply pagination where clause and order by statements to the scope
    const {
        scope: paginationScope,
        pageSize,
        primaryColumns,
        cursorData,
    } = await getPaginationQuery({
        direction: args.direction || 'FORWARD',
        directionArgs: {
            count: args.count,
            cursor: args.cursor,
        },
        scope: baseScope.clone(),
        sort: {
            ...sort,
            sort: args.sort,
        },
        includeTotalCount: false,
    })
    // get one more item to determine if there is another page
    const seekPageSize = pageSize + 1

    // Select the parentId for grouping children
    paginationScope.addSelect(`${groupByProperty} as "parentId"`)

    // Select the row number to select n children per parent, respecting the requested order
    const filterQuery = paginationScope.getQuery()
    const orderBy = filterQuery.slice(filterQuery.indexOf('ORDER BY')) // TODO this better...
    paginationScope.addSelect(
        `ROW_NUMBER() OVER (PARTITION BY ${groupByProperty} ${orderBy})`,
        'row_num'
    )

    // Create the query for getting n children per parents
    const childScope = getManager()
        .createQueryBuilder()
        .select('*')
        .from(`(${paginationScope.getQuery()})`, 'subquery')
        .where(`"row_num" <= ${seekPageSize}`)
        .setParameters(paginationScope.getParameters())

    const childrenRaw = await childScope.getRawMany()

    const childParentIds = childrenRaw.map((c) => c.parentId)
    const entities = await convertRawToEntities(childrenRaw, baseScope)

    // group by parentId by create a map of parentId:rawChildSqlRow
    const parentToChildMap = new Map<string, Entity[]>(
        parentIds.map((id) => [id, []])
    )

    childParentIds.forEach((parentId, index) => {
        const child = entities[index]
        const children = parentToChildMap.get(parentId)
        children?.push(child)
        parentToChildMap.set(parentId, children || [])
    })

    // for each parent, calculate their edges and page info
    for (const [parentId, children] of parentToChildMap) {
        const { pageInfo, edges } = getPageInfoAndEdges<Entity>(
            children,
            pageSize,
            sort.primaryKey,
            primaryColumns,
            parentMap.get(parentId)?.totalCount || 0,
            cursorData,
            args.direction
        )

        const parentResult = parentMap.get(parentId)
        if (parentResult) {
            for (const edge of edges) {
                const processedEdge = {
                    cursor: edge.cursor,
                    node: await entityToNodeMapFunction(edge.node),
                }
                parentResult.edges.push(processedEdge)
            }
            parentResult.pageInfo = pageInfo
        }
    }

    return Array.from(parentMap.values())
}
