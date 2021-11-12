import { expect, use } from 'chai'
import {
    Brackets,
    Connection,
    createQueryBuilder,
    SelectQueryBuilder,
} from 'typeorm'
import {
    ApolloServerTestClient,
    createTestClient,
} from '../../utils/createTestClient'
import { createTestConnection } from '../../utils/testConnection'
import { createServer } from '../../../src/utils/createServer'
import { createAdminUser, createNonAdminUser } from '../../utils/testEntities'
import {
    generateToken,
    getAdminAuthToken,
    getNonAdminAuthToken,
} from '../../utils/testConfig'
import {
    ageRangesConnection,
    categoriesConnection,
    classesConnection,
    getAllOrganizations,
    gradesConnection,
    permissionsConnection,
    schoolsConnection,
    subcategoriesConnection,
    userConnection,
} from '../../utils/operations/modelOps'
import {
    createOrganizationAndValidate,
    addOrganizationToUserAndValidate,
    addSchoolToUser,
    userToPayload,
} from '../../utils/operations/userOps'
import { Model } from '../../../src/model'
import { User } from '../../../src/entities/user'
import { Organization } from '../../../src/entities/organization'
import chaiAsPromised from 'chai-as-promised'
import { addRoleToOrganizationMembership } from '../../utils/operations/organizationMembershipOps'
import { grantPermission } from '../../utils/operations/roleOps'
import { PermissionName } from '../../../src/permissions/permissionNames'
import { Role } from '../../../src/entities/role'
import { School } from '../../../src/entities/school'
import { createRole } from '../../factories/role.factory'
import { createSchool } from '../../factories/school.factory'
import { createOrganization } from '../../factories/organization.factory'
import { createUser } from '../../factories/user.factory'
import { createClass } from '../../factories/class.factory'
import { Class } from '../../../src/entities/class'
import { pick } from 'lodash'
import { createOrganizationMembership } from '../../factories/organizationMembership.factory'
import { ClassConnectionNode } from '../../../src/types/graphQL/class'
import { OrganizationMembership } from '../../../src/entities/organizationMembership'
import { createSchoolMembership } from '../../factories/schoolMembership.factory'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { Permission } from '../../../src/entities/permission'
import {
    createEntityScope,
    nonAdminOrganizationScope,
    nonAdminSchoolScope,
} from '../../../src/directives/isAdmin'
import { UserPermissions } from '../../../src/permissions/userPermissions'
import { Subcategory } from '../../../src/entities/subcategory'
import { createSubcategory } from '../../factories/subcategory.factory'
import GradesInitializer from '../../../src/initializers/grades'
import { Grade } from '../../../src/entities/grade'
import { createGrade } from '../../factories/grade.factory'
import { AgeRange } from '../../../src/entities/ageRange'
import { createAgeRange } from '../../factories/ageRange.factory'
import { Category } from '../../../src/entities/category'
import { createCategory } from '../../factories/category.factory'
import { Context } from '../../../src/main'
import { createContextLazyLoaders } from '../../../src/loaders/setup'
import { SchoolMembership } from '../../../src/entities/schoolMembership'

use(chaiAsPromised)
use(deepEqualInAnyOrder)

describe('isAdmin', () => {
    let connection: Connection
    let testClient: ApolloServerTestClient

    before(async () => {
        connection = await createTestConnection()
        const server = await createServer(new Model(connection))
        testClient = await createTestClient(server)
    })

    after(async () => {
        await connection?.close()
    })

    describe('organizations', () => {
        let user: User
        let organization: Organization

        beforeEach(async () => {
            user = await createAdminUser(testClient)
            organization = await createOrganizationAndValidate(
                testClient,
                user.user_id
            )
        })

        context('when user is not logged in', () => {
            it('fails authentication', async () => {
                const gqlResult = getAllOrganizations(testClient, {
                    authorization: undefined,
                })

                await expect(gqlResult).to.be.rejectedWith(
                    Error,
                    'Context creation failed: No authentication token'
                )
            })
        })

        context('when user is logged in', () => {
            const orgInfo = (org: Organization) => {
                return org.organization_id
            }

            let noMember: User
            let otherOrganization: Organization

            beforeEach(async () => {
                const otherUser = await createNonAdminUser(testClient)
                noMember = await createUser().save()
                otherOrganization = await createOrganizationAndValidate(
                    testClient,
                    otherUser.user_id,
                    "Billy's Org"
                )
            })

            context('and the user is an admin', () => {
                it('returns all the organizations', async () => {
                    const gqlOrgs = await getAllOrganizations(testClient, {
                        authorization: getAdminAuthToken(),
                    })

                    expect(gqlOrgs.map(orgInfo)).to.deep.eq([
                        organization.organization_id,
                        otherOrganization.organization_id,
                    ])
                })
            })

            context('and the user is not an admin', () => {
                it('returns only the organizations it belongs to', async () => {
                    const gqlOrgs = await getAllOrganizations(testClient, {
                        authorization: getNonAdminAuthToken(),
                    })

                    expect(gqlOrgs.map(orgInfo)).to.deep.eq([
                        otherOrganization.organization_id,
                    ])
                })
            })

            context('and the user does not belong to any organization', () => {
                it('has not access to any organization', async () => {
                    const gqlOrgs = await getAllOrganizations(testClient, {
                        authorization: generateToken(userToPayload(noMember)),
                    })

                    expect(gqlOrgs.map(orgInfo)).to.deep.eq([])
                })
            })
        })

        context('nonAdminOrganizationScope', async () => {
            let clientUser: User
            let clientUserOrg: Organization
            let otherUserOrg: Organization
            let bothUsersOrg: Organization
            let permissions: UserPermissions
            let memberships: Map<User, Organization[]>
            let otherUser: User
            let scope: SelectQueryBuilder<Organization>

            beforeEach(async () => {
                clientUser = await createUser().save()
                otherUser = await createUser().save()
                clientUserOrg = await createOrganization().save()
                otherUserOrg = await createOrganization().save()
                bothUsersOrg = await createOrganization().save()

                const role = await createRole(undefined, undefined, {
                    permissions: [
                        PermissionName.create_an_organization_account_1,
                    ],
                }).save()

                memberships = new Map([
                    [clientUser, [clientUserOrg, bothUsersOrg]],
                    [otherUser, [otherUserOrg, bothUsersOrg]],
                ])

                for (const [user, organizations] of memberships) {
                    for (const organization of organizations) {
                        await createOrganizationMembership({
                            user,
                            organization,
                            roles: [role],
                        }).save()
                    }
                }

                const token = { id: clientUser.user_id }
                permissions = new UserPermissions(token)

                scope = createQueryBuilder(Organization)
                await nonAdminOrganizationScope(scope, permissions)
            })

            it('limits scope to a users organizations', async () => {
                const orgs = await scope.select('Organization').getMany()

                expect(
                    orgs.map((org) => org.organization_id)
                ).deep.equalInAnyOrder(
                    memberships
                        .get(clientUser)!
                        .map((org) => org.organization_id)
                )
            })

            // use case for this is organizationConnection child on usersConnection
            it('when filtering by another user, shows intersection of organizations both users belong to', async () => {
                scope.select('Organization')
                scope.innerJoin(
                    OrganizationMembership,
                    'OrganizationMembership',
                    'Organization.organization_id = OrganizationMembership.organizationOrganizationId'
                )

                // if nonAdminOrganizationScope joined to OrganizationMembership itself
                // then it would now be filtering on 2 mutually exclusive conditions
                scope.andWhere('OrganizationMembership.userUserId = :userId', {
                    userId: otherUser.user_id,
                })

                const orgs = await scope.getMany()

                expect(
                    orgs.map((org) => org.organization_id)
                ).deep.equalInAnyOrder([bothUsersOrg.organization_id])
            })
        })
    })

    describe('users', async () => {
        const direction = 'FORWARD'
        let usersList: User[] = []
        let roleList: Role[] = []
        let organizations: Organization[] = []
        let schools: School[] = []

        beforeEach(async () => {
            usersList = []
            roleList = []
            organizations = []
            schools = []

            const superAdmin = await createAdminUser(testClient)

            // create two orgs and two schools
            for (let i = 0; i < 2; i++) {
                const org = createOrganization(superAdmin)
                await connection.manager.save(org)
                organizations.push(org)
                const role = createRole('role ' + i, org)
                await connection.manager.save(role)
                roleList.push(role)
                const school = createSchool(org)
                await connection.manager.save(school)
                schools.push(school)
            }
            // create 10 users
            for (let i = 0; i < 10; i++) {
                usersList.push(createUser())
            }
            //sort users by userId
            await connection.manager.save(usersList)
            // add organizations and schools to users

            for (const user of usersList) {
                for (let i = 0; i < 2; i++) {
                    await addOrganizationToUserAndValidate(
                        testClient,
                        user.user_id,
                        organizations[i].organization_id,
                        getAdminAuthToken()
                    )
                    await addRoleToOrganizationMembership(
                        testClient,
                        user.user_id,
                        organizations[i].organization_id,
                        roleList[i].role_id,
                        { authorization: getAdminAuthToken() }
                    )
                    await addSchoolToUser(
                        testClient,
                        user.user_id,
                        schools[i].school_id,
                        { authorization: getAdminAuthToken() }
                    )
                }
            }
        })

        context('super admin', () => {
            it('can view all users', async () => {
                const usersConnection = await userConnection(
                    testClient,
                    direction,
                    { count: 30 },
                    { authorization: getAdminAuthToken() }
                )

                expect(usersConnection.totalCount).to.eq(11)
                expect(usersConnection.edges.length).to.eq(11)
            })
        })
        context('non admin', () => {
            it('no permission needed to view my users', async () => {
                const user = await createNonAdminUser(testClient)
                const user2 = createUser()
                user2.email = user.email
                await connection.manager.save([user2])

                await addOrganizationToUserAndValidate(
                    testClient,
                    user.user_id,
                    organizations[0].organization_id,
                    getAdminAuthToken()
                )
                await addRoleToOrganizationMembership(
                    testClient,
                    user.user_id,
                    organizations[0].organization_id,
                    roleList[0].role_id,
                    { authorization: getAdminAuthToken() }
                )

                const usersConnection = await userConnection(
                    testClient,
                    direction,
                    { count: 10 },
                    { authorization: getNonAdminAuthToken() }
                )

                expect(usersConnection.totalCount).to.eq(2)
                expect(usersConnection.edges.length).to.eq(2)
            })

            it('requires view_users_40110 permission to view org users', async () => {
                const user = await createNonAdminUser(testClient)
                const token = getNonAdminAuthToken()
                await addOrganizationToUserAndValidate(
                    testClient,
                    user.user_id,
                    organizations[0].organization_id,
                    getAdminAuthToken()
                )
                await addRoleToOrganizationMembership(
                    testClient,
                    user.user_id,
                    organizations[0].organization_id,
                    roleList[0].role_id,
                    { authorization: getAdminAuthToken() }
                )

                let usersConnection = await userConnection(
                    testClient,
                    direction,
                    { count: 3 },
                    { authorization: token }
                )

                // can view my user only`
                expect(usersConnection.totalCount).to.eq(1)
                expect(usersConnection.edges.length).to.eq(1)

                await grantPermission(
                    testClient,
                    roleList[0].role_id,
                    PermissionName.view_users_40110,
                    { authorization: getAdminAuthToken() }
                )

                usersConnection = await userConnection(
                    testClient,
                    direction,
                    { count: 3 },
                    { authorization: token }
                )

                expect(usersConnection.totalCount).to.eq(11)
            })

            context('with view_my_class_users_40112', () => {
                let token: string
                let user: User

                const makeClass = async (teachers: User[], students: User[]) =>
                    createClass([schools[0]], organizations[0], {
                        teachers,
                        students,
                    }).save()

                beforeEach(async () => {
                    user = await createNonAdminUser(testClient)
                    token = getNonAdminAuthToken()
                    await addOrganizationToUserAndValidate(
                        testClient,
                        user.user_id,
                        organizations[0].organization_id,
                        getAdminAuthToken()
                    )

                    await addRoleToOrganizationMembership(
                        testClient,
                        user.user_id,
                        organizations[0].organization_id,
                        roleList[0].role_id,
                        { authorization: getAdminAuthToken() }
                    )

                    await grantPermission(
                        testClient,
                        roleList[0].role_id,
                        PermissionName.view_my_class_users_40112,
                        { authorization: getAdminAuthToken() }
                    )
                })

                it('can see themselves in a class', async () => {
                    const teacher = user
                    await makeClass([teacher], [])

                    const usersConnection = await userConnection(
                        testClient,
                        direction,
                        { count: 30 },
                        { authorization: token }
                    )

                    expect(
                        usersConnection.edges.map((edge) => edge.node.id)
                    ).to.have.same.members([teacher.user_id])
                })

                it('can see other teachers in a class', async () => {
                    const teachers = [user, usersList[0]]
                    await makeClass(teachers, [])

                    const usersConnection = await userConnection(
                        testClient,
                        direction,
                        { count: 30 },
                        { authorization: token }
                    )

                    expect(
                        usersConnection.edges.map((edge) => edge.node.id)
                    ).to.have.same.members(teachers.map((t) => t.user_id))
                })

                it('can see students from multiple classes', async () => {
                    const teacher = user
                    const student1 = usersList[0]
                    await makeClass([teacher], [student1])
                    const student2 = usersList[1]
                    await makeClass([teacher], [student2])

                    const usersConnection = await userConnection(
                        testClient,
                        direction,
                        { count: 30 },
                        { authorization: token }
                    )

                    expect(
                        usersConnection.edges.map((edge) => edge.node.id)
                    ).to.have.same.members([
                        teacher.user_id,
                        student1.user_id,
                        student2.user_id,
                    ])
                })

                it('students in multiple classes are not duplicated', async () => {
                    const teacher = user
                    const student = usersList[0]

                    await makeClass([teacher], [student])
                    await makeClass([teacher], [student])

                    const usersConnection = await userConnection(
                        testClient,
                        direction,
                        { count: 30 },
                        { authorization: token }
                    )

                    expect(
                        usersConnection.edges.map((edge) => edge.node.id)
                    ).to.have.same.members([teacher.user_id, student.user_id])
                })

                it('teachers in multiple classes are not duplicated', async () => {
                    const teacher = user
                    await makeClass([teacher], [])
                    await makeClass([teacher], [])

                    const usersConnection = await userConnection(
                        testClient,
                        direction,
                        { count: 30 },
                        { authorization: token }
                    )

                    expect(
                        usersConnection.edges.map((edge) => edge.node.id)
                    ).to.have.same.members([teacher.user_id])
                })

                it("can't see students from classes they don't teach", async () => {
                    const student = usersList[0]
                    await makeClass([], [student])

                    const usersConnection = await userConnection(
                        testClient,
                        direction,
                        { count: 30 },
                        { authorization: token }
                    )
                    expect(
                        usersConnection.edges.map((edge) => edge.node.id)
                    ).to.have.same.members([user.user_id])
                })
            })

            it('requires view_my_school_users_40111 to view school users', async () => {
                const user = await createNonAdminUser(testClient)
                const token = getNonAdminAuthToken()
                await addOrganizationToUserAndValidate(
                    testClient,
                    user.user_id,
                    organizations[0].organization_id,
                    getAdminAuthToken()
                )
                await addSchoolToUser(
                    testClient,
                    user.user_id,
                    schools[0].school_id,
                    { authorization: getAdminAuthToken() }
                )

                await addRoleToOrganizationMembership(
                    testClient,
                    user.user_id,
                    organizations[0].organization_id,
                    roleList[0].role_id,
                    { authorization: getAdminAuthToken() }
                )

                let usersConnection = await userConnection(
                    testClient,
                    direction,
                    { count: 3 },
                    { authorization: token }
                )

                // can view my user only
                expect(usersConnection.totalCount).to.eq(1)
                expect(usersConnection.edges.length).to.eq(1)

                await grantPermission(
                    testClient,
                    roleList[0].role_id,
                    PermissionName.view_my_school_users_40111,
                    { authorization: getAdminAuthToken() }
                )

                usersConnection = await userConnection(
                    testClient,
                    direction,
                    { count: 30 },
                    { authorization: token }
                )

                expect(usersConnection.totalCount).to.eq(11)
            })

            it("doesn't show users from other orgs", async () => {
                const user = await createNonAdminUser(testClient)
                const token = getNonAdminAuthToken()
                await addOrganizationToUserAndValidate(
                    testClient,
                    user.user_id,
                    organizations[0].organization_id,
                    getAdminAuthToken()
                )
                await addRoleToOrganizationMembership(
                    testClient,
                    user.user_id,
                    organizations[0].organization_id,
                    roleList[0].role_id,
                    { authorization: getAdminAuthToken() }
                )

                await grantPermission(
                    testClient,
                    roleList[0].role_id,
                    PermissionName.view_users_40110,
                    { authorization: getAdminAuthToken() }
                )

                // add a new user to a different org
                const newUser = createUser()

                await connection.manager.save([newUser])
                await addOrganizationToUserAndValidate(
                    testClient,
                    newUser.user_id,
                    organizations[1].organization_id,
                    getAdminAuthToken()
                )

                const usersConnection = await userConnection(
                    testClient,
                    direction,
                    { count: 3 },
                    { authorization: token }
                )

                expect(usersConnection.totalCount).to.eq(11)
            })

            it("doesn't show users from other schools", async () => {
                const user = await createNonAdminUser(testClient)
                const token = getNonAdminAuthToken()
                await addOrganizationToUserAndValidate(
                    testClient,
                    user.user_id,
                    organizations[0].organization_id,
                    getAdminAuthToken()
                )
                await addSchoolToUser(
                    testClient,
                    user.user_id,
                    schools[0].school_id,
                    { authorization: getAdminAuthToken() }
                )

                await addRoleToOrganizationMembership(
                    testClient,
                    user.user_id,
                    organizations[0].organization_id,
                    roleList[0].role_id,
                    { authorization: getAdminAuthToken() }
                )

                await grantPermission(
                    testClient,
                    roleList[0].role_id,
                    PermissionName.view_my_school_users_40111,
                    { authorization: getAdminAuthToken() }
                )

                // add a new user to a school in a different org
                const newUser = createUser()
                await connection.manager.save([newUser])
                await addSchoolToUser(
                    testClient,
                    newUser.user_id,
                    schools[1].school_id,
                    { authorization: getAdminAuthToken() }
                )

                // add the user to a different school in the same org
                const school = createSchool(organizations[0])
                await connection.manager.save(school)
                await addSchoolToUser(
                    testClient,
                    newUser.user_id,
                    school.school_id,
                    { authorization: getAdminAuthToken() }
                )

                // add another user to same org, without school
                const anotherUser = createUser()
                await connection.manager.save([anotherUser])
                await addOrganizationToUserAndValidate(
                    testClient,
                    anotherUser.user_id,
                    organizations[0].organization_id,
                    getAdminAuthToken()
                )

                const usersConnection = await userConnection(
                    testClient,
                    direction,
                    { count: 3 },
                    { authorization: token }
                )

                expect(usersConnection.totalCount).to.eq(11)
            })
        })
    })

    describe('classes', () => {
        type SimplifiedClassConnectionNode = Pick<
            ClassConnectionNode,
            'id' | 'name' | 'status'
        >
        let user: User
        let token: string
        let organizations: Organization[]
        let allClasses: SimplifiedClassConnectionNode[]
        let classesForOrganization: {
            [key: string]: SimplifiedClassConnectionNode[]
        }

        const queryVisibleClasses = async (token: string) => {
            const response = await classesConnection(
                testClient,
                'FORWARD',
                {},
                { authorization: token }
            )
            return response.edges
                .map((edge) => edge.node)
                .map((node) => pick(node, ['id', 'name', 'status']))
        }

        const grantPermissionFactory = async ({
            user,
            organization,
            permissions,
        }: {
            user: User
            organization: Organization
            permissions: PermissionName | PermissionName[]
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
                .add(permissions)
        }

        beforeEach(async () => {
            organizations = await Organization.save([
                createOrganization(),
                createOrganization(),
                createOrganization(),
            ])
            allClasses = (
                await Class.save([
                    createClass([], organizations[0]),
                    createClass([], organizations[0]),
                    createClass([], organizations[1]),
                    createClass([], organizations[2]),
                ])
            ).map((cls) => {
                return {
                    id: cls.class_id,
                    name: cls.class_name,
                    status: cls.status,
                }
            })
            classesForOrganization = {
                [organizations[0].organization_id]: allClasses.slice(0, 2),
                [organizations[1].organization_id]: [allClasses[2]],
                [organizations[2].organization_id]: [allClasses[3]],
            }
        })

        context('admin', () => {
            beforeEach(async () => {
                user = await createAdminUser(testClient)
                token = generateToken(userToPayload(user))

                await createOrganizationMembership({
                    user,
                    organization: organizations[0],
                }).save()
            })

            it('allows access to all classes across all organizations, regardless of membership and permissions', async () => {
                const visibleClasses = await queryVisibleClasses(token)
                expect(visibleClasses).to.deep.equalInAnyOrder(allClasses)
            })
        })
        context('non-admin', () => {
            let school: School
            let classAssignedToSchool: SimplifiedClassConnectionNode
            let organizationWithMembership: Organization
            beforeEach(async () => {
                user = await createUser().save()
                token = generateToken(userToPayload(user))

                organizationWithMembership = organizations[0]

                await createOrganizationMembership({
                    user,
                    organization: organizationWithMembership,
                }).save()

                school = await createSchool(organizationWithMembership).save()

                classAssignedToSchool = allClasses[0]

                await createSchoolMembership({ user, school }).save()

                await School.createQueryBuilder()
                    .relation('classes')
                    .of(school)
                    .add(classAssignedToSchool.id)
            })

            context('view_classes_20114', () => {
                beforeEach(async () => {
                    await grantPermissionFactory({
                        user,
                        permissions: PermissionName.view_classes_20114,
                        organization: organizationWithMembership,
                    })
                })

                it('shows all classes in the Organization they belong to', async () => {
                    const visibleClasses = await queryVisibleClasses(token)
                    expect(visibleClasses).to.deep.equalInAnyOrder(
                        classesForOrganization[
                            organizationWithMembership.organization_id
                        ]
                    )
                })
            })

            context('view_school_classes_20117', () => {
                beforeEach(async () => {
                    await grantPermissionFactory({
                        user,
                        permissions: PermissionName.view_school_classes_20117,
                        organization: organizationWithMembership,
                    })
                })

                it('shows all classes in the Schools they belong to', async () => {
                    const visibleClasses = await queryVisibleClasses(token)
                    expect(visibleClasses).to.deep.equal([
                        classAssignedToSchool,
                    ])
                })
            })

            context('view_classes_20114 AND view_school_classes_20117', () => {
                context('in the same organization', () => {
                    beforeEach(async () => {
                        await grantPermissionFactory({
                            user,
                            permissions: [
                                PermissionName.view_classes_20114,
                                PermissionName.view_school_classes_20117,
                            ],
                            organization: organizationWithMembership,
                        })
                    })
                    it('shows all classes in the Organization', async () => {
                        const visibleClasses = await queryVisibleClasses(token)
                        expect(visibleClasses).to.deep.equalInAnyOrder(
                            classesForOrganization[
                                organizationWithMembership.organization_id
                            ]
                        )
                    })
                })

                context('in different organizations', () => {
                    let otherOrganizationWithMembership: Organization
                    beforeEach(async () => {
                        otherOrganizationWithMembership = organizations[1]
                        await createOrganizationMembership({
                            user,
                            organization: otherOrganizationWithMembership,
                        }).save()

                        await grantPermissionFactory({
                            user,
                            permissions: [PermissionName.view_classes_20114],
                            organization: otherOrganizationWithMembership,
                        })

                        await grantPermissionFactory({
                            user,
                            permissions: [
                                PermissionName.view_school_classes_20117,
                            ],
                            organization: organizationWithMembership,
                        })
                    })

                    it('shows classes across both organizations', async () => {
                        const visibleClasses = await queryVisibleClasses(token)
                        expect(visibleClasses).to.deep.equalInAnyOrder([
                            classAssignedToSchool,
                            ...classesForOrganization[
                                otherOrganizationWithMembership.organization_id
                            ],
                        ])
                    })
                })
            })
        })
    })

    describe('permissions', () => {
        let adminUser: User
        let memberUser: User
        let noMemberUser: User
        let organization: Organization
        let allPermissionsCount: number
        let roleRelatedPermissionsCount: number

        const queryVisiblePermissions = async (token?: string) => {
            const response = await permissionsConnection(
                testClient,
                'FORWARD',
                true,
                {},
                { authorization: token }
            )
            return response
        }

        beforeEach(async () => {
            adminUser = await createAdminUser(testClient)
            memberUser = await createUser().save()
            noMemberUser = await createUser().save()

            organization = await createOrganization(memberUser).save()

            await connection.manager.save(
                createOrganizationMembership({
                    user: memberUser,
                    organization,
                })
            )

            allPermissionsCount = await Permission.count()
            roleRelatedPermissionsCount = await Permission.createQueryBuilder(
                'Permission'
            )
                .innerJoin('Permission.roles', 'Role')
                .getCount()
        })

        context('when user is not logged in', () => {
            it('fails authentication', async () => {
                const gqlResult = queryVisiblePermissions()

                await expect(gqlResult).to.be.rejectedWith(
                    Error,
                    'Context creation failed: No authentication token'
                )
            })
        })

        context('when user is logged in', () => {
            context('and user is admin', () => {
                it('allows access to all the permissions', async () => {
                    const token = generateToken(userToPayload(adminUser))
                    const visiblePermissions = await queryVisiblePermissions(
                        token
                    )
                    expect(visiblePermissions.totalCount).to.eql(
                        allPermissionsCount
                    )
                })
            })

            context('and user is organization member', () => {
                it('allows access just to role related permissions', async () => {
                    const token = generateToken(userToPayload(memberUser))
                    const visiblePermissions = await queryVisiblePermissions(
                        token
                    )
                    expect(visiblePermissions.totalCount).to.eql(
                        roleRelatedPermissionsCount
                    )
                })
            })

            context('and user is non member user', () => {
                it('deny access to any permission', async () => {
                    const token = generateToken(userToPayload(noMemberUser))
                    const visiblePermissions = await queryVisiblePermissions(
                        token
                    )
                    expect(visiblePermissions.totalCount).to.eql(0)
                })
            })
        })
    })

    describe('roles', async () => {
        let usersList: User[] = []
        let superAdmin: User
        let user: User
        let noMember: User
        let roleList: Role[] = []
        let organizations: Organization[] = []
        let userPermissions: UserPermissions
        let orgMemberships: OrganizationMembership[]

        beforeEach(async () => {
            usersList = []
            roleList = []
            organizations = []
            orgMemberships = []

            superAdmin = await createAdminUser(testClient)

            // create two orgs and one role per org
            for (let i = 0; i < 2; i++) {
                const org = await createOrganization(superAdmin).save()
                organizations.push(org)
                const role = createRole('role ' + i, org)
                await connection.manager.save(role)
                roleList.push(role)
            }

            const anotherRole = createRole('role 0b', organizations[0])
            await connection.manager.save(anotherRole)
            roleList.push(anotherRole)

            for (let i = 0; i < 10; i++) {
                usersList.push(createUser())
            }

            await connection.manager.save(usersList)

            for (let j = 0; j < 5; j++) {
                orgMemberships.push(
                    createOrganizationMembership({
                        user: usersList[j],
                        organization: organizations[0],
                        roles: [roleList[0], roleList[2]],
                    })
                )
            }

            for (let j = 5; j < usersList.length; j++) {
                orgMemberships.push(
                    createOrganizationMembership({
                        user: usersList[j],
                        organization: organizations[1],
                        roles: [roleList[1]],
                    })
                )
            }

            await OrganizationMembership.save(orgMemberships)
            noMember = await createUser().save()
        })

        context('admin', () => {
            it('can see all the existent roles', async () => {
                userPermissions = new UserPermissions({
                    id: superAdmin.user_id,
                    email: superAdmin.email || '',
                })

                const scope = (await createEntityScope({
                    permissions: userPermissions,
                    entity: 'role',
                })) as SelectQueryBuilder<Role>

                const results = await scope.getMany()
                const orgRoles = results.filter((r) => r.system_role === false)
                const systemRoles = results.filter(
                    (r) => r.system_role === true
                )

                expect(results).to.have.lengthOf(8)
                expect(orgRoles).to.have.lengthOf(3)
                expect(systemRoles).to.have.lengthOf(5)
            })
        })

        context('non admin', () => {
            it('can see its roles or the system ones', async () => {
                user = usersList[9]
                userPermissions = new UserPermissions({
                    id: user.user_id,
                    email: user.email || '',
                })

                const scope = (await createEntityScope({
                    permissions: userPermissions,
                    entity: 'role',
                })) as SelectQueryBuilder<Role>

                const results = await scope.getMany()
                const ownedRoles = results.filter(
                    (r) => r.system_role === false
                )
                const systemRoles = results.filter(
                    (r) => r.system_role === true
                )

                expect(results).to.have.lengthOf(6)
                expect(ownedRoles).to.have.lengthOf(1)
                expect(systemRoles).to.have.lengthOf(5)
            })

            it('can not see roles from other orgs', async () => {
                user = usersList[9]
                userPermissions = new UserPermissions({
                    id: user.user_id,
                    email: user.email || '',
                })

                const scope = (await createEntityScope({
                    permissions: userPermissions,
                    entity: 'role',
                })) as SelectQueryBuilder<Role>

                const results = await scope.getMany()
                const rolesFromOtherOrgs = results.find(
                    (r) => r.role_name === roleList[0].role_name
                )

                expect(rolesFromOtherOrgs).to.be.an('undefined')
            })

            it('nonAdminRoleScope works even with filter applied', async () => {
                user = usersList[0]
                userPermissions = new UserPermissions({
                    id: user.user_id,
                    email: user.email || '',
                })

                const scope = (await createEntityScope({
                    permissions: userPermissions,
                    entity: 'role',
                })) as SelectQueryBuilder<Role>

                const filteredName = roleList[2].role_name
                scope.andWhere('Role.role_name = :filteredName', {
                    filteredName,
                })

                const results = await scope.getMany()
                const ownedRoles = results.filter(
                    (r) => r.system_role === false
                )

                expect(results).to.have.lengthOf(1)
                expect(ownedRoles).to.have.lengthOf(1)
                expect(results[0].role_name).to.equal(filteredName)
            })
        })

        context('non member', () => {
            it('can just see the system ones', async () => {
                userPermissions = new UserPermissions({
                    id: noMember.user_id,
                    email: noMember.email || '',
                })

                const scope = (await createEntityScope({
                    permissions: userPermissions,
                    entity: 'role',
                })) as SelectQueryBuilder<Role>

                const results = await scope.getMany()
                const orgRoles = results.filter((r) => r.system_role === false)
                const systemRoles = results.filter(
                    (r) => r.system_role === true
                )

                expect(results).to.have.lengthOf(5)
                expect(orgRoles).to.have.lengthOf(0)
                expect(systemRoles).to.have.lengthOf(5)
            })
        })
    })

    describe('schools', () => {
        context('nonAdminSchoolScope', async () => {
            let clientUser: User
            let school1: School
            let org1: Organization
            let otherUser: User
            let school2: School
            let org2: Organization
            let school3: School
            let clientPermissions: UserPermissions
            let schoolMemberships: Map<User, School[]>
            let orgMemberships: Map<User, Organization[]>
            let scope: SelectQueryBuilder<School>

            beforeEach(async () => {
                clientUser = await createUser().save()
                otherUser = await createUser().save()
                org1 = await createOrganization().save()
                org2 = await createOrganization().save()
                school1 = await createSchool(org1, 'Scoo').save()
                school2 = await createSchool(org2, 'By').save()
                school3 = await createSchool(org1, 'Doo').save()
            })

            context(
                'client user has both view-school permissions',
                async () => {
                    beforeEach(async () => {
                        const role = await createRole(undefined, undefined, {
                            permissions: [
                                PermissionName.view_school_20110,
                                PermissionName.view_my_school_20119,
                            ],
                        }).save()

                        orgMemberships = new Map([
                            [clientUser, [org1]],
                            [otherUser, [org2]],
                        ])

                        for (const [user, orgs] of orgMemberships) {
                            for (const organization of orgs) {
                                await createOrganizationMembership({
                                    user,
                                    organization,
                                    roles: [role],
                                }).save()
                            }
                        }

                        schoolMemberships = new Map([
                            [clientUser, [school1, school3]],
                            [otherUser, [school2, school3]],
                        ])

                        for (const [user, schools] of schoolMemberships) {
                            for (const school of schools) {
                                await createSchoolMembership({
                                    user,
                                    school,
                                }).save()
                            }
                        }

                        const token = { id: clientUser.user_id }
                        clientPermissions = new UserPermissions(token)
                        scope = (await createEntityScope({
                            permissions: clientPermissions,
                            entity: 'school',
                        })) as SelectQueryBuilder<School>
                    })

                    it("limits scope to a user's schools", async () => {
                        const schools = await scope.select('School').getMany()
                        expect(
                            schools.map((school) => school.school_id)
                        ).deep.equal(
                            schoolMemberships
                                .get(clientUser)!
                                .map((school) => school.school_id)
                        )
                    })

                    // use case for this is schoolConnection child on usersConnection
                    it('when filtering by another user, shows intersection of schools both users belong to', async () => {
                        scope.select('School')
                        scope.innerJoin(
                            SchoolMembership,
                            'SchoolMembership',
                            'School.school_id = SchoolMembership.schoolSchoolId'
                        )

                        // if nonAdminSchoolScope joined to SchoolMembership itself
                        // then it would now be filtering on 2 mutually exclusive conditions
                        scope.andWhere(
                            'SchoolMembership.userUserId = :userId',
                            {
                                userId: otherUser.user_id,
                            }
                        )

                        const schools = await scope.getMany()

                        expect(
                            schools.map((school) => school.school_id)
                        ).deep.equalInAnyOrder([school3.school_id])
                    })
                }
            )

            // The rest of the contexts and tests deal with uses cases for school child connection filtering on user
            context(
                'client user has both view-school permissions in different orgs and is part of a school',
                async () => {
                    beforeEach(async () => {
                        const roleViewSchool = await createRole(
                            undefined,
                            org1,
                            {
                                permissions: [PermissionName.view_school_20110],
                            }
                        ).save()
                        const roleViewMySchool = await createRole(
                            undefined,
                            org2,
                            {
                                permissions: [
                                    PermissionName.view_my_school_20119,
                                ],
                            }
                        ).save()
                        await createOrganizationMembership({
                            user: clientUser,
                            organization: org1,
                            roles: [roleViewSchool],
                        }).save()
                        await createOrganizationMembership({
                            user: clientUser,
                            organization: org2,
                            roles: [roleViewMySchool],
                        }).save()
                        await createOrganizationMembership({
                            user: otherUser,
                            organization: org2,
                            roles: [],
                        }).save()

                        schoolMemberships = new Map([
                            [clientUser, [school1, school2]],
                            [otherUser, [school2]],
                        ])
                        for (const [user, schools] of schoolMemberships) {
                            for (const school of schools) {
                                await createSchoolMembership({
                                    user,
                                    school,
                                }).save()
                            }
                        }

                        const token = { id: clientUser.user_id }
                        clientPermissions = new UserPermissions(token)
                        scope = (await createEntityScope({
                            permissions: clientPermissions,
                            entity: 'school',
                        })) as SelectQueryBuilder<School>
                    })

                    it('when filtering by another user, shows intersection of schools both users belong to as well as schools of their orgs', async () => {
                        scope.select('School')

                        const schools = await scope.getMany()

                        expect(
                            schools.map((school) => school.school_id)
                        ).deep.equalInAnyOrder([
                            school1.school_id,
                            school2.school_id,
                            school3.school_id,
                        ])
                    })
                }
            )

            context(
                'client user has both view-school permissions in different orgs and is NOT part of a school',
                async () => {
                    beforeEach(async () => {
                        const roleViewSchool = await createRole(
                            undefined,
                            org1,
                            {
                                permissions: [PermissionName.view_school_20110],
                            }
                        ).save()
                        const roleViewMySchool = await createRole(
                            undefined,
                            org2,
                            {
                                permissions: [
                                    PermissionName.view_my_school_20119,
                                ],
                            }
                        ).save()
                        await createOrganizationMembership({
                            user: clientUser,
                            organization: org1,
                            roles: [roleViewSchool],
                        }).save()
                        await createOrganizationMembership({
                            user: clientUser,
                            organization: org2,
                            roles: [roleViewMySchool],
                        }).save()
                        await createOrganizationMembership({
                            user: otherUser,
                            organization: org2,
                            roles: [],
                        }).save()
                        await createSchoolMembership({
                            user: otherUser,
                            school: school2,
                        }).save()

                        const token = { id: clientUser.user_id }
                        clientPermissions = new UserPermissions(token)
                        scope = (await createEntityScope({
                            permissions: clientPermissions,
                            entity: 'school',
                        })) as SelectQueryBuilder<School>
                    })

                    it('when filtering by another user, only shows client org schools (view_school) and not other user school (even if view_my_school)', async () => {
                        scope.select('School')

                        const schools = await scope.getMany()

                        expect(
                            schools.map((school) => school.school_id)
                        ).deep.equalInAnyOrder([
                            school1.school_id,
                            school3.school_id,
                        ])
                    })
                }
            )

            context(
                'client user has view_my_school_20119 permission, cannot see other user schools without view_school_20110 permission',
                async () => {
                    beforeEach(async () => {
                        const role = await createRole(undefined, undefined, {
                            permissions: [PermissionName.view_my_school_20119],
                        }).save()

                        // Both client and other user are part of same org
                        // But without view_school_20110, client user should not see other user's schools
                        orgMemberships = new Map([
                            [clientUser, [org1, org2]],
                            [otherUser, [org2]],
                        ])

                        for (const [user, orgs] of orgMemberships) {
                            for (const organization of orgs) {
                                await createOrganizationMembership({
                                    user,
                                    organization,
                                    roles: [role],
                                }).save()
                            }
                        }

                        schoolMemberships = new Map([
                            [clientUser, [school1]],
                            [otherUser, [school2, school3]],
                        ])

                        for (const [user, schools] of schoolMemberships) {
                            for (const school of schools) {
                                await createSchoolMembership({
                                    user,
                                    school,
                                }).save()
                            }
                        }

                        const token = { id: clientUser.user_id }
                        clientPermissions = new UserPermissions(token)
                        scope = (await createEntityScope({
                            permissions: clientPermissions,
                            entity: 'school',
                        })) as SelectQueryBuilder<School>
                    })

                    it('when client filters by another user, only sees client school and not other user school', async () => {
                        scope.select('School')
                        scope.where(
                            new Brackets((qb) => {
                                qb.andWhere(
                                    'SchoolMembership.userUserId = :userId',
                                    {
                                        userId: otherUser.user_id,
                                    }
                                ).orWhere(
                                    'SchoolMembership.userUserId = :userId',
                                    {
                                        userId: clientUser.user_id,
                                    }
                                )
                            })
                        )

                        const schools = await scope.getMany()

                        expect(
                            schools.map((school) => school.school_id)
                        ).deep.equalInAnyOrder([school1.school_id])
                    })
                }
            )

            context(
                'client user has view_school_20110 permission only, cannot see own school in other org without view_my_school_20119',
                async () => {
                    beforeEach(async () => {
                        const role = await createRole(undefined, undefined, {
                            permissions: [PermissionName.view_school_20110],
                        }).save()

                        orgMemberships = new Map([
                            [clientUser, [org2]],
                            [otherUser, [org2]],
                        ])

                        for (const [user, orgs] of orgMemberships) {
                            for (const organization of orgs) {
                                await createOrganizationMembership({
                                    user,
                                    organization,
                                    roles: [role],
                                }).save()
                            }
                        }

                        schoolMemberships = new Map([
                            [clientUser, [school1]], // This school is in org1 which clientUser is not part of
                            [otherUser, [school2]], // This school is in org2 which clientUser is part of
                        ])

                        for (const [user, schools] of schoolMemberships) {
                            for (const school of schools) {
                                await createSchoolMembership({
                                    user,
                                    school,
                                }).save()
                            }
                        }

                        const token = { id: clientUser.user_id }
                        clientPermissions = new UserPermissions(token)
                        scope = (await createEntityScope({
                            permissions: clientPermissions,
                            entity: 'school',
                        })) as SelectQueryBuilder<School>
                    })

                    it('when client filters by another user, only sees other schools and not client school', async () => {
                        scope.select('School')

                        const schools = await scope.getMany()

                        expect(
                            schools.map((school) => school.school_id)
                        ).deep.equalInAnyOrder([school2.school_id])
                    })
                }
            )

            context(
                'client user has no view-school permissions in their orgs',
                async () => {
                    beforeEach(async () => {
                        const role = await createRole(undefined, undefined, {
                            permissions: [],
                        }).save()

                        orgMemberships = new Map([
                            [clientUser, [org1, org2]],
                            [otherUser, [org2]],
                        ])

                        for (const [user, orgs] of orgMemberships) {
                            for (const organization of orgs) {
                                await createOrganizationMembership({
                                    user,
                                    organization,
                                    roles: [role],
                                }).save()
                            }
                        }

                        schoolMemberships = new Map([
                            [clientUser, [school1, school2, school3]],
                            [otherUser, [school2]],
                        ])

                        for (const [user, schools] of schoolMemberships) {
                            for (const school of schools) {
                                await createSchoolMembership({
                                    user,
                                    school,
                                }).save()
                            }
                        }

                        const token = { id: clientUser.user_id }
                        clientPermissions = new UserPermissions(token)
                        scope = (await createEntityScope({
                            permissions: clientPermissions,
                            entity: 'school',
                        })) as SelectQueryBuilder<School>
                    })

                    it('when client filters by another user, should not see any school related to either client or other user', async () => {
                        scope.select('School')

                        const schools = await scope.getMany()

                        expect(
                            schools.map((school) => school.school_id)
                        ).deep.equal([])
                    })
                }
            )
        })
    })

    describe('subcategories', () => {
        let adminUser: User
        let memberUser: User
        let noMemberUser: User
        let organization: Organization
        let organization2: Organization
        let allSubcategoriesCount: number
        let systemSubcategoriesCount: number
        const organizationSubcategoriesCount = 10

        const queryVisiblePermissions = async (token: string) => {
            const response = await subcategoriesConnection(
                testClient,
                'FORWARD',
                {},
                true,
                { authorization: token }
            )
            return response
        }

        beforeEach(async () => {
            adminUser = await createAdminUser(testClient)
            memberUser = await createUser().save()
            noMemberUser = await createUser().save()
            organization = await createOrganization(memberUser).save()

            await Subcategory.save(
                Array.from(Array(organizationSubcategoriesCount), () =>
                    createSubcategory(organization)
                )
            )

            await Subcategory.save(
                Array.from(Array(organizationSubcategoriesCount), () =>
                    createSubcategory(organization2)
                )
            )

            await createOrganizationMembership({
                user: memberUser,
                organization,
            }).save()

            allSubcategoriesCount = await Subcategory.count()
            systemSubcategoriesCount = await Subcategory.count({
                where: { system: true },
            })
        })

        context('admin', () => {
            it('allows access to all the subcategories', async () => {
                const token = generateToken(userToPayload(adminUser))
                const visiblePermissions = await queryVisiblePermissions(token)
                expect(visiblePermissions.totalCount).to.eql(
                    allSubcategoriesCount
                )
            })
        })

        context('organization member', () => {
            it('allows access to system subcategories and owns', async () => {
                const token = generateToken(userToPayload(memberUser))
                const visiblePermissions = await queryVisiblePermissions(token)
                expect(visiblePermissions.totalCount).to.eql(
                    systemSubcategoriesCount + organizationSubcategoriesCount
                )
            })
        })

        context('no member user', () => {
            it('alows access just to system subcategories', async () => {
                const token = generateToken(userToPayload(noMemberUser))
                const visiblePermissions = await queryVisiblePermissions(token)
                expect(visiblePermissions.totalCount).to.eql(
                    systemSubcategoriesCount
                )
            })
        })
    })

    describe('grades', () => {
        let adminUser: User
        let memberUser1: User
        let noMemberUser: User
        let organization1: Organization
        let organization2: Organization
        let allGradesCount: number
        let systemGradesCount: number
        const organizationGradesCount = 6

        const queryVisibleGrades = async (token?: string) => {
            const response = await gradesConnection(
                testClient,
                'FORWARD',
                {},
                { authorization: token }
            )
            return response
        }

        beforeEach(async () => {
            // Generating system grades
            await GradesInitializer.run()
            systemGradesCount = await Grade.count()

            // Creating Users and Orgs
            adminUser = await createAdminUser(testClient)
            memberUser1 = await createUser().save()
            noMemberUser = await createUser().save()
            organization1 = await createOrganization(memberUser1).save()
            organization2 = await createOrganization().save()

            // Creating Grades for organization1
            await Grade.save(
                Array.from(Array(organizationGradesCount), () =>
                    createGrade(organization1)
                )
            )

            // Creating Grades for organization2
            await Grade.save(
                Array.from(Array(organizationGradesCount), () =>
                    createGrade(organization2)
                )
            )

            // Creating membership for memberUser1 in organization1
            await createOrganizationMembership({
                user: memberUser1,
                organization: organization1,
            }).save()

            allGradesCount = await Grade.count()
        })

        context('when user is not logged in', () => {
            it('fails authentication', async () => {
                const visibleGrades = queryVisibleGrades()

                await expect(visibleGrades).to.be.rejectedWith(
                    Error,
                    'Context creation failed: No authentication token'
                )
            })
        })

        context('when user is logged in', () => {
            context('and user is an admin', () => {
                it('should have access to all the existent grades', async () => {
                    const token = generateToken(userToPayload(adminUser))
                    const visibleGrades = await queryVisibleGrades(token)

                    expect(visibleGrades.totalCount).to.eql(allGradesCount)
                })
            })

            context('and user is an organization member', () => {
                it('should have access to the organization and system ones', async () => {
                    const token = generateToken(userToPayload(memberUser1))
                    const visibleGrades = await queryVisibleGrades(token)

                    expect(visibleGrades.totalCount).to.eql(
                        organizationGradesCount + systemGradesCount
                    )
                })
            })

            context('and user does not belongs to any organization', () => {
                it('should have access just to the system ones', async () => {
                    const token = generateToken(userToPayload(noMemberUser))
                    const visibleGrades = await queryVisibleGrades(token)

                    expect(visibleGrades.totalCount).to.eql(systemGradesCount)
                })
            })
        })
    })

    describe('subcategories', () => {
        let adminUser: User
        let memberUser: User
        let noMemberUser: User
        let organization: Organization
        let organization2: Organization
        let allSubcategoriesCount: number
        let systemSubcategoriesCount: number
        const organizationSubcategoriesCount = 10

        const queryVisibleSubcategories = async (token: string) => {
            const response = await subcategoriesConnection(
                testClient,
                'FORWARD',
                {},
                true,
                { authorization: token }
            )
            return response
        }

        beforeEach(async () => {
            adminUser = await createAdminUser(testClient)
            memberUser = await createUser().save()
            noMemberUser = await createUser().save()
            organization = await createOrganization(memberUser).save()

            await Subcategory.save(
                Array.from(Array(organizationSubcategoriesCount), () =>
                    createSubcategory(organization)
                )
            )

            await Subcategory.save(
                Array.from(Array(organizationSubcategoriesCount), () =>
                    createSubcategory(organization2)
                )
            )

            await createOrganizationMembership({
                user: memberUser,
                organization,
            }).save()

            allSubcategoriesCount = await Subcategory.count()
            systemSubcategoriesCount = await Subcategory.count({
                where: { system: true },
            })
        })

        context('admin', () => {
            it('allows access to all the subcategories', async () => {
                const token = generateToken(userToPayload(adminUser))
                const visibleSubcategories = await queryVisibleSubcategories(
                    token
                )
                expect(visibleSubcategories.totalCount).to.eql(
                    allSubcategoriesCount
                )
            })
        })

        context('organization member', () => {
            it('allows access to system subcategories and owns', async () => {
                const token = generateToken(userToPayload(memberUser))
                const visibleSubcategories = await queryVisibleSubcategories(
                    token
                )
                expect(visibleSubcategories.totalCount).to.eql(
                    systemSubcategoriesCount + organizationSubcategoriesCount
                )
            })
        })

        context('no member user', () => {
            it('alows access just to system subcategories', async () => {
                const token = generateToken(userToPayload(noMemberUser))
                const visibleSubcategories = await queryVisibleSubcategories(
                    token
                )
                expect(visibleSubcategories.totalCount).to.eql(
                    systemSubcategoriesCount
                )
            })
        })
    })

    describe('ageRanges', () => {
        let adminUser: User
        let memberUser1: User
        let noMemberUser: User
        let organization1: Organization
        let organization2: Organization
        let allAgeRangesCount: number
        let systemAgeRangesCount: number
        const organizationAgeRangesCount = 6

        const queryVisibleAgeRanges = async (token?: string) => {
            const response = await ageRangesConnection(
                testClient,
                'FORWARD',
                {},
                true,
                { authorization: token }
            )

            return response
        }

        beforeEach(async () => {
            systemAgeRangesCount = await AgeRange.count()

            // Creating Users and Orgs
            adminUser = await createAdminUser(testClient)
            memberUser1 = await createUser().save()
            noMemberUser = await createUser().save()
            organization1 = await createOrganization(memberUser1).save()
            organization2 = await createOrganization().save()

            // Creating Age Ranges for organization1
            await AgeRange.save(
                Array.from(Array(organizationAgeRangesCount), () =>
                    createAgeRange(organization1)
                )
            )

            // Creating Age Ranges for organization2
            await AgeRange.save(
                Array.from(Array(organizationAgeRangesCount), () =>
                    createAgeRange(organization2)
                )
            )

            // Creating membership for memberUser1 in organization1
            await createOrganizationMembership({
                user: memberUser1,
                organization: organization1,
            }).save()

            allAgeRangesCount = await AgeRange.count()
        })

        context('when user is not logged in', () => {
            it('fails authentication', async () => {
                const visibleAgeRanges = queryVisibleAgeRanges()

                await expect(visibleAgeRanges).to.be.rejectedWith(
                    Error,
                    'Context creation failed: No authentication token'
                )
            })
        })

        context('when user is logged in', () => {
            context('and user is an admin', () => {
                it('should have access to all the existent age ranges', async () => {
                    const token = generateToken(userToPayload(adminUser))
                    const visibleAgeRanges = await queryVisibleAgeRanges(token)

                    expect(visibleAgeRanges.totalCount).to.eql(
                        allAgeRangesCount
                    )
                })
            })

            context('and user is an organization member', () => {
                it('should have access to the organization and system ones', async () => {
                    const token = generateToken(userToPayload(memberUser1))
                    const visibleAgeRanges = await queryVisibleAgeRanges(token)

                    expect(visibleAgeRanges.totalCount).to.eql(
                        organizationAgeRangesCount + systemAgeRangesCount
                    )
                })
            })

            context('and user does not belongs to any organization', () => {
                it('should have access just to the system ones', async () => {
                    const token = generateToken(userToPayload(noMemberUser))
                    const visibleAgeRanges = await queryVisibleAgeRanges(token)

                    expect(visibleAgeRanges.totalCount).to.eql(
                        systemAgeRangesCount
                    )
                })
            })
        })
    })

    describe('categories', () => {
        let adminUser: User
        let memberUser: User
        let noMemberUser: User
        let organization: Organization
        let organization2: Organization
        let allCategoriesCount: number
        let systemCategoriesCount: number
        const organizationCategoriesCount = 10

        const queryVisibleCategories = async (token: string) => {
            const response = await categoriesConnection(
                testClient,
                'FORWARD',
                {},
                { authorization: token }
            )
            return response
        }

        beforeEach(async () => {
            adminUser = await createAdminUser(testClient)
            memberUser = await createUser().save()
            noMemberUser = await createUser().save()
            organization = await createOrganization(memberUser).save()

            await Category.save(
                Array.from(Array(organizationCategoriesCount), () =>
                    createCategory(organization)
                )
            )

            await Category.save(
                Array.from(Array(organizationCategoriesCount), () =>
                    createCategory(organization2)
                )
            )

            await createOrganizationMembership({
                user: memberUser,
                organization,
            }).save()

            allCategoriesCount = await Category.count()
            systemCategoriesCount = await Category.count({
                where: { system: true },
            })
        })

        context('admin', () => {
            it('allows access to all the categories', async () => {
                const token = generateToken(userToPayload(adminUser))
                const visibleCategories = await queryVisibleCategories(token)
                expect(visibleCategories.totalCount).to.eql(allCategoriesCount)
            })
        })

        context('organization member', () => {
            it('allows access to system categories and owns', async () => {
                const token = generateToken(userToPayload(memberUser))
                const visibleCategories = await queryVisibleCategories(token)
                expect(visibleCategories.totalCount).to.eql(
                    systemCategoriesCount + organizationCategoriesCount
                )
            })
        })

        context('no member user', () => {
            it('alows access just to system categories', async () => {
                const token = generateToken(userToPayload(noMemberUser))
                const visibleCategories = await queryVisibleCategories(token)
                expect(visibleCategories.totalCount).to.eql(
                    systemCategoriesCount
                )
            })
        })
    })

    context('schools', () => {
        let admin: User
        let orgOwner: User
        let schoolAdmin: User
        let orgMember: User
        let ownerAndSchoolAdmin: User
        let org1: Organization
        let org2: Organization
        let org3: Organization
        let org1Schools: School[] = []
        let org2Schools: School[] = []
        let org3Schools: School[] = []
        const schools: School[] = []
        let scope: SelectQueryBuilder<School>
        let adminPermissions: UserPermissions
        let orgOwnerPermissions: UserPermissions
        let schoolAdminPermissions: UserPermissions
        let ownerAndSchoolAdminPermissions: UserPermissions
        const schoolsCount = 12
        const organizationsCount = 3

        let ctx: Context

        const buildScopeAndContext = async (permissions: UserPermissions) => {
            if (!permissions.isAdmin) {
                await nonAdminSchoolScope(scope, permissions)
            }

            ctx = ({
                permissions,
                loaders: createContextLazyLoaders(permissions),
            } as unknown) as Context
        }

        const querySchools = async (token: string) => {
            const response = await schoolsConnection(
                testClient,
                'FORWARD',
                {},
                true,
                { authorization: token }
            )
            return response
        }

        beforeEach(async () => {
            scope = School.createQueryBuilder('School')

            admin = await createAdminUser(testClient)
            org1 = await createOrganization().save()
            org2 = await createOrganization().save()
            org3 = await createOrganization().save()

            // creating org1 schools
            org1Schools = await School.save(
                Array.from(Array(schoolsCount), (_, i) => {
                    const s = createSchool(org1)
                    s.school_name = `school ${i}`
                    return s
                })
            )

            // creating org2 schools
            org2Schools = await School.save(
                Array.from(Array(schoolsCount), (_, i) => {
                    const c = createSchool(org2)
                    c.school_name = `school ${i}`
                    return c
                })
            )

            // creating org3 schools
            org3Schools = await School.save(
                Array.from(Array(schoolsCount), (_, i) => {
                    const s = createSchool(org3)
                    s.school_name = `school ${i}`
                    return s
                })
            )

            schools.push(...org1Schools, ...org2Schools, ...org3Schools)

            adminPermissions = new UserPermissions(userToPayload(admin))

            // Emulating context
            await buildScopeAndContext(adminPermissions)

            orgOwner = await createUser().save()
            schoolAdmin = await createUser().save()
            orgMember = await createUser().save()
            ownerAndSchoolAdmin = await createUser().save()

            const viewAllSchoolsRoleOrg3 = await createRole(
                'View Schools',
                org3,
                {
                    permissions: [PermissionName.view_school_20110],
                }
            ).save()

            const viewAllSchoolsFromTheOrgRole = await createRole(
                'View Schools',
                org2,
                {
                    permissions: [PermissionName.view_school_20110],
                }
            ).save()

            const viewMySchoolRole = await createRole('View My School', org3, {
                permissions: [PermissionName.view_my_school_20119],
            }).save()

            // adding orgOwner to org3 with orgAdminRole
            await createOrganizationMembership({
                user: orgOwner,
                organization: org3,
                roles: [viewAllSchoolsRoleOrg3],
            }).save()

            // adding ownerAndSchoolAdmin to org2 with orgAdminRole
            await createOrganizationMembership({
                user: ownerAndSchoolAdmin,
                organization: org2,
                roles: [viewAllSchoolsFromTheOrgRole],
            }).save()

            // adding schoolAdmin to org3 with schoolAdminRole
            await createOrganizationMembership({
                user: schoolAdmin,
                organization: org3,
                roles: [viewMySchoolRole],
            }).save()

            // adding schoolAdmin to first org3School
            await createSchoolMembership({
                user: schoolAdmin,
                school: org3Schools[0],
                roles: [viewMySchoolRole],
            }).save()

            // adding ownerAndSchoolAdmin to org3 with schoolAdminRole
            await createOrganizationMembership({
                user: ownerAndSchoolAdmin,
                organization: org3,
                roles: [viewMySchoolRole],
            }).save()

            // adding ownerAndSchoolAdmin to second org3School
            await createSchoolMembership({
                user: ownerAndSchoolAdmin,
                school: org3Schools[1],
                roles: [viewMySchoolRole],
            }).save()

            // adding orgMember to org3
            await createOrganizationMembership({
                user: orgMember,
                organization: org3,
                roles: [],
            }).save()

            orgOwnerPermissions = new UserPermissions(userToPayload(orgOwner))
            schoolAdminPermissions = new UserPermissions(
                userToPayload(schoolAdmin)
            )
            ownerAndSchoolAdminPermissions = new UserPermissions(
                userToPayload(ownerAndSchoolAdmin)
            )
        })

        it('super admin should see schools from all the organizations', async () => {
            const token = generateToken(userToPayload(admin))
            const visibleSchools = await querySchools(token)
            expect(visibleSchools.totalCount).to.eql(
                schoolsCount * organizationsCount
            )
        })

        it('org admin should see schools from his org', async () => {
            const token = generateToken(userToPayload(orgOwner))
            const visibleSchools = await querySchools(token)
            expect(visibleSchools.totalCount).to.eql(org3Schools.length)
        })

        it('org admin from 1 org and school owner of another org should see schools all the schools from the first org and only the one he owns from org 2', async () => {
            const token = generateToken(userToPayload(ownerAndSchoolAdmin))
            const visibleSchools = await querySchools(token)
            expect(visibleSchools.totalCount).to.eql(org2Schools.length + 1)
        })

        it('school admin should see only his school', async () => {
            const token = generateToken(userToPayload(schoolAdmin))
            const visibleSchools = await querySchools(token)
            expect(visibleSchools.totalCount).to.eql(1)
        })
    })
})
