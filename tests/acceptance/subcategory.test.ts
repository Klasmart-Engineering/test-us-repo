import supertest from 'supertest'
import { Connection } from 'typeorm'
import { Subcategory } from '../../src/entities/subcategory'
import {
    SUBCATEGORIES_CONNECTION,
    SUBCATEGORIES_DELETE,
    SUBCATEGORY_NODE,
    UPDATE_SUBCATEGORIES,
} from '../utils/operations/modelOps'
import { generateToken, getAdminAuthToken } from '../utils/testConfig'
import { createTestConnection } from '../utils/testConnection'
import { print } from 'graphql'
import { expect } from 'chai'
import SubcategoriesInitializer from '../../src/initializers/subcategories'
import { NIL_UUID } from '../utils/database'
import {
    createOrg,
    createSubcategories,
    ISubcategoryDetail,
} from '../utils/operations/acceptance/acceptanceOps.test'
import { User } from '../../src/entities/user'
import { createUser } from '../factories/user.factory'
import { userToPayload } from '../utils/operations/userOps'
import { createRole } from '../factories/role.factory'
import { createOrganization } from '../factories/organization.factory'
import { PermissionName } from '../../src/permissions/permissionNames'
import { createOrganizationMembership } from '../factories/organizationMembership.factory'
import { makeRequest } from './utils'
import {
    SubcategoryConnectionNode,
    UpdateSubcategoryInput,
} from '../../src/types/graphQL/subcategory'
import { buildUpdateSubcategoryInputArray } from '../utils/operations/subcategoryOps'
import { createSubcategory } from '../factories/subcategory.factory'
import { Organization } from '../../src/entities/organization'
import { loadFixtures } from '../utils/fixtures'

const url = 'http://localhost:8080'
const request = supertest(url)
const user_id = 'c6d4feed-9133-5529-8d72-1003526d1b13'
const org_name = 'my-org'
const subcategoriesCount = 12

async function makeConnectionQuery() {
    return await request
        .post('/user')
        .set({
            ContentType: 'application/json',
            Authorization: getAdminAuthToken(),
        })
        .send({
            query: print(SUBCATEGORIES_CONNECTION),
            variables: {
                direction: 'FORWARD',
            },
        })
}

const makeNodeQuery = async (id: string) => {
    return await request
        .post('/user')
        .set({
            ContentType: 'application/json',
            Authorization: getAdminAuthToken(),
        })
        .send({
            query: print(SUBCATEGORY_NODE),
            variables: {
                id,
            },
        })
}

describe('acceptance.subcategory', () => {
    let connection: Connection
    before(async () => {
        connection = await createTestConnection()
    })

    after(async () => {
        await connection?.close()
    })

    beforeEach(async () => {
        await SubcategoriesInitializer.run()
    })

    context('subcategoriesConnection', () => {
        let subcategoriesCount: number

        beforeEach(async () => {
            subcategoriesCount = await Subcategory.count()
        })

        context('when data is requested in a correct way', () => {
            it('should response with status 200', async () => {
                const response = await makeConnectionQuery()
                const subcategoriesConnection =
                    response.body.data.subcategoriesConnection

                expect(response.status).to.eq(200)
                expect(subcategoriesConnection.totalCount).to.equal(
                    subcategoriesCount
                )
            })
        })

        context('when data is requested in an incorrect way', () => {
            it('should response with status 400', async () => {
                const response = await request
                    .post('/user')
                    .set({
                        ContentType: 'application/json',
                        Authorization: getAdminAuthToken(),
                    })
                    .send({
                        query: print(SUBCATEGORIES_CONNECTION),
                        variables: {
                            direction: 'FORWARD',
                            filterArgs: {
                                byStatus: {
                                    operator: 'eq',
                                    value: 'available',
                                },
                            },
                        },
                    })

                const errors = response.body.errors
                const data = response.body.data

                expect(response.status).to.eq(400)
                expect(errors).to.exist
                expect(data).to.be.undefined
            })
        })
    })

    context('subcategoryNode', () => {
        context('when requested subcategory exists', () => {
            it('should respond succesfully', async () => {
                const subcategoryResponse = await makeConnectionQuery()
                const subcategoriesEdges =
                    subcategoryResponse.body.data.subcategoriesConnection.edges
                const subcategoryId = subcategoriesEdges[0].node.id
                const response = await makeNodeQuery(subcategoryId)
                const subcategoryNode = response.body.data.subcategoryNode

                expect(response.status).to.eq(200)
                expect(subcategoryNode.id).to.equal(subcategoryId)
            })
        })

        context('when requested subcategory does not exists', () => {
            it('should respond with errors', async () => {
                const response = await makeNodeQuery(NIL_UUID)
                const errors = response.body.errors
                const subcategoryNode = response.body.data.subcategoryNode

                expect(response.status).to.eq(200)
                expect(errors).to.exist
                expect(subcategoryNode).to.be.null
            })
        })
    })

    context('deleteSubcategories', () => {
        context('when id exists', () => {
            let subcategoryId: string
            let user: User
            let token: string
            beforeEach(async () => {
                const org1 = await createOrganization().save()
                user = await createUser().save()
                const deleteSubcategoriesRoleOrg1 = await createRole(
                    'Delete Subcategories',
                    org1,
                    {
                        permissions: [PermissionName.delete_subjects_20447],
                    }
                ).save()
                const createSubjectsRole = await createRole(
                    'Create Subcategories',
                    org1,
                    {
                        permissions: [PermissionName.create_subjects_20227],
                    }
                ).save()
                await createOrganizationMembership({
                    user,
                    organization: org1,
                    roles: [createSubjectsRole, deleteSubcategoriesRoleOrg1],
                }).save()
                token = generateToken(userToPayload(user))
                const subcategoriesDetails: ISubcategoryDetail[] = [
                    {
                        name: `subcategory 0`,
                        system: false,
                    },
                ]
                const res = await createSubcategories(
                    org1.organization_id,
                    subcategoriesDetails,
                    token
                )
                subcategoryId =
                    res.body.data.organization.createOrUpdateSubcategories[0].id
            })
            it('should respond succesfully', async () => {
                const response = await makeRequest(
                    request,
                    print(SUBCATEGORIES_DELETE),
                    { input: [{ id: subcategoryId }] },
                    token
                )
                const subcategoryNode =
                    response.body.data.deleteSubcategories.subcategories[0]

                expect(response.status).to.eq(200)
                expect(subcategoryNode.id).to.equal(subcategoryId)
            })
        })

        context('when requested subcategory does not exists', () => {
            it('should respond with errors', async () => {
                const response = await makeRequest(
                    request,
                    print(SUBCATEGORIES_DELETE),
                    { input: [{ id: NIL_UUID }] },
                    getAdminAuthToken()
                )
                const errors = response.body.errors
                expect(response.status).to.eq(200)
                expect(errors).to.exist
            })
        })
    })

    context('updateSubcategories', () => {
        let orgId: string
        let subcategoryIds: string[]
        beforeEach(async () => {
            await SubcategoriesInitializer.run()
            await loadFixtures('users', connection)
            const createOrgResponse = await createOrg(
                user_id,
                org_name,
                getAdminAuthToken()
            )

            const createOrgData =
                createOrgResponse.body.data.user.createOrganization

            orgId = createOrgData.organization_id
            const org = await Organization.findOneOrFail(orgId)

            const subcategories = await Subcategory.save(
                Array.from(new Array(subcategoriesCount), (_, i) =>
                    createSubcategory(org)
                )
            )

            subcategoryIds = subcategories.map((c) => c.id)
        })
        const makeUpdateSubcategoriesMutation = async (
            input: UpdateSubcategoryInput[]
        ) => {
            return makeRequest(
                request,
                print(UPDATE_SUBCATEGORIES),
                { input },
                getAdminAuthToken()
            )
        }

        context('when subcategory exist', () => {
            it('should update it', async () => {
                const input = buildUpdateSubcategoryInputArray(
                    subcategoryIds.slice(0, 2)
                )
                const response = await makeUpdateSubcategoriesMutation(input)
                const { subcategories } = response.body.data.updateSubcategories

                expect(response.status).to.eq(200)
                expect(subcategories).to.exist
                expect(subcategories).to.be.an('array')
                expect(subcategories.length).to.eq(input.length)

                subcategories.forEach(
                    (c: SubcategoryConnectionNode, i: number) => {
                        expect(c.id).to.eq(input[i].id)
                        expect(c.name).to.eq(input[i].name)
                    }
                )
            })
        })

        context('when category does not exist', () => {
            it('should fail', async () => {
                const input = buildUpdateSubcategoryInputArray([NIL_UUID])
                const response = await makeUpdateSubcategoriesMutation(input)
                const categoriesUpdated = response.body.data.updateSubcategories
                const errors = response.body.errors

                expect(response.status).to.eq(200)
                expect(categoriesUpdated).to.be.null
                expect(errors).to.exist
            })
        })
    })
})
