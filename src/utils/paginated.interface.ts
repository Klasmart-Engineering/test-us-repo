import { getRepository } from 'typeorm'
import { User } from '../entities/user'
import { Context } from '../main'
import { UserPermissions } from '../permissions/userPermissions'

const START_KEY = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
const END_KEY = '00000000-0000-0000-0000-000000000000'

interface stringable {
    toString(): string
}
export class CursorObject {
    id: string
    timeStamp?: number
    total?: number
    constructor(id: string, total?: number, stamp?: number) {
        this.id = id || END_KEY
        this.timeStamp = stamp
        this.total = total
    }
}

export const toCursorHash = (co: CursorObject): string => {
    const s = JSON.stringify(co)
    return Buffer.from(s).toString('base64')
}

export function fromCursorHash(s: string): CursorObject {
    const json = Buffer.from(s, 'base64').toString('ascii')
    return JSON.parse(json) as CursorObject
}

export const START_CURSOR = toCursorHash(new CursorObject(START_KEY))

export const END_CURSOR = toCursorHash(new CursorObject(END_KEY))

const totalRefresh = 5

export function staleCursorTotal(c: CursorObject): boolean {
    return (
        c.timeStamp === undefined ||
        Date.now() - c.timeStamp < totalRefresh ||
        c.total === undefined ||
        c.total === 0
    )
}
export interface Paginatable<T, K> {
    [x: string]: any
    compare(rhs: T): number
    compareKey(rhs: K): number
    generateCursor(total?: number, timestamp?: number): string
}
export class Paginated<T extends Paginatable<T, K>, K extends stringable> {
    public total: number
    public edges: Array<T>
    public pageInfo: PageInfo

    constructor(
        total?: number,
        timestamp?: number,
        data?: T[],
        hasNextPage?: boolean,
        hasPreviousPage?: boolean
    ) {
        this.total = total || 0
        this.edges = data || []
        this.pageInfo = {
            hasNextPage: hasNextPage || false,
            hasPreviousPage: hasPreviousPage || false,
            endCursor:
                this.edges.length > 0
                    ? this.edges[this.edges.length - 1].generateCursor(
                          total,
                          timestamp
                      )
                    : END_CURSOR,
            startCursor:
                this.edges.length > 0
                    ? this.edges[0].generateCursor(total, timestamp)
                    : START_CURSOR,
        }
    }
}

export const DEFAULT_PAGE_SIZE = 100

// Public API
export function paginateData<T extends Paginatable<T, K>, K extends stringable>(
    count: number,
    timestamp: number,
    data: T[],
    isSorted: boolean,
    limit: number,
    before?: K,
    after?: K
): Paginated<T, K> {
    let sortedData = data
    if (!isSorted) {
        sortedData = data.sort((a, b) => a.compare(b))
    }

    let hasMoreDataBefore = false
    let hasMoreDataAfter = false
    if (after) {
        hasMoreDataBefore = after.toString() !== START_KEY
        hasMoreDataAfter = sortedData.length > limit
    } else if (before) {
        hasMoreDataAfter = before.toString() !== END_KEY
        hasMoreDataBefore = sortedData.length > limit
    }

    // Throwing out values that are too big or small
    const restrictedData = applyCursorsToEdges(sortedData, before, after)

    // Restricting the data to the specified page size
    const paginatedData = edgesToReturn(restrictedData, limit, before, after)

    const pageInfo = new Paginated(
        count,
        timestamp,
        paginatedData,
        hasMoreDataAfter,
        hasMoreDataBefore
    )
    return pageInfo
}

// https://relay.dev/graphql/connections.htm#sec-Pagination-algorithm
function applyCursorsToEdges<T extends Paginatable<T, K>, K extends stringable>(
    sortedData: T[],
    before?: K,
    after?: K
): T[] {
    if (after) {
        let i = 0
        for (i; i < sortedData.length; i++) {
            if (sortedData[i].compareKey(after) <= 0) {
                continue
            } else {
                break
            }
        }
        sortedData = sortedData.slice(i)
    }
    if (before) {
        let j = sortedData.length - 1
        for (j; j >= 0; j--) {
            if (sortedData[j].compareKey(before) >= 0) {
                continue
            } else {
                break
            }
        }
        sortedData = sortedData.slice(0, j + 1)
    }
    return sortedData
}

// https://relay.dev/graphql/connections.htm#sec-Pagination-algorithm
function edgesToReturn<T extends Paginatable<T, K>, K extends stringable>(
    sortedData: T[],
    limit: number,
    before?: K,
    after?: K
): T[] {
    if (sortedData.length > limit) {
        if (after) {
            sortedData = sortedData.slice(0, limit)
        } else {
            sortedData = sortedData.slice(-limit)
        }
    }
    return sortedData
}

export class PageInfo {
    hasPreviousPage?: boolean
    hasNextPage?: boolean
    startCursor?: string
    endCursor?: string
}

export class CursorArgs {
    after?: string
    first?: number
    before?: string
    last?: number
    organization_ids?: string[]
}

export interface userQuery {
    (
        receiver: any,
        user: User,
        cursor: CursorObject,
        id: string,
        direction: boolean,
        staleTotal: boolean,
        limit: number,
        ids?: string[]
    ): Promise<Paginated<any, string>>
}

export interface adminQuery {
    (
        receiver: any,
        cursor: CursorObject,
        id: string,
        direction: boolean,
        staleTotal: boolean,
        limit: number,
        ids?: string[]
    ): Promise<Paginated<any, string>>
}

async function paginateAuth(token: any): Promise<User | undefined> {
    if (!token) {
        return undefined
    }
    const user = await getRepository(User).findOne({
        user_id: token.id,
    })
    return user
}

export async function v1_getPaginated(
    receiver: any,
    context: Context,
    aq: adminQuery,
    uq: userQuery,
    empty: any,
    { before, after, first, last, organization_ids }: CursorArgs
) {
    if (!after && !before) {
        if (first !== undefined) {
            after = START_CURSOR
        } else {
            if (last !== undefined) {
                before = END_CURSOR
            }
        }
        if (!after && !before) {
            after = START_CURSOR
        }
    }
    if (!last) last = DEFAULT_PAGE_SIZE
    if (!first) first = DEFAULT_PAGE_SIZE

    const cursor = after
        ? fromCursorHash(after)
        : before
        ? fromCursorHash(before)
        : fromCursorHash(END_CURSOR)

    const id = cursor.id

    const staleTotal = staleCursorTotal(cursor)
    const user = await paginateAuth(context.token)

    if (user == undefined) {
        return empty
    }
    const userPermissions = new UserPermissions(context.token)
    try {
        if (userPermissions.isAdmin) {
            return aq(
                receiver,
                cursor,
                id,
                after ? true : false,
                staleTotal,
                after ? first : last,
                organization_ids
            )
        }
        return uq(
            receiver,
            user,
            cursor,
            id,
            after ? true : false,
            staleTotal,
            after ? first : last,
            organization_ids
        )
    } catch (e) {
        console.error(e)
    }
}
