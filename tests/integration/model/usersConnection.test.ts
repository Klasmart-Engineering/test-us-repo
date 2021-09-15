import { expect, use } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import faker from 'faker'
import { sortBy } from 'lodash'
import { Connection, Like } from 'typeorm'
import { Class } from '../../../src/entities/class'
import { Organization } from '../../../src/entities/organization'
import { OrganizationMembership } from '../../../src/entities/organizationMembership'
import { Role } from '../../../src/entities/role'
import { School } from '../../../src/entities/school'
import { SchoolMembership } from '../../../src/entities/schoolMembership'
import { Status } from '../../../src/entities/status'
import { User } from '../../../src/entities/user'
import { Model } from '../../../src/model'
import {
    CoreUserConnectionNode,
    mapUserToUserConnectionNode,
} from '../../../src/pagination/usersConnection'
import { PermissionName } from '../../../src/permissions/permissionNames'
import { UserConnectionNode } from '../../../src/types/graphQL/userConnectionNode'
import { createServer } from '../../../src/utils/createServer'
import { IEntityFilter } from '../../../src/utils/pagination/filtering'
import {
    IEdge,
    convertDataToCursor,
} from '../../../src/utils/pagination/paginate'
import { createClass } from '../../factories/class.factory'
import {
    createOrganizations,
    createOrganization,
} from '../../factories/organization.factory'
import { createOrganizationMembership } from '../../factories/organizationMembership.factory'
import { createRole } from '../../factories/role.factory'
import { createSchool } from '../../factories/school.factory'
import { createSchoolMembership } from '../../factories/schoolMembership.factory'
import {
    ADMIN_EMAIL,
    createUser,
    createUsers,
} from '../../factories/user.factory'
import {
    ApolloServerTestClient,
    createTestClient,
} from '../../utils/createTestClient'
import {
    usersConnectionNodes,
    userConnection,
} from '../../utils/operations/modelOps'
import { addRoleToOrganizationMembership } from '../../utils/operations/organizationMembershipOps'
import { grantPermission } from '../../utils/operations/roleOps'
import {
    userToPayload,
    addOrganizationToUserAndValidate,
} from '../../utils/operations/userOps'
import {
    getAdminAuthToken,
    generateToken,
    getNonAdminAuthToken,
} from '../../utils/testConfig'
import { createTestConnection } from '../../utils/testConnection'
import { createAdminUser, createNonAdminUser } from '../../utils/testEntities'

use(deepEqualInAnyOrder)

describe('usersConnection', () => {
    let usersList: User[] = []
    const direction = 'FORWARD'
    let connection: Connection
    let testClient: ApolloServerTestClient

    before(async () => {
        connection = await createTestConnection()
        const server = createServer(new Model(connection))
        testClient = createTestClient(server)
    })

    after(async () => {
        await connection?.close()
    })

    const expectUserConnectionEdge = (
        edge: IEdge<UserConnectionNode>,
        user: User
    ) => {
        expect(edge.node).to.deep.equal({
            id: user.user_id,
            givenName: user.given_name,
            familyName: user.family_name,
            avatar: user.avatar,
            status: user.status,
            contactInfo: {
                email: user.email,
                phone: user.phone,
            },
            alternateContactInfo: {
                email: user.alternate_email,
                phone: user.alternate_phone,
            },
        } as Required<CoreUserConnectionNode>)
    }

    context('data', () => {
        beforeEach(async () => {
            usersList = await User.save(
                Array(2)
                    .fill(undefined)
                    .map((_) => {
                        const user = createUser()
                        // Populate fields not set in `createUser`
                        user.avatar = 'some_image'
                        user.alternate_email = faker.internet.email()
                        user.alternate_phone = faker.phone.phoneNumber()
                        return user
                    })
            )
            usersList = sortBy(usersList, 'user_id')
        })

        it('populates a UserConnectionNode at each edge.node based on the User entity', async () => {
            const userConnectionResponse = await usersConnectionNodes(
                testClient,
                { authorization: getAdminAuthToken() }
            )

            expect(userConnectionResponse.edges).to.have.length(2)
            userConnectionResponse.edges.forEach((edge, i) =>
                expectUserConnectionEdge(edge, usersList[i])
            )
        })
    })

    context('permissions', () => {
        let organization: Organization
        let user: User
        let users: User[]
        let schools: School[]
        let organizations: Organization[]

        beforeEach(async () => {
            users = await User.save(createUsers(9))
            user = users[0]
            organizations = await Organization.save(createOrganizations(3))
            organization = organizations[0]

            await OrganizationMembership.save(
                users.map((user, i) =>
                    createOrganizationMembership({
                        user,
                        organization: organizations[i % 3],
                    })
                )
            )

            schools = await School.save([
                createSchool(organizations[0]),
                createSchool(organizations[1]),
            ])

            await SchoolMembership.save([
                createSchoolMembership({
                    user: users[0],
                    school: schools[0],
                }),
                createSchoolMembership({
                    user: users[3],
                    school: schools[0],
                }),
                createSchoolMembership({
                    user: users[1],
                    school: schools[1],
                }),
            ])

            await Class.save([
                createClass(undefined, organizations[0], {
                    students: [users[1], users[5], users[6]],
                    teachers: [users[0]],
                }),
                createClass(undefined, organizations[1], {
                    students: [users[2]],
                    teachers: [users[1]],
                }),
            ])

            // make at least one user in a different Org have the same email as `user`
            users[8].email = user.email
            await users[8].save()
        })

        context('admin', () => {
            beforeEach(async () => {
                // Make the User an admin
                user.email = ADMIN_EMAIL
                await user.save()
            })
            it('can view all Users', async () => {
                const usersConnectionResponse = await usersConnectionNodes(
                    testClient,
                    { authorization: generateToken(userToPayload(user)) }
                )

                expect(usersConnectionResponse.edges).to.have.length(
                    users.length
                )
            })
        })

        context('non-admin', () => {
            const addPermission = async ({
                user,
                organization,
                permission,
            }: {
                user: User
                organization: Organization
                permission: PermissionName
            }) => {
                const role = await createRole(undefined, organization).save()
                await OrganizationMembership.createQueryBuilder()
                    .relation('roles')
                    .of({
                        user_id: user.user_id,
                        organization_id: organization.organization_id,
                    })
                    .add(role)
                await Role.createQueryBuilder()
                    .relation('permissions')
                    .of(role)
                    .add(permission)
            }

            context('User with `view_users_40110`', () => {
                beforeEach(
                    async () =>
                        await addPermission({
                            user,
                            organization,
                            permission: PermissionName.view_users_40110,
                        })
                )
                it('can view Users in the Organizations they belong to', async () => {
                    const usersConnectionResponse = await usersConnectionNodes(
                        testClient,
                        {
                            authorization: generateToken(userToPayload(user)),
                        }
                    )

                    expect(
                        usersConnectionResponse.edges.map((edge) => edge.node)
                    ).to.deep.equalInAnyOrder(
                        [users[0], users[3], users[6]].map(
                            mapUserToUserConnectionNode
                        )
                    )
                })

                it('applies organizationId filters', async () => {
                    await createOrganizationMembership({
                        user,
                        organization: organizations[1],
                    }).save()
                    await addPermission({
                        user,
                        organization: organizations[1],
                        permission: PermissionName.view_users_40110,
                    })

                    const usersConnectionResponse = await usersConnectionNodes(
                        testClient,
                        {
                            authorization: generateToken(userToPayload(user)),
                        },
                        {
                            organizationId: {
                                operator: 'eq',
                                value: organization.organization_id,
                            },
                        }
                    )

                    expect(
                        usersConnectionResponse.edges.map((edge) => edge.node)
                    ).to.deep.equalInAnyOrder(
                        [users[0], users[3], users[6]].map(
                            mapUserToUserConnectionNode
                        )
                    )
                })

                it('applies organizationUserStatus filters', async () => {
                    const filteredUser = users[3]
                    await OrganizationMembership.update(
                        {
                            user_id: filteredUser.user_id,
                            organization_id: organization.organization_id,
                        },
                        { status: Status.INACTIVE }
                    )

                    const usersConnectionResponse = await usersConnectionNodes(
                        testClient,
                        {
                            authorization: generateToken(userToPayload(user)),
                        },
                        {
                            organizationUserStatus: {
                                operator: 'eq',
                                value: Status.INACTIVE,
                            },
                        }
                    )

                    expect(
                        usersConnectionResponse.edges.map((edge) => edge.node)
                    ).to.deep.equal([mapUserToUserConnectionNode(filteredUser)])
                })

                it('applies roleId filters', async () => {
                    const role = await createRole(
                        undefined,
                        organization
                    ).save()
                    const filteredUser = users[3]
                    await OrganizationMembership.createQueryBuilder()
                        .relation('roles')
                        .of({
                            user_id: filteredUser.user_id,
                            organization_id: organization.organization_id,
                        })
                        .add(role)

                    const usersConnectionResponse = await usersConnectionNodes(
                        testClient,
                        {
                            authorization: generateToken(userToPayload(user)),
                        },
                        {
                            roleId: {
                                operator: 'eq',
                                value: role.role_id,
                            },
                        }
                    )

                    expect(
                        usersConnectionResponse.edges.map((edge) => edge.node)
                    ).to.deep.equal([mapUserToUserConnectionNode(filteredUser)])
                })
            })
            context('User with `view_my_school_users_40111', () => {
                beforeEach(
                    async () =>
                        await addPermission({
                            user,
                            organization,
                            permission:
                                PermissionName.view_my_school_users_40111,
                        })
                )
                it('can view Users in the Schools they belong to', async () => {
                    const usersConnectionResponse = await usersConnectionNodes(
                        testClient,
                        {
                            authorization: generateToken(userToPayload(user)),
                        }
                    )

                    expect(
                        usersConnectionResponse.edges.map((edge) => edge.node)
                    ).to.deep.equalInAnyOrder(
                        [user, users[3]].map(mapUserToUserConnectionNode)
                    )
                })

                it('applies schoolId filters', async () => {
                    const usersConnectionResponse = await usersConnectionNodes(
                        testClient,
                        {
                            authorization: generateToken(userToPayload(user)),
                        },
                        {
                            schoolId: {
                                operator: 'eq',
                                value: schools[1].school_id,
                            },
                        }
                    )

                    expect(usersConnectionResponse.edges).to.have.length(0)
                })
            })
            context('User with `view_my_class_users_40112`', () => {
                beforeEach(
                    async () =>
                        await addPermission({
                            user,
                            organization,
                            permission:
                                PermissionName.view_my_class_users_40112,
                        })
                )
                it('can view Students in the Classes they teach', async () => {
                    const usersConnectionResponse = await usersConnectionNodes(
                        testClient,
                        {
                            authorization: generateToken(userToPayload(user)),
                        }
                    )

                    expect(
                        usersConnectionResponse.edges.map((edge) => edge.node)
                    ).to.deep.equalInAnyOrder(
                        [user, users[1], users[5], users[6]].map(
                            mapUserToUserConnectionNode
                        )
                    )
                })
            })
            context('User with `view_my_users_40113`', () => {
                beforeEach(
                    async () =>
                        await addPermission({
                            user,
                            organization,
                            permission: PermissionName.view_my_users_40113,
                        })
                )
                it('can view Users with the same email', async () => {
                    const usersConnectionResponse = await usersConnectionNodes(
                        testClient,
                        {
                            authorization: generateToken(userToPayload(user)),
                        }
                    )

                    expect(
                        usersConnectionResponse.edges.map(
                            (edge) => edge.node.id
                        )
                    ).to.deep.equalInAnyOrder([user.user_id, users[8].user_id])
                })
            })
            context('User with no "view_*_users" permission', () => {
                it('can only see their own User', async () => {
                    const usersConnectionResponse = await usersConnectionNodes(
                        testClient,
                        {
                            authorization: generateToken(userToPayload(user)),
                        }
                    )

                    expect(
                        usersConnectionResponse.edges.map(
                            (edge) => edge.node.id
                        )
                    ).to.deep.equal([user.user_id])
                })
            })
        })
    })

    context('seek forward', () => {
        beforeEach(async () => {
            usersList = []
            const roleList: Role[] = []
            const organizations: Organization[] = []
            const schools: School[] = []
            // create two orgs and two schools
            for (let i = 0; i < 2; i++) {
                const org = await createOrganization().save()
                organizations.push(org)
                roleList.push(await createRole('role ' + i, org).save())
                schools.push(await createSchool(org).save())
            }
            usersList = await User.save(createUsers(10))
            // add organizations and schools to users

            await connection.manager.save(
                usersList.flatMap((user) => {
                    const entities = []
                    for (let i = 0; i < 2; i++) {
                        const role = roleList[i]
                        entities.push(
                            createOrganizationMembership({
                                user,
                                organization: organizations[i],
                                roles: [role],
                            }),
                            createSchoolMembership({
                                user,
                                school: schools[i],
                                roles: [role],
                            })
                        )
                    }
                    return entities
                })
            )
            usersList.sort((a, b) => (a.user_id > b.user_id ? 1 : -1))
        })

        it('should get the next few records according to pagesize and startcursor', async () => {
            let directionArgs = {
                count: 3,
                cursor: convertDataToCursor({
                    user_id: usersList[3].user_id,
                }),
            }
            const usersConnection = await userConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() }
            )

            expect(usersConnection?.totalCount).to.eql(10)
            expect(usersConnection?.edges.length).to.equal(3)
            for (let i = 0; i < 3; i++) {
                expect(usersConnection?.edges[i].node.id).to.equal(
                    usersList[4 + i].user_id
                )
                expect(
                    usersConnection?.edges[i].node.organizations.length
                ).to.equal(2)
                expect(usersConnection?.edges[i].node.schools.length).to.equal(
                    2
                )
                expect(usersConnection?.edges[i].node.roles.length).to.equal(4)
            }
            expect(usersConnection?.pageInfo.startCursor).to.equal(
                convertDataToCursor({ user_id: usersList[4].user_id })
            )
            expect(usersConnection?.pageInfo.endCursor).to.equal(
                convertDataToCursor({ user_id: usersList[6].user_id })
            )
            expect(usersConnection?.pageInfo.hasNextPage).to.be.true
            expect(usersConnection?.pageInfo.hasPreviousPage).to.be.true
        })
    })

    context('organization filter', () => {
        let org: Organization
        let school1: School
        let role1: Role
        beforeEach(async () => {
            //org used to filter
            org = createOrganization()
            role1 = createRole('role 1', org)
            school1 = createSchool(org)

            // org and school whose membership shouldnt be included
            let org2 = createOrganization()
            let role2 = createRole('role 2', org2)
            const school2 = createSchool(org2)

            await Organization.save([org, org2])
            await Role.save([role1, role2])
            await School.save([school1, school2])

            usersList = await User.save(createUsers(10))
            await connection.manager.save(usersList)
            await connection.manager.save(
                usersList.flatMap((user) => {
                    return [
                        createOrganizationMembership({
                            user,
                            organization: org,
                            roles: [role1],
                        }),
                        createOrganizationMembership({
                            user,
                            organization: org2,
                            roles: [role2],
                        }),
                        createSchoolMembership({
                            user,
                            school: school1,
                            roles: [role1],
                        }),
                        createSchoolMembership({
                            user,
                            school: school2,
                            roles: [role2],
                        }),
                    ]
                })
            )
            usersList.sort((a, b) => (a.user_id > b.user_id ? 1 : -1))
        })
        it('should filter the pagination results on organizationId', async () => {
            let directionArgs = {
                count: 3,
                cursor: convertDataToCursor({
                    user_id: usersList[3].user_id,
                }),
            }
            const filter: IEntityFilter = {
                organizationId: {
                    operator: 'eq',
                    value: org.organization_id,
                },
            }
            const usersConnection = await userConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() },
                filter
            )

            expect(usersConnection?.totalCount).to.eql(10)
            expect(usersConnection?.edges.length).to.equal(3)
            for (let i = 0; i < 3; i++) {
                expect(usersConnection?.edges[i].node.id).to.equal(
                    usersList[4 + i].user_id
                )
                expect(
                    usersConnection?.edges[i].node.organizations.length
                ).to.equal(1)
                expect(
                    usersConnection?.edges[i].node.organizations[0].id
                ).to.equal(org.organization_id)
                expect(usersConnection?.edges[i].node.schools.length).to.equal(
                    1
                )
                expect(usersConnection?.edges[i].node.roles.length).to.equal(2)
                expect(usersConnection?.edges[i].node.schools[0].id).to.equal(
                    school1.school_id
                )
                expect(usersConnection?.edges[i].node.roles[0].id).to.equal(
                    role1.role_id
                )
            }
            expect(usersConnection?.pageInfo.startCursor).to.equal(
                convertDataToCursor({ user_id: usersList[4].user_id })
            )
            expect(usersConnection?.pageInfo.endCursor).to.equal(
                convertDataToCursor({ user_id: usersList[6].user_id })
            )
            expect(usersConnection?.pageInfo.hasNextPage).to.be.true
            expect(usersConnection?.pageInfo.hasPreviousPage).to.be.true
        })

        it('returns roles if the user has no school memberships', async () => {
            const newUser = createUser()
            await connection.manager.save([newUser])

            await createOrganizationMembership({
                user: newUser,
                organization: org,
                roles: [role1],
            }).save()

            const filter: IEntityFilter = {
                organizationId: {
                    operator: 'eq',
                    value: org.organization_id,
                },
                userId: {
                    operator: 'eq',
                    value: newUser.user_id,
                },
            }
            const usersConnection = await userConnection(
                testClient,
                direction,
                { count: 1 },
                { authorization: getAdminAuthToken() },
                filter
            )

            expect(usersConnection?.edges[0].node.roles.length).to.equal(1)
        })
    })

    context('school filter', () => {
        let org: Organization
        let school1: School
        let school2: School
        let role1: Role
        beforeEach(async () => {
            //org used to filter
            const superAdmin = await createAdminUser(testClient)
            org = await createOrganization(superAdmin).save()
            role1 = await createRole('role 1', org).save()
            school1 = createSchool(org)
            school2 = createSchool(org)

            await connection.manager.save([school1, school2])

            usersList = await User.save(createUsers(10))
            //sort users by userId
            await connection.manager.save(usersList)
            usersList.sort((a, b) => (a.user_id > b.user_id ? 1 : -1))

            const memberships = await OrganizationMembership.save(
                usersList.map((user) =>
                    createOrganizationMembership({
                        user,
                        organization: org,
                    })
                )
            )
            await Role.createQueryBuilder()
                .relation('memberships')
                .of(role1)
                .add(memberships)

            // add half of users to one school and other half to different school
            // also add 5th user to both school
            await SchoolMembership.save(
                usersList
                    .slice(0, 6)
                    .map((user) =>
                        createSchoolMembership({ user, school: school1 })
                    )
            )
            await SchoolMembership.save(
                usersList
                    .slice(5)
                    .map((user) =>
                        createSchoolMembership({ user, school: school2 })
                    )
            )
        })
        it('should filter the pagination results on schoolId', async () => {
            let directionArgs = {
                count: 3,
            }
            const filter: IEntityFilter = {
                schoolId: {
                    operator: 'eq',
                    value: school2.school_id,
                },
            }
            const usersConnection = await userConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() },
                filter
            )

            expect(usersConnection?.totalCount).to.eql(5)
            expect(usersConnection?.edges.length).to.equal(3)

            //user belonging to more than one returned
            //FE needs all a users schools even if they are not in the filter
            expect(usersConnection?.edges[0].node.schools.length).to.equal(2)
            expect(usersConnection?.edges[0].node.id).to.equal(
                usersList[5].user_id
            )

            for (let i = 1; i < 3; i++) {
                expect(usersConnection?.edges[i].node.id).to.equal(
                    usersList[5 + i].user_id
                )
                expect(usersConnection?.edges[i].node.schools.length).to.equal(
                    1
                )
                expect(usersConnection?.edges[i].node.schools[0].id).to.equal(
                    school2.school_id
                )
            }
            expect(usersConnection?.pageInfo.startCursor).to.equal(
                convertDataToCursor({ user_id: usersList[5].user_id })
            )
            expect(usersConnection?.pageInfo.endCursor).to.equal(
                convertDataToCursor({ user_id: usersList[7].user_id })
            )
            expect(usersConnection?.pageInfo.hasNextPage).to.be.true
            expect(usersConnection?.pageInfo.hasPreviousPage).to.be.false
        })
        it('works for non-admins', async () => {
            const nonAdmin = await createNonAdminUser(testClient)
            const membership = await createOrganizationMembership({
                user: nonAdmin,
                organization: org,
                roles: [role1],
            }).save()

            await grantPermission(
                testClient,
                role1.role_id,
                PermissionName.view_users_40110,
                { authorization: getAdminAuthToken() }
            )

            const filter: IEntityFilter = {
                schoolId: {
                    operator: 'eq',
                    value: school2.school_id,
                },
            }
            const usersConnection = await userConnection(
                testClient,
                direction,
                { count: 3 },
                { authorization: getNonAdminAuthToken() },
                filter
            )
            expect(usersConnection?.totalCount).to.eql(5)
        })
    })

    context('role filter', () => {
        let org: Organization
        let school1: School
        let role1: Role
        let role2: Role
        beforeEach(async () => {
            //org used to filter
            org = await createOrganization().save()
            role1 = createRole('role 1', org)
            role2 = createRole('role 2', org)
            await Role.save([role1, role2])
            school1 = await createSchool(org).save()

            usersList = await User.save(createUsers(10))

            //sort users by userId
            usersList.sort((a, b) => (a.user_id > b.user_id ? 1 : -1))

            const orgMemberships = await OrganizationMembership.save(
                usersList.map((user) =>
                    createOrganizationMembership({
                        user,
                        organization: org,
                    })
                )
            )

            const schoolMemberships = await SchoolMembership.save(
                usersList.map((user) =>
                    createSchoolMembership({ user, school: school1 })
                )
            )

            // add 5 users to role1 and 5 users to role2
            // add 6th user to both roles
            await Role.createQueryBuilder()
                .relation('memberships')
                .of(role1)
                .add(orgMemberships.slice(0, 6))
            await Role.createQueryBuilder()
                .relation('schoolMemberships')
                .of(role1)
                .add(schoolMemberships.slice(0, 6))

            await Role.createQueryBuilder()
                .relation('memberships')
                .of(role2)
                .add(orgMemberships.slice(5))
            await Role.createQueryBuilder()
                .relation('schoolMemberships')
                .of(role2)
                .add(schoolMemberships.slice(5))
        })
        it('should filter the pagination results on roleId', async () => {
            let directionArgs = {
                count: 3,
            }
            const filter: IEntityFilter = {
                roleId: {
                    operator: 'eq',
                    value: role2.role_id,
                },
            }
            const usersConnection = await userConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() },
                filter
            )

            expect(usersConnection?.totalCount).to.eql(5)
            expect(usersConnection?.edges.length).to.equal(3)
            // We are filtering on users by roles not what roles the users that we find have

            for (let i = 0; i < 3; i++) {
                expect(usersConnection?.edges[i].node.id).to.equal(
                    usersList[5 + i].user_id
                )
            }
            expect(usersConnection?.pageInfo.startCursor).to.equal(
                convertDataToCursor({ user_id: usersList[5].user_id })
            )
            expect(usersConnection?.pageInfo.endCursor).to.equal(
                convertDataToCursor({ user_id: usersList[7].user_id })
            )
            expect(usersConnection?.pageInfo.hasNextPage).to.be.true
            expect(usersConnection?.pageInfo.hasPreviousPage).to.be.false
        })
    })

    context('organizationUserStatus filter', () => {
        let org: Organization
        let school1: School
        let role1: Role
        beforeEach(async () => {
            //org used to filter
            org = await createOrganization().save()
            role1 = await createRole('role 1', org).save()
            school1 = await createSchool(org).save()

            usersList = await User.save(createUsers(10))
            //sort users by userId
            usersList.sort((a, b) => (a.user_id > b.user_id ? 1 : -1))

            const orgMemberships = usersList.map((user) =>
                createOrganizationMembership({
                    user,
                    organization: org,
                })
            )
            //set 4 users to inactive
            orgMemberships
                .slice(0, 4)
                .forEach((membership) => (membership.status = Status.INACTIVE))
            await OrganizationMembership.save(orgMemberships)
            await Role.createQueryBuilder()
                .relation('memberships')
                .of(role1)
                .add(orgMemberships)

            const schoolMemberships = await SchoolMembership.save(
                usersList.map((user) =>
                    createSchoolMembership({
                        user,
                        school: school1,
                    })
                )
            )
            await Role.createQueryBuilder()
                .relation('schoolMemberships')
                .of(role1)
                .add(schoolMemberships)
        })

        it('should filter the pagination results on organizationId', async () => {
            let directionArgs = {
                count: 3,
            }
            const filter: IEntityFilter = {
                organizationId: {
                    operator: 'eq',
                    value: org.organization_id,
                },
                organizationUserStatus: {
                    operator: 'eq',
                    value: Status.INACTIVE,
                },
            }
            const usersConnection = await userConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() },
                filter
            )

            expect(usersConnection?.totalCount).to.eql(4)
            expect(usersConnection?.edges.length).to.equal(3)
            for (let i = 0; i < 3; i++) {
                expect(
                    usersConnection?.edges[i].node.organizations[0].userStatus
                ).to.equal(Status.INACTIVE)
            }
        })

        it('returns nothing for non admins', async () => {
            const filter: IEntityFilter = {
                organizationId: {
                    operator: 'eq',
                    value: org.organization_id,
                },
            }
            const usersConnection = await userConnection(
                testClient,
                direction,
                undefined,
                { authorization: getNonAdminAuthToken() },
                filter
            )

            expect(usersConnection?.totalCount).to.eql(0)
        })
    })

    context('filter combinations', () => {
        let org: Organization
        let org2: Organization
        let school1: School
        let school2: School
        let school3: School
        let role1: Role
        let role2: Role
        let role3: Role
        beforeEach(async () => {
            //org role and school used to filter
            org = await createOrganization().save()
            role1 = createRole('role 1', org)
            role2 = createRole('role 2', org)
            await Role.save([role1, role2])
            school1 = createSchool(org)
            school2 = createSchool(org)
            await School.save([school1, school2])

            usersList = await User.save(createUsers(15))
            //sort users by userId
            usersList.sort((a, b) => (a.user_id > b.user_id ? 1 : -1))

            const orgMemberships = await OrganizationMembership.save(
                usersList.slice(0, 10).map((user) =>
                    createOrganizationMembership({
                        user,
                        organization: org,
                    })
                )
            )

            // add 5 users to role1/school1 and 5 users to role2/school2
            // add 6th user to both roles and schools
            const schoolMemberships = await SchoolMembership.save(
                usersList
                    .slice(0, 6)
                    .map((user) =>
                        createSchoolMembership({
                            user,
                            school: school1,
                        })
                    )
                    .concat(
                        usersList.slice(5, 10).map((user) =>
                            createSchoolMembership({
                                user,
                                school: school2,
                            })
                        )
                    )
            )

            await Role.createQueryBuilder()
                .relation('memberships')
                .of(role1)
                .add(orgMemberships.slice(0, 6))

            await Role.createQueryBuilder()
                .relation('memberships')
                .of(role2)
                .add(orgMemberships.slice(5))

            await Role.createQueryBuilder()
                .relation('schoolMemberships')
                .of(role1)
                .add(schoolMemberships.slice(0, 6))
            await Role.createQueryBuilder()
                .relation('schoolMemberships')
                .of(role2)
                .add(schoolMemberships.slice(5))

            // create second org and add other users to this org
            const otherUsers = usersList.slice(10)
            org2 = await createOrganization().save()
            role3 = await createRole('role 3', org2).save()
            school3 = await createSchool(org2).save()

            const otherOrgMemberships = await OrganizationMembership.save(
                otherUsers.map((user) =>
                    createOrganizationMembership({
                        user,
                        organization: org2,
                    })
                )
            )

            // add remaining users to school3 and role3
            await Role.createQueryBuilder()
                .relation('memberships')
                .of(role3)
                .add(otherOrgMemberships)

            const otherSchoolMemberships = await SchoolMembership.save(
                otherUsers.map((user) =>
                    createSchoolMembership({ user, school: school3 })
                )
            )
            await Role.createQueryBuilder()
                .relation('schoolMemberships')
                .of(role3)
                .add(otherSchoolMemberships)
        })
        it('should filter the pagination results on all filters', async () => {
            let directionArgs = {
                count: 3,
            }
            const filter: IEntityFilter = {
                organizationId: {
                    operator: 'eq',
                    value: org.organization_id,
                },
                roleId: {
                    operator: 'eq',
                    value: role2.role_id,
                },
                schoolId: {
                    operator: 'eq',
                    value: school2.school_id,
                },
            }
            const usersConnection = await userConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() },
                filter
            )

            expect(usersConnection?.totalCount).to.eql(5)
            expect(usersConnection?.edges.length).to.equal(3)

            for (let i = 0; i < 3; i++) {
                expect(usersConnection?.edges[i].node.id).to.equal(
                    usersList[5 + i].user_id
                )
            }
            expect(usersConnection?.pageInfo.startCursor).to.equal(
                convertDataToCursor({ user_id: usersList[5].user_id })
            )
            expect(usersConnection?.pageInfo.endCursor).to.equal(
                convertDataToCursor({ user_id: usersList[7].user_id })
            )
            expect(usersConnection?.pageInfo.hasNextPage).to.be.true
            expect(usersConnection?.pageInfo.hasPreviousPage).to.be.false
        })
    })

    context('userId filter', () => {
        beforeEach(async () => {
            usersList = await User.save(createUsers(3))
        })

        it('supports `eq` operator', async () => {
            const usersConnectionResponse = await usersConnectionNodes(
                testClient,
                { authorization: getAdminAuthToken() },
                { userId: { operator: 'eq', value: usersList[0].user_id } }
            )

            expect(
                usersConnectionResponse.edges.map((edge) => edge.node)
            ).to.deep.equal([mapUserToUserConnectionNode(usersList[0])])
        })

        it('supports `neq` operator', async () => {
            const usersConnectionResponse = await usersConnectionNodes(
                testClient,
                { authorization: getAdminAuthToken() },
                { userId: { operator: 'neq', value: usersList[0].user_id } }
            )

            expect(
                usersConnectionResponse.edges.map((edge) => edge.node)
            ).to.deep.equalInAnyOrder(
                usersList.slice(1).map(mapUserToUserConnectionNode)
            )
        })
    })

    context('phoneFilter', () => {
        beforeEach(async () => {
            usersList = []

            // create 5 users
            for (let i = 0; i < 5; i++) {
                const user = createUser()
                user.phone = '000000000'
                usersList.push(user)
            }

            await connection.manager.save(usersList)

            //sort users by userId
            usersList.sort((a, b) => (a.user_id > b.user_id ? 1 : -1))

            // This test would occasionally fail if Users in the outer scope were created with
            // a phone containing '123' (from faker.phone.phoneNumber() in createUser)
            await User.update({ phone: Like('%123%') }, { phone: '+44999111' })

            // add phone number to 2 users
            usersList[0].phone = '123456789'
            usersList[1].phone = '456789123'
            await connection.manager.save(usersList.slice(0, 2))
        })
        it('should filter on phone', async () => {
            const filter: IEntityFilter = {
                phone: {
                    operator: 'contains',
                    caseInsensitive: true,
                    value: '123',
                },
            }
            let directionArgs = {
                count: 3,
            }
            const usersConnection = await userConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() },
                filter
            )
            expect(usersConnection?.totalCount).to.eql(2)
            expect(usersConnection?.edges.length).to.equal(2)
            expect(usersConnection?.edges[0].node.id).to.equal(
                usersList[0].user_id
            )
            expect(usersConnection?.edges[1].node.id).to.equal(
                usersList[1].user_id
            )

            expect(usersConnection?.pageInfo.hasNextPage).to.be.false
            expect(usersConnection?.pageInfo.hasPreviousPage).to.be.false
        })
    })

    context('class filter', () => {
        let org: Organization
        let school: School
        let class1: Class
        let class2: Class
        let role1: Role

        beforeEach(async () => {
            //org used to filter
            const superAdmin = await createAdminUser(testClient)
            org = await createOrganization(superAdmin).save()
            role1 = await createRole('role 1', org).save()
            school = await createSchool(org).save()

            class1 = createClass([school])
            class2 = createClass([school])

            await Class.save([class1, class2])

            usersList = await User.save(createUsers(10))
            //sort users by userId
            usersList.sort((a, b) => (a.user_id > b.user_id ? 1 : -1))

            const memberships = await OrganizationMembership.save(
                usersList.map((user) =>
                    createOrganizationMembership({
                        user,
                        organization: org,
                    })
                )
            )
            await Role.createQueryBuilder()
                .relation('memberships')
                .of(role1)
                .add(memberships)

            // add half of users to one class and other half to different class
            // also add 5th user to both classes
            await Class.createQueryBuilder()
                .relation('students')
                .of(class1)
                .add(usersList.slice(0, 6))

            await Class.createQueryBuilder()
                .relation('students')
                .of(class2)
                .add(usersList.slice(5))
        })

        it('should filter the pagination results on classId', async () => {
            let directionArgs = {
                count: 5,
            }

            const filter: IEntityFilter = {
                classId: {
                    operator: 'eq',
                    value: class2.class_id,
                },
            }

            const usersConnection = await userConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() },
                filter
            )

            expect(usersConnection?.totalCount).to.eql(5)
            expect(usersConnection?.edges.length).to.equal(5)

            expect(usersConnection?.edges[0].node.id).to.equal(
                usersList[5].user_id
            )

            for (let i = 1; i < 3; i++) {
                expect(usersConnection?.edges[i].node.id).to.equal(
                    usersList[5 + i].user_id
                )
            }

            const userIds = usersConnection?.edges.map((edge) => {
                return edge.node.id
            })

            const DBClass = await connection.manager.findOne(Class, {
                where: { class_id: class2.class_id },
            })

            const classUserIds =
                (await DBClass?.students)?.map((student) => {
                    return student.user_id
                }) || []

            expect(userIds).to.deep.equalInAnyOrder(classUserIds)
        })

        it('works for non-admins', async () => {
            const nonAdmin = await createNonAdminUser(testClient)
            await addOrganizationToUserAndValidate(
                testClient,
                nonAdmin.user_id,
                org.organization_id,
                getAdminAuthToken()
            )

            await grantPermission(
                testClient,
                role1.role_id,
                PermissionName.view_users_40110,
                { authorization: getAdminAuthToken() }
            )

            await addRoleToOrganizationMembership(
                testClient,
                nonAdmin.user_id,
                org.organization_id,
                role1.role_id,
                { authorization: getAdminAuthToken() }
            )

            const filter: IEntityFilter = {
                classId: {
                    operator: 'eq',
                    value: class2.class_id,
                },
            }

            const usersConnection = await userConnection(
                testClient,
                direction,
                { count: 5 },
                { authorization: getNonAdminAuthToken() },
                filter
            )

            expect(usersConnection?.totalCount).to.eql(5)

            const userIds = usersConnection?.edges.map((edge) => {
                return edge.node.id
            })

            const DBClass = await connection.manager.findOne(Class, {
                where: { class_id: class2.class_id },
            })

            const classUserIds =
                (await DBClass?.students)?.map((student) => {
                    return student.user_id
                }) || []

            expect(userIds).to.deep.equalInAnyOrder(classUserIds)
        })
    })

    context('sorting', () => {
        it('sorts by givenName', async () => {
            const usersConnection = await userConnection(
                testClient,
                direction,
                { count: 3 },
                { authorization: getAdminAuthToken() },
                undefined,
                {
                    field: 'givenName',
                    order: 'ASC',
                }
            )

            const usersOrderedByGivenNameAsc = [...usersList].sort((a, b) =>
                a.given_name!.localeCompare(b.given_name!)
            )

            for (let i = 0; i < usersConnection.edges.length; i++) {
                expect(usersConnection.edges[i].node.givenName).to.eq(
                    usersOrderedByGivenNameAsc[i].given_name
                )
            }
        })

        it('sorts by familyName', async () => {
            const usersConnection = await userConnection(
                testClient,
                direction,
                { count: 3 },
                { authorization: getAdminAuthToken() },
                undefined,
                {
                    field: 'familyName',
                    order: 'DESC',
                }
            )

            const usersOrderedByFamilyNameDesc = [...usersList].sort((a, b) =>
                b.family_name!.localeCompare(a.family_name!)
            )

            for (let i = 0; i < usersConnection.edges.length; i++) {
                expect(usersConnection.edges[i].node.familyName).to.eq(
                    usersOrderedByFamilyNameDesc[i].family_name
                )
            }
        })
        it('works with filtering', async () => {
            const usersOrderedByGivenNameAsc = [...usersList].sort((a, b) =>
                a.given_name!.localeCompare(b.given_name!)
            )
            const filter: IEntityFilter = {
                givenName: {
                    operator: 'neq',
                    value: usersOrderedByGivenNameAsc[0].given_name!,
                },
            }

            const usersConnection = await userConnection(
                testClient,
                direction,
                { count: 3 },
                { authorization: getAdminAuthToken() },
                filter,
                {
                    field: 'givenName',
                    order: 'ASC',
                }
            )

            for (let i = 0; i < usersConnection.edges.length; i++) {
                expect(usersConnection.edges[i].node.givenName).to.eq(
                    usersOrderedByGivenNameAsc[i + 1].given_name
                )
            }
        })
    })
})
