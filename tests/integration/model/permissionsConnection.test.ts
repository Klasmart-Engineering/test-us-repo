import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Permission } from '../../../src/entities/permission'
import { User } from '../../../src/entities/user'
import { Model } from '../../../src/model'
import {
    permissionsConnectionResolver,
    PERMISSIONS_CONNECTION_COLUMNS,
} from '../../../src/pagination/permissionsConnection'
import { PermissionConnectionNode } from '../../../src/types/graphQL/permission'
import { createServer } from '../../../src/utils/createServer'
import { IEntityFilter } from '../../../src/utils/pagination/filtering'
import { createAdminUser, createUser } from '../../factories/user.factory'
import {
    ApolloServerTestClient,
    createTestClient,
} from '../../utils/createTestClient'
import { getSystemRoleIds } from '../../utils/operations/organizationOps'
import {
    isStringArraySortedAscending,
    isStringArraySortedDescending,
} from '../../utils/sorting'
import {
    createTestConnection,
    TestConnection,
} from '../../utils/testConnection'
import { Organization } from '../../../src/entities/organization'
import { createOrganization } from '../../factories/organization.factory'
import { Role } from '../../../src/entities/role'
import { createOrganizationMembership } from '../../factories/organizationMembership.factory'
import { userToPayload } from '../../utils/operations/userOps'
import { GraphQLResolveInfo } from 'graphql'
import { Context } from '../../../src/main'
import { SelectQueryBuilder } from 'typeorm'
import { UserPermissions } from '../../../src/permissions/userPermissions'
import { createRole } from '../../factories/role.factory'
import { PermissionName } from '../../../src/permissions/permissionNames'
import { nonAdminPermissionScope } from '../../../src/directives/isAdmin'

type PermissionConnectionNodeKey = keyof Pick<
    PermissionConnectionNode,
    'id' | 'name' | 'category' | 'group' | 'level'
>

use(chaiAsPromised)

describe('model', () => {
    let connection: TestConnection
    let testClient: ApolloServerTestClient
    let adminUser: User
    let organizationUser: User
    let noMembershipUser: User
    let organization: Organization
    let permissionsCount = 0
    let roleInvolvedPermissionsCount = 0
    let scope: SelectQueryBuilder<Permission>
    let adminPermissions: UserPermissions
    let memberPermissions: UserPermissions
    let noMemberPermissions: UserPermissions

    const pageSize = 10

    // emulated info object to could test resolver
    let info: GraphQLResolveInfo

    // emulated ctx object to could test resolver
    let ctx: Context

    const expectSorting = async (
        field: PermissionConnectionNodeKey,
        order: 'ASC' | 'DESC'
    ) => {
        const result = await permissionsConnectionResolver(info, ctx, {
            direction: 'FORWARD',
            directionArgs: { count: pageSize },
            scope,
            sort: { field, order },
        })

        expect(result.totalCount).to.eql(permissionsCount)
        expect(result.edges.length).eq(pageSize)

        const values = result.edges.map((edge) => edge.node[field]) as string[]
        const isSorted =
            order === 'ASC'
                ? isStringArraySortedAscending(values)
                : isStringArraySortedDescending(values)

        expect(isSorted).to.be.true
    }

    const buildScopeAndContext = async (permissions: UserPermissions) => {
        if (!permissions.isAdmin) {
            await nonAdminPermissionScope(scope, permissions)
        }

        ctx = ({
            permissions: permissions,
        } as unknown) as Context
    }

    before(async () => {
        connection = await createTestConnection()
        const server = await createServer(new Model(connection))
        testClient = await createTestClient(server)
    })

    after(async () => {
        await connection?.close()
    })

    beforeEach(async () => {
        scope = Permission.createQueryBuilder('Permission')
        adminUser = await createAdminUser().save()
        permissionsCount = await Permission.count()
        roleInvolvedPermissionsCount = await Permission.createQueryBuilder(
            'Permission'
        )
            .select(PERMISSIONS_CONNECTION_COLUMNS)
            .innerJoin('Permission.roles', 'Role')
            .getCount()

        organization = await createOrganization().save()

        const orgAdminRole = await Role.findOneOrFail({
            where: { system_role: true, role_name: 'Organization Admin' },
        })

        organizationUser = await createUser().save()
        noMembershipUser = await createUser().save()

        // adding organizationUser to organization with orgAdminRole
        await createOrganizationMembership({
            user: organizationUser,
            organization,
            roles: [orgAdminRole],
        }).save()

        adminPermissions = new UserPermissions(userToPayload(adminUser))
        memberPermissions = new UserPermissions(userToPayload(organizationUser))
        noMemberPermissions = new UserPermissions(
            userToPayload(noMembershipUser)
        )

        // Emulating graphql objects
        await buildScopeAndContext(adminPermissions)

        info = ({
            fieldNodes: [
                {
                    selectionSet: {
                        selections: [
                            {
                                kind: 'Field',
                                name: {
                                    value: 'totalCount',
                                },
                            },
                        ],
                    },
                },
            ],
        } as unknown) as GraphQLResolveInfo
    })

    context('pagination', () => {
        context('when user is super admin', () => {
            it('returns permissions from all the list', async () => {
                const result = await permissionsConnectionResolver(info, ctx, {
                    direction: 'FORWARD',
                    directionArgs: { count: pageSize },
                    scope,
                })

                expect(result.totalCount).to.eql(permissionsCount)

                expect(result.pageInfo.hasNextPage).to.be.true
                expect(result.pageInfo.hasPreviousPage).to.be.false
                expect(result.pageInfo.startCursor).to.be.string
                expect(result.pageInfo.endCursor).to.be.string

                expect(result.edges.length).eq(10)
            })
        })

        context('when user has organizationMembership', () => {
            beforeEach(async () => {
                await buildScopeAndContext(memberPermissions)
            })

            it('returns just the permissions related to roles', async () => {
                const result = await permissionsConnectionResolver(info, ctx, {
                    direction: 'FORWARD',
                    directionArgs: { count: pageSize },
                    scope,
                })

                expect(result.totalCount).to.eql(roleInvolvedPermissionsCount)

                expect(result.pageInfo.hasNextPage).to.be.true
                expect(result.pageInfo.hasPreviousPage).to.be.false
                expect(result.pageInfo.startCursor).to.be.string
                expect(result.pageInfo.endCursor).to.be.string

                expect(result.edges.length).eq(10)
            })
        })

        context('when user has not any memberships', () => {
            beforeEach(async () => {
                await buildScopeAndContext(noMemberPermissions)
            })

            it('should not have access to any permission', async () => {
                const result = await permissionsConnectionResolver(info, ctx, {
                    direction: 'FORWARD',
                    directionArgs: { count: pageSize },
                    scope,
                })

                expect(result.totalCount).to.eql(0)

                expect(result.pageInfo.hasNextPage).to.be.false
                expect(result.pageInfo.hasPreviousPage).to.be.false
                expect(result.pageInfo.startCursor).to.be.string
                expect(result.pageInfo.endCursor).to.be.string

                expect(result.edges.length).eq(0)
            })
        })
    })

    context('sorting', () => {
        it("returns permissions sorted by 'id' in an ASCENDING order", async () => {
            await expectSorting('id', 'ASC')
        })

        it("returns permissions sorted by 'id' in a DESCENDING order", async () => {
            await expectSorting('id', 'DESC')
        })

        it("returns permissions sorted by 'name' in an ASCENDING order", async () => {
            await expectSorting('name', 'ASC')
        })

        it("returns permissions sorted by 'name' in a DESCENDING order", async () => {
            await expectSorting('name', 'DESC')
        })

        it("returns permissions sorted by 'category' in an ASCENDING order", async () => {
            await expectSorting('category', 'ASC')
        })

        it("returns permissions sorted by 'category' in a DESCENDING order", async () => {
            await expectSorting('category', 'DESC')
        })

        it("returns permissions sorted by 'group' in an ASCENDING order", async () => {
            await expectSorting('group', 'ASC')
        })

        it("returns permissions sorted by 'group' in a DESCENDING order", async () => {
            await expectSorting('group', 'DESC')
        })

        it("returns permissions sorted by 'level' in an ASCENDING order", async () => {
            await expectSorting('level', 'ASC')
        })

        it("returns permissions sorted by 'level' in a DESCENDING order", async () => {
            await expectSorting('level', 'DESC')
        })
    })

    context('filtering', () => {
        let customRole: Role
        const customRolePermissionIds = [
            PermissionName.add_content_learning_outcomes_433,
            PermissionName.add_learning_outcome_to_content_485,
            PermissionName.add_students_to_class_20225,
            PermissionName.add_teachers_to_class_20226,
        ]

        beforeEach(async () => {
            const notAllowedPermission = await Permission.findOneOrFail()
            notAllowedPermission.allow = false

            await connection.manager.save(notAllowedPermission)

            const customRolePermissions = await Permission.findByIds(
                customRolePermissionIds
            )

            customRole = createRole('Custom Role', organization)
            customRole.permissions = Promise.resolve(customRolePermissions)
            await customRole.save()
        })

        it('supports filtering by system role ID', async () => {
            const systemRoles = await getSystemRoleIds()
            const studentRoleId = systemRoles['Student']
            const filter: IEntityFilter = {
                roleId: { operator: 'eq', value: studentRoleId },
            }

            const result = await permissionsConnectionResolver(info, ctx, {
                direction: 'FORWARD',
                directionArgs: { count: pageSize },
                scope,
                filter,
            })

            const studentPermissions = await Permission.createQueryBuilder(
                'Permission'
            )
                .select(PERMISSIONS_CONNECTION_COLUMNS)
                .innerJoin('Permission.roles', 'Role')
                .where('Role.role_id = :studentRoleId', { studentRoleId })
                .orderBy('Permission.permission_name', 'ASC', 'NULLS LAST')
                .getMany()

            expect(result.totalCount).to.eql(studentPermissions.length)

            result.edges.forEach((edge, index) => {
                expect(edge.node.id).to.be.eql(
                    studentPermissions[index].permission_id
                )
                expect(edge.node.name).to.be.eql(
                    studentPermissions[index].permission_name
                )
                expect(edge.node.category).to.be.eql(
                    studentPermissions[index].permission_category
                )
                expect(edge.node.group).to.be.eql(
                    studentPermissions[index].permission_group
                )
                expect(edge.node.level).to.be.eql(
                    studentPermissions[index].permission_level
                )
                expect(edge.node.description).to.be.eql(
                    studentPermissions[index].permission_description
                )
                expect(edge.node.allow).to.be.eql(
                    studentPermissions[index].allow
                )
            })
        })

        it('supports filtering by custom role ID', async () => {
            const customRoleId = customRole.role_id
            const filter: IEntityFilter = {
                roleId: { operator: 'eq', value: customRoleId },
            }

            const result = await permissionsConnectionResolver(info, ctx, {
                direction: 'FORWARD',
                directionArgs: { count: pageSize },
                scope,
                filter,
            })

            const customRolePermissions = (await customRole.permissions) || []

            expect(result.totalCount).to.eql(customRolePermissions.length)

            result.edges.forEach((edge, index) => {
                expect(edge.node.id).to.eql(
                    customRolePermissions[index].permission_id
                )
                expect(edge.node.name).to.eql(
                    customRolePermissions[index].permission_name
                )
                expect(edge.node.category).to.eql(
                    customRolePermissions[index].permission_category
                )
                expect(edge.node.group).to.eql(
                    customRolePermissions[index].permission_group
                )
                expect(edge.node.level).to.eql(
                    customRolePermissions[index].permission_level
                )
                expect(edge.node.description).to.eql(
                    customRolePermissions[index].permission_description
                )
                expect(edge.node.allow).to.eql(
                    customRolePermissions[index].allow
                )
            })
        })

        it('supports filtering by permission name', async () => {
            const searching = 'attend'
            const filter: IEntityFilter = {
                name: { operator: 'contains', value: searching },
            }

            const result = await permissionsConnectionResolver(info, ctx, {
                direction: 'FORWARD',
                directionArgs: { count: pageSize },
                scope,
                filter,
            })

            expect(result.totalCount).to.eql(5)

            result.edges.forEach((edge) => {
                expect(edge.node.name).includes(searching)
            })
        })

        it('supports filtering by permission allow', async () => {
            const allowValue = false
            const filter: IEntityFilter = {
                allow: { operator: 'eq', value: allowValue },
            }

            const result = await permissionsConnectionResolver(info, ctx, {
                direction: 'FORWARD',
                directionArgs: { count: pageSize },
                scope,
                filter,
            })

            expect(result.totalCount).to.eql(1)

            result.edges.forEach((edge) => {
                expect(edge.node.allow).to.eql(allowValue)
            })
        })
    })

    context('when totalCount is not requested', () => {
        beforeEach(() => {
            info = ({
                fieldNodes: [
                    {
                        selectionSet: {
                            selections: [
                                {
                                    kind: 'Field',
                                    name: {
                                        value: 'edges',
                                    },
                                },
                            ],
                        },
                    },
                ],
            } as unknown) as GraphQLResolveInfo
        })

        it('makes just one call to the database', async () => {
            connection.logger.reset()

            await permissionsConnectionResolver(info, ctx, {
                direction: 'FORWARD',
                directionArgs: { count: pageSize },
                scope,
            })

            expect(connection.logger.count).to.be.eq(1)
        })
    })
})
