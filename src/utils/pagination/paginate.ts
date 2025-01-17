import {
    addOrderByClause,
    ISortingConfig,
    ISortField,
    SortOrder,
    isJoinedColumn,
} from './sorting'
import { SelectQueryBuilder, BaseEntity, Brackets } from 'typeorm'
import { IEntityFilter } from './filtering'
import { GraphQLResolveInfo } from 'graphql'
import { findTotalCountInPaginationEndpoints } from '../graphql'

// changing this? update the docs: constraints.md
export const MAX_PAGE_SIZE = 50

export type Direction = 'FORWARD' | 'BACKWARD'

export interface IPaginateData {
    direction: Direction
    directionArgs?: IDirectionArgs
    scope: SelectQueryBuilder<unknown>
    sort: ISortingConfig
    includeTotalCount: boolean
}

export interface IPaginationArgs<Entity extends BaseEntity> {
    direction: Direction
    directionArgs: IDirectionArgs
    scope: SelectQueryBuilder<Entity>
    filter?: IEntityFilter
    sort?: ISortField
}

export interface IChildPaginationArgs {
    direction?: Direction
    count?: number
    cursor?: string
    filter?: IEntityFilter
    sort?: ISortField
}
interface IQueryParams {
    [key: string]: string | number | boolean
}

export interface IEdge<N = unknown> {
    cursor: string
    node: N
}

export interface IPaginatedResponse<T = unknown> {
    totalCount?: number
    pageInfo: {
        startCursor: string
        endCursor: string
        hasNextPage: boolean
        hasPreviousPage: boolean
    }
    edges: IEdge<T>[]
}

export interface IDirectionArgs {
    count?: number
    cursor?: string
}

export const convertDataToCursor = (data: Record<string, unknown>) => {
    return Buffer.from(JSON.stringify(data)).toString('base64')
}

const getDataFromCursor = (cursor: string) => {
    return JSON.parse(Buffer.from(cursor, 'base64').toString())
}

export function shouldIncludeTotalCount(
    info: Pick<GraphQLResolveInfo, 'fieldNodes'>,
    args: IChildPaginationArgs
) {
    return (
        findTotalCountInPaginationEndpoints(info) ||
        isFirstPageBackwards(args.direction || 'FORWARD', args.cursor)
    )
}

// if the first page is requested while paginating backwards, the return
// count will be adjusted to mimick offet pagination
export function isFirstPageBackwards(direction: Direction, cursor?: unknown) {
    return direction === 'BACKWARD' && !cursor
}

export const getEdges = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[],
    defaultColumn: string,
    primaryColumns?: string[]
) => {
    return data.map((d) => {
        const cursorData = {
            [defaultColumn]: d[defaultColumn],
        }

        if (primaryColumns?.length) {
            primaryColumns.forEach((primaryColumn) => {
                // a primaryColumn from a joined entity is written as <table>.<column>
                const [table, column] = primaryColumn.split('.')

                /*
                getting the correct values for the cursorData's properties
                if this one comes a joined entity, is necessary go inside the joined entity to get that property
                */
                const value = isJoinedColumn(primaryColumn)
                    ? d[`__${table.toLowerCase()}__`][column]
                    : d[primaryColumn]

                cursorData[primaryColumn] = value
            })
        }

        return {
            cursor: convertDataToCursor(cursorData),
            node: d,
        }
    })
}

// this is to make the first page going backwards look like offset pagination
// by not fetching the total pageSize
export const adjustPageSize = (
    pageSize: number,
    cursorData: unknown,
    totalCount?: number,
    direction: Direction = 'FORWARD'
) => {
    if (
        !isFirstPageBackwards(direction, cursorData) ||
        totalCount === undefined
    ) {
        return pageSize
    }

    let newPageSize = totalCount % pageSize
    if (newPageSize === 0) {
        newPageSize = pageSize
    }

    return newPageSize
}

export const getPageInfoAndEdges = <T = unknown>(
    data: T[],
    pageSize: number,
    defaultColumn: string,
    primaryColumns: string[],
    cursorData?: unknown,
    totalCount?: number,
    direction: Direction = 'FORWARD'
) => {
    const pageInfo = {
        startCursor: '',
        endCursor: '',
        hasNextPage: false,
        hasPreviousPage: false,
    }

    const adjustedPageSize = adjustPageSize(
        pageSize,
        cursorData,
        totalCount,
        direction
    )

    const seekPageSize = adjustedPageSize + 1

    let edges: IEdge<T>[] = []

    if (direction === 'FORWARD') {
        edges = getEdges(data, defaultColumn, primaryColumns)
        pageInfo.hasPreviousPage = cursorData ? true : false
        pageInfo.hasNextPage = data.length > adjustedPageSize ? true : false

        pageInfo.startCursor = edges.length > 0 ? edges[0].cursor : ''
        pageInfo.endCursor =
            edges.length > 0
                ? edges.length < seekPageSize
                    ? edges[edges.length - 1].cursor
                    : edges[adjustedPageSize - 1].cursor
                : ''
        edges = edges.slice(0, pageSize)
    } else {
        data.reverse()
        edges = getEdges(data, defaultColumn, primaryColumns)

        pageInfo.hasPreviousPage = data.length > adjustedPageSize ? true : false
        pageInfo.hasNextPage = cursorData ? true : false

        edges = edges.length === seekPageSize ? edges.slice(1) : edges

        pageInfo.startCursor = edges.length > 0 ? edges[0].cursor : ''
        pageInfo.endCursor =
            edges.length > 0 ? edges[edges.length - 1].cursor : ''
    }

    return { edges, pageInfo }
}

export const getPaginationQuery = async ({
    direction,
    directionArgs,
    scope,
    sort,
}: IPaginateData) => {
    const pageSize = directionArgs?.count ? directionArgs.count : MAX_PAGE_SIZE

    const cursorData = directionArgs?.cursor
        ? getDataFromCursor(directionArgs.cursor)
        : null

    const { order, primaryColumns, primaryKeyOrder } = addOrderByClause(
        scope,
        direction,
        sort
    )

    if (cursorData) {
        const directionOperator = order === SortOrder.ASC ? '>' : '<'
        if (primaryColumns.length) {
            const pKeydirectionOperator =
                primaryKeyOrder === SortOrder.ASC ? '>' : '<'

            const queryColumns: string[] = []
            const queryValues: string[] = []
            const queryParams: IQueryParams = {}

            primaryColumns.forEach((primaryColumn, index) => {
                const paramName = `primaryColumn${index + 1}`

                /*
                a primaryColumn from a joined entity is written as <table>.<column>,
                if this one comes from a joined entity we have to use it without join scope.alias
                */
                const column = isJoinedColumn(primaryColumn)
                    ? primaryColumn
                    : `${scope.alias}.${primaryColumn}`

                queryColumns.push(column)
                queryValues.push(`:${paramName}`)
                queryParams[paramName] = cursorData[primaryColumn]
            })
            const queryColumnsString = queryColumns.join(', ')
            const queryValuesString = queryValues.join(', ')
            scope.andWhere(
                new Brackets((qa) => {
                    qa.where(
                        `(${queryColumnsString}) ${directionOperator} (${queryValuesString})`,
                        {
                            ...queryParams,
                        }
                    ).orWhere(
                        new Brackets((qb) => {
                            qb.where(
                                `(${queryColumnsString}) = (${queryValuesString})`,
                                {
                                    ...queryParams,
                                }
                            ).andWhere(
                                `${scope.alias}.${sort.primaryKey} ${pKeydirectionOperator} :defaultColumn`,
                                {
                                    defaultColumn: cursorData[sort.primaryKey],
                                }
                            )
                        })
                    )
                })
            )

            scope.offset(0)
        } else {
            scope.andWhere(
                `${scope.alias}.${sort.primaryKey} ${directionOperator} :defaultColumn`,
                {
                    defaultColumn: cursorData[sort.primaryKey],
                }
            )
        }
    }

    return { scope, primaryColumns, pageSize, cursorData }
}

export const paginateData = async <T = unknown>({
    direction,
    directionArgs,
    scope,
    sort,
    includeTotalCount,
}: IPaginateData): Promise<IPaginatedResponse<T>> => {
    const {
        pageSize,
        cursorData,
        primaryColumns,
        scope: paginationScope,
    } = await getPaginationQuery({
        direction,
        directionArgs,
        scope: scope.clone(),
        sort,
        includeTotalCount,
    })

    // conditionally get the totalCount and adjust the
    // page size if paginating backwards
    let adjustedPageSize = pageSize
    let totalCount
    if (
        includeTotalCount ||
        isFirstPageBackwards(direction, directionArgs?.cursor)
    ) {
        totalCount = await scope.getCount()
        adjustedPageSize = adjustPageSize(
            pageSize,
            cursorData,
            totalCount,
            direction
        )
    }

    // finally, let's get some data!
    const seekPageSize = adjustedPageSize + 1
    paginationScope.take(seekPageSize)
    const data = (await paginationScope.getMany()) as T[]

    const { edges, pageInfo } = getPageInfoAndEdges<T>(
        data,
        pageSize,
        sort.primaryKey,
        primaryColumns,
        cursorData,
        totalCount,
        direction
    )

    return {
        totalCount: includeTotalCount ? totalCount : undefined,
        edges,
        pageInfo,
    }
}

export function getEmptyPaginatedResponse<NodeType = unknown>(
    totalCount?: number
): IPaginatedResponse<NodeType> {
    return {
        totalCount,
        edges: [],
        pageInfo: {
            startCursor: '',
            endCursor: '',
            hasNextPage: false,
            hasPreviousPage: false,
        },
    }
}
