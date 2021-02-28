import { Connection } from "typeorm";
import { expect } from "chai";

import AgeRangesInitializer from '../../../src/initializers/ageRanges'
import { ApolloServerTestClient, createTestClient } from "../../utils/createTestClient";
import { createOrganizationAndValidate } from "../../utils/operations/userOps";
import { createTestConnection } from "../../utils/testConnection";
import { createServer } from "../../../src/utils/createServer";
import { createUserJoe } from "../../utils/testEntities";
import { JoeAuthToken } from "../../utils/testConfig";
import { listAgeRanges } from "../../utils/operations/organizationOps";
import { Model } from "../../../src/model";
import { Organization } from "../../../src/entities/organization";

describe("AgeRangesInitializer", () => {
    let connection: Connection;
    let testClient: ApolloServerTestClient;

    before(async () => {
        connection = await createTestConnection();
        const server = createServer(new Model(connection));
        testClient = createTestClient(server);
    });

    after(async () => {
        await connection?.close();
    });

    describe("run", () => {
        const ageRangeInfoFunc =  function (ageRange: any) {
            return {
                id: ageRange.id,
                name: ageRange.name,
                low_value: ageRange.low_value,
                low_value_unit: ageRange.low_value_unit,
                high_value: ageRange.high_value,
                high_value_unit: ageRange.high_value_unit,
                system: ageRange.system,
                organization_id: ageRange.organization?.organization_id,
                status: ageRange.status,
            }
        };

        context("when updated default age ranges exists", () => {
            let organization: Organization;

            beforeEach(async () => {
                const user = await createUserJoe(testClient);
                organization = await createOrganizationAndValidate(testClient, user.user_id);
            });

            it("does not modify the default system age ranges", async () => {
                const gqlAgeRanges = await listAgeRanges(testClient, organization.organization_id, { authorization: JoeAuthToken })
                expect(gqlAgeRanges).not.to.be.empty;

                await AgeRangesInitializer.run();

                organization = await Organization.findOneOrFail(organization.organization_id);
                const gqlNewAgeRanges = await listAgeRanges(testClient, organization.organization_id, { authorization: JoeAuthToken })
                expect(gqlNewAgeRanges).not.to.be.empty;

                expect(gqlAgeRanges.map(ageRangeInfoFunc)).to.deep.equal(gqlNewAgeRanges.map(ageRangeInfoFunc));
            });
        });
    });
});
