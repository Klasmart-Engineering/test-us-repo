import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import faker from 'faker'
import { sortBy } from 'lodash'
import { fake } from 'sinon'
import { Organization } from '../../../src/entities/organization'
import { OrganizationMembership } from '../../../src/entities/organizationMembership'
import { OrganizationOwnership } from '../../../src/entities/organizationOwnership'
import { Status } from '../../../src/entities/status'
import { User } from '../../../src/entities/user'
import { Model } from '../../../src/model'
import {
    CoreOrganizationConnectionNode,
    mapOrganizationToOrganizationConnectionNode,
} from '../../../src/pagination/organizationsConnection'
import { PermissionName } from '../../../src/permissions/permissionNames'
import { OrganizationConnectionNode } from '../../../src/types/graphQL/organization'
import { createServer } from '../../../src/utils/createServer'
import { IEntityFilter } from '../../../src/utils/pagination/filtering'
import {
    convertDataToCursor,
    IEdge,
    IPaginatedResponse,
} from '../../../src/utils/pagination/paginate'
import { generateShortCode } from '../../../src/utils/shortcode'
import {
    createOrganization,
    createOrganizations,
} from '../../factories/organization.factory'
import { createOrganizationMembership } from '../../factories/organizationMembership.factory'
import { createOrganizationOwnership } from '../../factories/organizationOwnership.factory'
import { createRole } from '../../factories/role.factory'
import { createSchool } from '../../factories/school.factory'
import { createSchoolMembership } from '../../factories/schoolMembership.factory'
import { ADMIN_EMAIL, createUser } from '../../factories/user.factory'
import {
    ApolloServerTestClient,
    createTestClient,
} from '../../utils/createTestClient'
import {
    organizationsConnection,
    organizationsConnectionMainData,
    organizationsConnectionNodes,
    runQuery,
} from '../../utils/operations/modelOps'
import { userToPayload } from '../../utils/operations/userOps'
import {
    generateToken,
    getAdminAuthToken,
    getNonAdminAuthToken,
} from '../../utils/testConfig'
import {
    createTestConnection,
    TestConnection,
} from '../../utils/testConnection'
import { createNonAdminUser } from '../../utils/testEntities'

use(chaiAsPromised)
use(deepEqualInAnyOrder)

describe('organizationsConnection', () => {
    let organizationsList: Organization[] = []
    const direction = 'FORWARD'
    let connection: TestConnection
    let testClient: ApolloServerTestClient

    before(async () => {
        connection = await createTestConnection()
        const server = await createServer(new Model(connection))
        testClient = await createTestClient(server)
    })

    after(async () => {
        await connection?.close()
    })

    const expectOrganizationConnectionEdge = (
        edge: IEdge<OrganizationConnectionNode>,
        organization: Organization
    ) => {
        expect(edge.node).to.deep.equal({
            id: organization.organization_id,
            name: organization.organization_name,
            shortCode: organization.shortCode,
            status: organization.status,
            contactInfo: {
                address1: organization.address1,
                address2: organization.address2,
                phone: organization.phone,
            },
        } as Required<CoreOrganizationConnectionNode>)
    }

    context('data', () => {
        beforeEach(async () => {
            organizationsList = await Organization.save(
                Array(2)
                    .fill(undefined)
                    .map((_) => {
                        const organization = createOrganization()
                        // Populate fields not set in `createOrganization`
                        organization.address1 = faker.address.streetAddress()
                        organization.address2 = faker.address.secondaryAddress()
                        organization.phone = faker.phone.phoneNumber()
                        return organization
                    })
            )
            organizationsList = sortBy(organizationsList, 'organization_id')
        })

        it('populates a OrganizationConnectionNode at each edge.node based on the Organization entity', async () => {
            const organizationConnectionResponse = await organizationsConnectionNodes(
                testClient,
                { authorization: getAdminAuthToken() }
            )

            expect(organizationConnectionResponse.edges).to.have.length(2)
            organizationConnectionResponse.edges.forEach((edge, i) =>
                expectOrganizationConnectionEdge(edge, organizationsList[i])
            )
        })
    })

    context('permissions', () => {
        let organization: Organization
        let user: User
        let anotherUser: User
        let token: string

        beforeEach(async () => {
            organizationsList = await Organization.save(createOrganizations(3))

            // order organizations by organization ID
            organizationsList = sortBy(organizationsList, 'organization_id')
        })

        /**
         * Test whether all `OrganizationFilter` options can be successfully applied
         * Specific return edges are tested in the `filter` context
         */
        const testOrganizationFilters = () =>
            ([
                {
                    id: {
                        operator: 'eq',
                        value: faker.datatype.uuid(),
                    },
                },
                {
                    name: {
                        operator: 'eq',
                        value: faker.random.word(),
                    },
                },
                {
                    phone: {
                        operator: 'eq',
                        value: faker.phone.phoneNumber('+44#######'),
                    },
                },
                {
                    shortCode: {
                        operator: 'eq',
                        value: generateShortCode(),
                    },
                },
                {
                    status: {
                        operator: 'eq',
                        value: Status.ACTIVE,
                    },
                },
                {
                    ownerUserId: {
                        operator: 'eq',
                        value: faker.datatype.uuid(),
                    },
                },
                {
                    userId: {
                        operator: 'eq',
                        value: faker.datatype.uuid(),
                    },
                },
            ] as IEntityFilter[]).forEach((filter) =>
                it(`filters on ${Object.keys(filter)[0]}`, async () => {
                    return await expect(
                        organizationsConnection(
                            testClient,
                            'FORWARD',
                            { count: 1 },
                            { authorization: token },
                            filter
                        )
                    ).to.be.fulfilled
                })
            )

        context('admin', () => {
            beforeEach(async () => {
                // create an admin
                user = createUser()
                user.email = ADMIN_EMAIL
                await user.save()
            })

            it('returns all organizations when user does not belong to any organizations', async () => {
                const organizationsConnectionResponse = await organizationsConnectionNodes(
                    testClient,
                    { authorization: generateToken(userToPayload(user)) }
                )

                expect(organizationsConnectionResponse.edges).to.have.length(
                    organizationsList.length
                )
            })

            it('returns all organizations when user belongs to an organization', async () => {
                // add user into an organization
                await OrganizationMembership.save(
                    createOrganizationMembership({
                        user,
                        organization: organizationsList[0],
                    })
                )

                const organizationsConnectionResponse = await organizationsConnectionNodes(
                    testClient,
                    { authorization: generateToken(userToPayload(user)) }
                )

                expect(organizationsConnectionResponse.edges).to.have.length(
                    organizationsList.length
                )
            })
        })

        context('non-admin', () => {
            beforeEach(async () => {
                organization = organizationsList[0]

                // create an user
                user = createUser()
                await user.save()

                // add the user into an organization
                await OrganizationMembership.save(
                    createOrganizationMembership({
                        user,
                        organization: organization,
                    })
                )

                // create another user with same email
                anotherUser = createUser()
                anotherUser.email = user.email
                await anotherUser.save()

                // add the user into an organization
                await OrganizationMembership.save(
                    createOrganizationMembership({
                        user: anotherUser,
                        organization: organizationsList[1],
                    })
                )

                token = generateToken(userToPayload(anotherUser))
            })

            it('returns only organizations that the user belongs to', async () => {
                const organizationsConnectionResponse = await organizationsConnection(
                    testClient,
                    direction,
                    null,
                    {
                        authorization: generateToken(userToPayload(user)),
                    }
                )

                expect(organizationsConnectionResponse?.totalCount).to.eql(1)
                expect(organizationsConnectionResponse?.edges.length).to.equal(
                    1
                )
                expect(
                    organizationsConnectionResponse.edges[0].node.id
                ).to.deep.equal(organizationsList[0].organization_id)
            })

            testOrganizationFilters()
        })
    })

    context('pagination', () => {
        beforeEach(async () => {
            organizationsList = await Organization.save(createOrganizations(10))

            // sort organizations by organization ID
            organizationsList.sort((a, b) =>
                a.organization_id > b.organization_id ? 1 : -1
            )
        })

        it('gets the next few records according to pagesize and start cursor', async () => {
            const directionArgs = {
                count: 3,
                cursor: convertDataToCursor({
                    organization_id: organizationsList[3].organization_id,
                }),
            }
            const organizationsConnectionResponse = await organizationsConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() }
            )

            expect(organizationsConnectionResponse?.totalCount).to.eql(10)
            expect(organizationsConnectionResponse?.edges.length).to.equal(3)

            for (let i = 0; i < 3; i++) {
                expect(
                    organizationsConnectionResponse?.edges[i].node.id
                ).to.equal(organizationsList[4 + i].organization_id)
            }
            expect(
                organizationsConnectionResponse?.pageInfo.startCursor
            ).to.equal(
                convertDataToCursor({
                    organization_id: organizationsList[4].organization_id,
                })
            )
            expect(
                organizationsConnectionResponse?.pageInfo.endCursor
            ).to.equal(
                convertDataToCursor({
                    organization_id: organizationsList[6].organization_id,
                })
            )
            expect(organizationsConnectionResponse?.pageInfo.hasNextPage).to.be
                .true
            expect(organizationsConnectionResponse?.pageInfo.hasPreviousPage).to
                .be.true
        })
    })

    context('sorting', () => {
        it('sorts by name', async () => {
            const organizationsConnectionResponse = await organizationsConnection(
                testClient,
                direction,
                { count: 3 },
                { authorization: getAdminAuthToken() },
                undefined,
                {
                    field: 'name',
                    order: 'ASC',
                }
            )

            const organizationOrderedByNameAsc = [
                ...organizationsList,
            ].sort((a, b) =>
                a.organization_name!.localeCompare(b.organization_name!)
            )

            for (
                let i = 0;
                i < organizationsConnectionResponse.edges.length;
                i++
            ) {
                expect(
                    organizationsConnectionResponse.edges[i].node.name
                ).to.eq(organizationOrderedByNameAsc[i].organization_name)
            }
        })

        it('works with filtering', async () => {
            const organizationsOrderedByNameAsc = [
                ...organizationsList,
            ].sort((a, b) =>
                a.organization_name!.localeCompare(b.organization_name!)
            )
            const filter: IEntityFilter = {
                name: {
                    operator: 'neq',
                    value: organizationsOrderedByNameAsc[0].organization_name!,
                },
            }

            const organizationsConnectionResponse = await organizationsConnection(
                testClient,
                direction,
                { count: 3 },
                { authorization: getAdminAuthToken() },
                filter,
                {
                    field: 'name',
                    order: 'ASC',
                }
            )

            for (
                let i = 0;
                i < organizationsConnectionResponse.edges.length;
                i++
            ) {
                expect(
                    organizationsConnectionResponse.edges[i].node.name
                ).to.eq(organizationsOrderedByNameAsc[i + 1].organization_name)
            }
        })
    })

    context('id filtering', () => {
        beforeEach(async () => {
            organizationsList = await Organization.save(createOrganizations(3))
        })

        it('supports `eq` operator', async () => {
            const organizationsConnectionResponse = await organizationsConnectionNodes(
                testClient,
                { authorization: getAdminAuthToken() },
                {
                    id: {
                        operator: 'eq',
                        value: organizationsList[0].organization_id,
                    },
                }
            )

            expect(
                organizationsConnectionResponse.edges.map((edge) => edge.node)
            ).to.deep.equal([
                mapOrganizationToOrganizationConnectionNode(
                    organizationsList[0]
                ),
            ])
        })

        it('supports `neq` operator', async () => {
            const organizationsConnectionResponse = await organizationsConnectionNodes(
                testClient,
                { authorization: getAdminAuthToken() },
                {
                    id: {
                        operator: 'neq',
                        value: organizationsList[0].organization_id,
                    },
                }
            )

            expect(
                organizationsConnectionResponse.edges.map((edge) => edge.node)
            ).to.deep.equalInAnyOrder(
                organizationsList
                    .slice(1)
                    .map(mapOrganizationToOrganizationConnectionNode)
            )
        })
    })

    context('shortCode filtering', () => {
        beforeEach(async () => {
            organizationsList = []

            // create 3 organizations
            for (let i = 0; i < 3; i++) {
                const organization = createOrganization()
                organization.shortCode = `ORG0${i}`
                organizationsList.push(organization)
            }

            await connection.manager.save(organizationsList)
        })

        it('supports `contains` (case insensitive)', async () => {
            const filter: IEntityFilter = {
                shortCode: {
                    operator: 'contains',
                    caseInsensitive: true,
                    value: 'org',
                },
            }
            const directionArgs = {
                count: 3,
            }
            const organizationsConnectionResponse = await organizationsConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() },
                filter
            )

            expect(organizationsConnectionResponse?.totalCount).to.eql(3)
            expect(organizationsConnectionResponse?.edges.length).to.equal(3)
            expect(organizationsConnectionResponse?.pageInfo.hasNextPage).to.be
                .false
            expect(organizationsConnectionResponse?.pageInfo.hasPreviousPage).to
                .be.false
        })

        it('supports `contains` (case sensitive)', async () => {
            const filter: IEntityFilter = {
                shortCode: {
                    operator: 'contains',
                    caseInsensitive: false,
                    value: 'org',
                },
            }
            const directionArgs = {
                count: 3,
            }
            const organizationsConnectionResponse = await organizationsConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() },
                filter
            )

            expect(organizationsConnectionResponse?.totalCount).to.eql(0)
            expect(organizationsConnectionResponse?.edges.length).to.equal(0)
            expect(organizationsConnectionResponse?.pageInfo.hasNextPage).to.be
                .false
            expect(organizationsConnectionResponse?.pageInfo.hasPreviousPage).to
                .be.false
        })

        it('supports `eq` (case insensitive)', async () => {
            const filter: IEntityFilter = {
                shortCode: {
                    operator: 'eq',
                    caseInsensitive: true,
                    value: 'org01',
                },
            }
            const directionArgs = {
                count: 3,
            }
            const organizationsConnectionResponse = await organizationsConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() },
                filter
            )

            expect(organizationsConnectionResponse?.totalCount).to.eql(1)
            expect(organizationsConnectionResponse?.edges.length).to.equal(1)
            expect(organizationsConnectionResponse?.pageInfo.hasNextPage).to.be
                .false
            expect(organizationsConnectionResponse?.pageInfo.hasPreviousPage).to
                .be.false
        })

        it('supports `eq` (case sensitive)', async () => {
            const filter: IEntityFilter = {
                shortCode: {
                    operator: 'eq',
                    caseInsensitive: false,
                    value: 'org01',
                },
            }
            const directionArgs = {
                count: 3,
            }
            const organizationsConnectionResponse = await organizationsConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() },
                filter
            )

            expect(organizationsConnectionResponse?.totalCount).to.eql(0)
            expect(organizationsConnectionResponse?.edges.length).to.equal(0)
            expect(organizationsConnectionResponse?.pageInfo.hasNextPage).to.be
                .false
            expect(organizationsConnectionResponse?.pageInfo.hasPreviousPage).to
                .be.false
        })
    })

    context('status filtering', () => {
        beforeEach(async () => {
            organizationsList = []

            // create 3 organizations
            for (let i = 0; i < 3; i++) {
                const organization = createOrganization()
                organization.status = Status.ACTIVE
                organizationsList.push(organization)
            }

            await connection.manager.save(organizationsList)

            // change status for first organization
            organizationsList[0].status = Status.INACTIVE
            await connection.manager.save(organizationsList.slice(0, 2))
        })

        it('filters on status', async () => {
            const organizationsConnectionResponse = await organizationsConnectionNodes(
                testClient,
                { authorization: getAdminAuthToken() },
                {
                    status: {
                        operator: 'eq',
                        value: Status.INACTIVE,
                    },
                }
            )

            expect(
                organizationsConnectionResponse.edges.map((edge) => edge.node)
            ).to.deep.equal([
                mapOrganizationToOrganizationConnectionNode(
                    organizationsList[0]
                ),
            ])
        })
    })

    context('phone filtering', () => {
        beforeEach(async () => {
            organizationsList = []

            // create 5 organizations
            for (let i = 0; i < 5; i++) {
                const organization = createOrganization()
                organization.phone = '000000000'
                organizationsList.push(organization)
            }

            await connection.manager.save(organizationsList)

            // sort organizations by id
            organizationsList.sort((a, b) =>
                a.organization_id > b.organization_id ? 1 : -1
            )

            // add phone number to 2 organizations
            organizationsList[0].phone = '123456789'
            organizationsList[1].phone = '456789123'
            await connection.manager.save(organizationsList.slice(0, 2))
        })

        it('filters on phone', async () => {
            const filter: IEntityFilter = {
                phone: {
                    operator: 'contains',
                    caseInsensitive: true,
                    value: '123',
                },
            }
            const directionArgs = {
                count: 3,
            }
            const organizationsConnectionResponse = await organizationsConnection(
                testClient,
                direction,
                directionArgs,
                { authorization: getAdminAuthToken() },
                filter
            )
            expect(organizationsConnectionResponse?.totalCount).to.eql(2)
            expect(organizationsConnectionResponse?.edges.length).to.equal(2)
            expect(organizationsConnectionResponse?.edges[0].node.id).to.equal(
                organizationsList[0].organization_id
            )
            expect(organizationsConnectionResponse?.edges[1].node.id).to.equal(
                organizationsList[1].organization_id
            )

            expect(organizationsConnectionResponse?.pageInfo.hasNextPage).to.be
                .false
            expect(organizationsConnectionResponse?.pageInfo.hasPreviousPage).to
                .be.false
        })
    })

    context('ownerUserId filtering', () => {
        let organization: Organization
        let anotherOrganization: Organization
        let user: User
        let anotherUser: User

        beforeEach(async () => {
            // create an user then add to an organization
            organization = await Organization.save(createOrganization())
            user = await User.save(createUser())
            await OrganizationMembership.save(
                createOrganizationMembership({
                    user,
                    organization,
                })
            )
            await OrganizationOwnership.save(
                createOrganizationOwnership({
                    user,
                    organization,
                })
            )

            // create another user then add to another organization
            anotherOrganization = await Organization.save(createOrganization())
            anotherUser = await User.save(createUser())
            await OrganizationMembership.save(
                createOrganizationMembership({
                    user: anotherUser,
                    organization: anotherOrganization,
                })
            )
            await OrganizationOwnership.save(
                createOrganizationOwnership({
                    user: anotherUser,
                    organization: anotherOrganization,
                })
            )
        })

        it('returns only organizations that has owner user ID same with filter value', async () => {
            const organizationsConnectionResponse = await organizationsConnectionNodes(
                testClient,
                { authorization: getAdminAuthToken() },
                {
                    ownerUserId: {
                        operator: 'eq',
                        value: anotherUser.user_id,
                    },
                }
            )

            expect(organizationsConnectionResponse?.edges.length).to.equal(1)
            expect(
                organizationsConnectionResponse.edges[0].node.id
            ).to.deep.equal(anotherOrganization.organization_id)
        })
    })

    context('when totalCount is not requested', () => {
        it('makes just one call to the database', async () => {
            connection.logger.reset()

            const directionArgs = {
                count: 3,
                cursor: convertDataToCursor({
                    id: organizationsList[3].organization_id,
                }),
            }

            await organizationsConnectionMainData(
                testClient,
                direction,
                directionArgs,
                false,
                {
                    authorization: getAdminAuthToken(),
                }
            )

            expect(connection.logger.count).to.be.eq(1)
        })
    })

    context('child connections', () => {
        const numUsersPerOrg = 10
        const numSchoolsPerOrg = 10
        let orgs: Organization[]

        beforeEach(async () => {
            orgs = [createOrganization(), createOrganization()]
            await connection.manager.save(orgs)
            for (let i = 0; i < numUsersPerOrg; i++) {
                for (const org of orgs) {
                    const user = await createUser().save()
                    await createOrganizationMembership({
                        user,
                        organization: org,
                    }).save()
                }
            }
            for (let i = 0; i < numSchoolsPerOrg; i++) {
                for (const org of orgs) {
                    await createSchool(org).save()
                }
            }
        })
        context('.organizationMembershipsConnection', () => {
            it('returns organization members', async () => {
                const usersPerOrg = await organizationsConnection(
                    testClient,
                    direction,
                    { count: 5 },
                    { authorization: getAdminAuthToken() }
                )
                expect(usersPerOrg.edges.length).to.eq(2)
                for (const orgUsers of usersPerOrg.edges) {
                    const memberships = orgUsers.node
                        .organizationMembershipsConnection!
                    expect(memberships.totalCount).to.eq(numUsersPerOrg)
                    expect(memberships.edges.length).to.eq(numUsersPerOrg)
                    for (const edge of memberships.edges) {
                        expect(edge.node.organizationId).to.eq(orgUsers.node.id)
                        expect(edge.node.organizationId).to.eq(
                            edge.node.organization?.id
                        )
                        expect(edge.node.userId).to.eq(edge.node.user?.id)
                    }
                }
            })
        })

        context('.schoolsConnection', async () => {
            it('returns school users', async () => {
                const schoolsPerOrg = await organizationsConnection(
                    testClient,
                    direction,
                    { count: 5 },
                    { authorization: getAdminAuthToken() }
                )
                expect(schoolsPerOrg.edges.length).to.eq(2)
                for (const orgUsers of schoolsPerOrg.edges) {
                    expect(orgUsers.node.schoolsConnection?.totalCount).to.eq(
                        numSchoolsPerOrg
                    )
                }
            })
            it('uses the isAdmin scope for permissions', async () => {
                // create a non-admin user and add to a school in org1
                const nonAdmin = await createNonAdminUser(testClient)
                const membership = await createOrganizationMembership({
                    user: nonAdmin,
                    organization: orgs[0],
                }).save()
                await createSchoolMembership({
                    user: nonAdmin,
                    school: (await orgs[0].schools)![0],
                }).save()

                // can't see any schools without permissions
                let schoolsPerOrg = await organizationsConnection(
                    testClient,
                    direction,
                    { count: 5 },
                    { authorization: getNonAdminAuthToken() }
                )
                expect(schoolsPerOrg.totalCount).to.eq(1)
                expect(
                    schoolsPerOrg.edges[0].node.schoolsConnection?.totalCount
                ).to.eq(0)

                // can see all other schools with required permissions
                const role = await createRole('role', orgs[0], {
                    permissions: [PermissionName.view_school_20110],
                }).save()
                membership.roles = Promise.resolve([role])
                await membership.save()
                schoolsPerOrg = await organizationsConnection(
                    testClient,
                    direction,
                    { count: 5 },
                    { authorization: getNonAdminAuthToken() }
                )
                expect(schoolsPerOrg.totalCount).to.eq(1)
                expect(
                    schoolsPerOrg.edges[0].node.schoolsConnection?.totalCount
                ).to.eq(numSchoolsPerOrg)
            })
        })

        context('.classesConnection', async () => {
            // it('returns classes for user', async () => {
            //     const schoolsPerOrg = await organizationsConnection(
            //         testClient,
            //         direction,
            //         { count: 5 },
            //         { authorization: getAdminAuthToken() }
            //     )
            //     expect(schoolsPerOrg.edges.length).to.eq(2)
            //     for (const orgUsers of schoolsPerOrg.edges) {
            //         expect(orgUsers.node.schoolsConnection?.totalCount).to.eq(
            //             numSchoolsPerOrg
            //         )
            //     }
            // })
            // it('uses the isAdmin scope for permissions', async () => {
            //     // create a non-admin user and add to a school in org1
            //     const nonAdmin = await createNonAdminUser(testClient)
            //     const membership = await createOrganizationMembership({
            //         user: nonAdmin,
            //         organization: orgs[0],
            //     }).save()
            //     await createSchoolMembership({
            //         user: nonAdmin,
            //         school: (await orgs[0].schools)![0],
            //     }).save()
            //     // can't see any schools without permissions
            //     let schoolsPerOrg = await organizationsConnection(
            //         testClient,
            //         direction,
            //         { count: 5 },
            //         { authorization: getNonAdminAuthToken() }
            //     )
            //     expect(schoolsPerOrg.totalCount).to.eq(1)
            //     expect(
            //         schoolsPerOrg.edges[0].node.schoolsConnection?.totalCount
            //     ).to.eq(0)
            //     // can see all other schools with required permissions
            //     const role = await createRole('role', orgs[0], {
            //         permissions: [PermissionName.view_school_20110],
            //     }).save()
            //     membership.roles = Promise.resolve([role])
            //     await membership.save()
            //     schoolsPerOrg = await organizationsConnection(
            //         testClient,
            //         direction,
            //         { count: 5 },
            //         { authorization: getNonAdminAuthToken() }
            //     )
            //     expect(schoolsPerOrg.totalCount).to.eq(1)
            //     expect(
            //         schoolsPerOrg.edges[0].node.schoolsConnection?.totalCount
            //     ).to.eq(numSchoolsPerOrg)
            // })
        })
        it('dataloads child connections', async () => {
            const expectedCount = 7

            const query = `
                query {
                    organizationsConnection(direction: FORWARD) {   # 1
                        edges {
                            node {
                                organizationMembershipsConnection {                   
                                    totalCount                      # 2 
                                    edges {                         # 3
                                        node {
                                            userId
                                        }
                                    }
                                }
                                schoolsConnection {
                                    totalCount                      # 4
                                    edges {                         # 5
                                        node {
                                            id
                                        }
                                    }
                                }
                                rolesConnection {
                                    totalCount                      # 6
                                    edges {                         # 7
                                        node {
                                            id
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `

            connection.logger.reset()
            await runQuery(query, testClient, {
                authorization: getAdminAuthToken(),
            })
            expect(connection.logger.count).to.be.eq(expectedCount)

            // async isAdmin directives break dataloading
            // so ensure that is not happening
            const nonAdmin = await createNonAdminUser(testClient)
            const role = await createRole('role', orgs[0], {
                permissions: [
                    PermissionName.view_users_40110,
                    PermissionName.view_school_20110,
                ],
            }).save()
            await createOrganizationMembership({
                user: nonAdmin,
                organization: orgs[0],
                roles: [role],
            }).save()

            connection.logger.reset()
            await runQuery(query, testClient, {
                authorization: getNonAdminAuthToken(),
            })
            expect(connection.logger.count).to.be.eq(
                expectedCount + 2,
                'two extra for permission checks (org and school)'
            )
        })
    })
})
