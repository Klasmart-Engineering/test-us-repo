import { expect, use } from 'chai'
import { Connection, getRepository, QueryRunner } from 'typeorm'
import {
    createMigrationsTestConnection,
    createTestConnection,
} from '../utils/testConnection'
import RoleInitializer from '../../src/initializers/roles'
import { createOrganizationMembership } from '../factories/organizationMembership.factory'
import { createUser } from '../factories/user.factory'
import { createOrganization } from '../factories/organization.factory'
import { truncateTables } from '../utils/database'
import { Organization } from '../../src/entities/organization'
import { OrganizationMembership } from '../../src/entities/organizationMembership'
import { User } from '../../src/entities/user'
import chaiAsPromised from 'chai-as-promised'
import { generateShortCode } from '../../src/utils/shortcode'

use(chaiAsPromised)

describe('AddStatusUpdatedAtColumn1645635790974 migration', () => {
    let baseConnection: Connection
    let migrationsConnection: Connection
    let runner: QueryRunner

    let user: User
    let organization: Organization
    let orgMemb: OrganizationMembership
    const deletedAtDate: Date = new Date()

    before(async () => {
        baseConnection = await createTestConnection()
        runner = baseConnection.createQueryRunner()
    })
    after(async () => {
        await baseConnection?.close()
    })
    afterEach(async () => {
        const pendingMigrations = await baseConnection.showMigrations()
        expect(pendingMigrations).to.eq(false)
        await migrationsConnection?.close()
    })

    beforeEach(async () => {
        user = await createUser().save()
        organization = await createOrganization().save()
    })

    it('adds and manages a status_updated_at column in the organization membership table', async () => {
        // Make sure status_updated_at column in orgMemb table is dropped first:
        // ALTER TABLE "organization_membership" DROP COLUMN status_updated_at
        await expect(
            getRepository(OrganizationMembership)
                .createQueryBuilder()
                .select('status_updated_at')
                .getMany()
        ).to.be.rejectedWith('column "status_updated_at" does not exist')

        // Insert pre-migration org membership
        await runner.query(
            `INSERT INTO "organization_membership"("created_at", "updated_at", "deleted_at", "status", "user_id", "organization_id", "join_timestamp", "shortcode", "userUserId", "organizationOrganizationId") VALUES (DEFAULT, DEFAULT, '${deletedAtDate.toISOString()}', DEFAULT, '${
                user.user_id
            }', '${
                organization.organization_id
            }', DEFAULT, '${generateShortCode(user.user_id)}', '${
                user.user_id
            }', '${organization.organization_id}');`
        )

        // Insert pre-migration org membership
        // await baseConnection.manager
        //     .createQueryBuilder()
        //     .insert()
        //     .into(OrganizationMembership)
        //     .values({
        //         user_id: user.user_id,
        //         organization_id: organization.organization_id,
        //         shortcode: generateShortCode(user.user_id),
        //         deleted_at: deletedAtDate,
        //     })
        //     .execute()

        migrationsConnection = await createMigrationsTestConnection(
            true,
            false,
            'migrations'
        )
        await migrationsConnection.runMigrations()

        //expect(orgMemb.status_updated_at).to.eq(deletedAtDate)
    })
})
