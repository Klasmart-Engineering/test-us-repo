import { use, expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Connection, getRepository } from 'typeorm'
import {
    ApolloServerTestClient,
    createTestClient,
} from '../utils/createTestClient'
import { createTestConnection } from '../utils/testConnection'
import { createServer } from '../../src/utils/createServer'
import { Model } from '../../src/model'

import { createProgram } from '../factories/program.factory'
import { Program } from '../../src/entities/program'
import { createOrganization } from '../factories/organization.factory'
import { addUserToOrganizationAndValidate } from '../utils/operations/organizationOps'
import { getAdminAuthToken, getNonAdminAuthToken } from '../utils/testConfig'
import {
    getProgram,
    getAgeRange,
    getSubcategory,
    getSubject,
    getGrade,
} from '../utils/operations/modelOps'
import { createAgeRange } from '../factories/ageRange.factory'
import { createNonAdminUser, createAdminUser } from '../utils/testEntities'
import { createSubcategory } from '../factories/subcategory.factory'
import { createCategory } from '../factories/category.factory'
import { createSubject } from '../factories/subject.factory'
import { createGrade } from '../factories/grade.factory'
import { addRoleToOrganizationMembership } from '../utils/operations/organizationMembershipOps'
import { createRole } from '../factories/role.factory'
import { grantPermission } from '../utils/operations/roleOps'
import { PermissionName } from '../../src/permissions/permissionNames'

use(chaiAsPromised)

describe('Program Sharing', () => {
    let connection: Connection
    let testClient: ApolloServerTestClient

    before(async () => {
        connection = await createTestConnection(true)
        const server = createServer(new Model(connection))
        testClient = createTestClient(server)
    })

    after(async () => {
        await connection?.close()
    })

    it('works?', async () => {
        await createAdminUser(testClient)
        const user = await createNonAdminUser(testClient)

        const org = await createOrganization().save()
        const org2 = await createOrganization().save()
        const org3 = await createOrganization().save()

        await addUserToOrganizationAndValidate(
            testClient,
            user.user_id,
            org2.organization_id,
            { authorization: getAdminAuthToken() }
        )
        const role = await createRole('role', org2, {
            permissions: [
                PermissionName.view_program_20111,
                PermissionName.view_age_range_20112,
                PermissionName.view_subjects_20115,
                PermissionName.view_grades_20113,
            ],
        }).save()

        await addRoleToOrganizationMembership(
            testClient,
            user.user_id,
            org2.organization_id,
            role.role_id,
            { authorization: getAdminAuthToken() }
        )
        const subcategory = await createSubcategory(org).save()
        const category = await createCategory(org, [subcategory]).save()
        const subject = await createSubject(org, [category]).save()
        const grade = await createGrade(org).save()
        const ageRange = await createAgeRange(org).save()

        const program = await createProgram(
            org,
            [ageRange],
            [grade],
            [subject]
        ).save()

        await program.share(org2)
        await program.share(org3)

        const gqlProgram = await getProgram(testClient, program.id, {
            authorization: getNonAdminAuthToken(),
        })
        console.log(gqlProgram)
        expect(gqlProgram.id).eq(program.id)

        const gqlAgeRange = await getAgeRange(testClient, ageRange.id, {
            authorization: getNonAdminAuthToken(),
        })
        expect(gqlAgeRange.id).eq(ageRange.id)

        const gqlSubcategory = await getSubcategory(
            testClient,
            subcategory.id,
            {
                authorization: getNonAdminAuthToken(),
            }
        )
        expect(gqlSubcategory.id).eq(subcategory.id)

        // TODO implement getCategory query
        // const gqlCategory = await getCategory(testClient, category.id, {
        //     authorization: getNonAdminAuthToken(),
        // })
        // expect(gqlCategory.id).eq(category.id)

        const gqlSubject = await getSubject(testClient, subject.id, {
            authorization: getNonAdminAuthToken(),
        })
        expect(gqlSubject.id).eq(subject.id)

        const gqlGrade = await getGrade(testClient, grade.id, {
            authorization: getNonAdminAuthToken(),
        })
        expect(gqlGrade.id).eq(grade.id)
    })
})
