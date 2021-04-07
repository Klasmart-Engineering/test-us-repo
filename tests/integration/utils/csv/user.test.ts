import chaiAsPromised from "chai-as-promised";
import { Connection } from "typeorm";
import { expect, use } from "chai";

import { ApolloServerTestClient, createTestClient } from "../../../utils/createTestClient";
import { createClass } from "../../../factories/class.factory";
import { createOrganization } from "../../../factories/organization.factory";
import { createServer } from "../../../../src/utils/createServer";
import { createRole } from "../../../factories/role.factory";
import { createSchool } from "../../../factories/school.factory";
import { createTestConnection } from "../../../utils/testConnection";
import { createUser } from "../../../factories/user.factory";
import { generateShortCode} from '../../../../src/utils/shortcode'
import { Class } from "../../../../src/entities/class";
import { User, accountUUID } from "../../../../src/entities/user";
import { UserRow } from "../../../../src/types/csv/userRow";
import { Model } from "../../../../src/model";
import { Organization, normalizedLowercaseTrimmed } from "../../../../src/entities/organization";
import { OrganizationMembership } from "../../../../src/entities/organizationMembership";
import { Role } from "../../../../src/entities/role";
import { School } from "../../../../src/entities/school";
import { SchoolMembership } from "../../../../src/entities/schoolMembership";
import { processUserFromCSVRow } from "../../../../src/utils/csv/user";

use(chaiAsPromised);

describe("processUserFromCSVRow", () => {
    let connection: Connection;
    let testClient: ApolloServerTestClient;
    let cls: Class;
    let row: UserRow;
    let user: User;
    let organization: Organization;
    let role: Role;
    let school: School;

    before(async () => {
        connection = await createTestConnection();
        const server = createServer(new Model(connection));
        testClient = createTestClient(server);
    });

    after(async () => {
        await connection?.close();
    });

    beforeEach(async () => {
        user = createUser()
        organization = createOrganization()
        await connection.manager.save(organization)
        school = createSchool(organization)
        await connection.manager.save(school)
        role = createRole(undefined, organization)
        await connection.manager.save(role)
        cls = createClass([school], organization)
        await connection.manager.save(cls)

        row = {
            organization_name: organization.organization_name || '',
            user_given_name: user.given_name || '',
            user_family_name: user.family_name || '',
            user_shortcode: generateShortCode(),
            user_email: user.email || '',
            user_phone: '',
            user_date_of_birth: user.date_of_birth || '',
            user_gender: user.gender || '',
            organization_role_name: role.role_name || '',
            school_name: school.school_name || '',
            school_role_name: role.role_name || '',
            class_name: cls.class_name || '',
        }
    })

    context("when the organization name is not provided", () => {
        beforeEach(async () => {
            row = { ...row, organization_name: '' }
        })

        it("throws an error", async () => {
            const fn = () => processUserFromCSVRow(connection.manager, row, 1);

            expect(fn()).to.be.rejected
            const user = await User.findOne({
                where: { email: row.user_email }
            })

            expect(user).to.be.undefined
        });
    });

    context("when the organization name does not exist on the system", () => {
        beforeEach(async () => {
            row = { ...row, organization_name: 'None Existing Org' }
        })

        it("throws an error", async () => {
            const fn = () => processUserFromCSVRow(connection.manager, row, 1);

            expect(fn()).to.be.rejected
            const user = await User.findOne({
                where: { email: row.user_email }
            })

            expect(user).to.be.undefined
        });
    });

    context("when missing user email and phone", () => {
        beforeEach(async () => {
            row = { ...row, user_email: '', user_phone: '' }
        })

        it("throws an error", async () => {
            const fn = () => processUserFromCSVRow(connection.manager, row, 1);

            expect(fn()).to.be.rejected
            const dbUser = await User.findOne({
                where: { email: row.user_email }
            })

            expect(dbUser).to.be.undefined
        });
    });

    context("when date of birth is not valid", () => {
        it("throws an error", async () => {
            for(const date_of_birth of ['01-01-2020', '01/2020', '2020-01', '01/01/2020']){
                row = { ...row, user_date_of_birth: date_of_birth }
                const fn = () => processUserFromCSVRow(connection.manager, row, 1);

                expect(fn()).to.be.rejected
                const dbUser = await User.findOne({
                    where: { email: row.user_email }
                })

                expect(dbUser).to.be.undefined
            }
        });
    });

    context("when shortcode is not valid", () => {
        it("throws an error", async () => {
            for(const shortcode of ['de/f', '$abc', '@1234']){
                row = { ...row, user_shortcode: shortcode }
                const fn = () => processUserFromCSVRow(connection.manager, row, 1);

                expect(fn()).to.be.rejected
                const dbUser = await User.findOne({
                    where: { email: row.user_email }
                })

                expect(dbUser).to.be.undefined
            }
        });
    });

    context("when organization role name provided does not exist", () => {
        beforeEach(async () => {
            row = { ...row, organization_role_name: 'Non existing role' }
        })

        it("throws an error", async () => {
            const fn = () => processUserFromCSVRow(connection.manager, row, 1);

            expect(fn()).to.be.rejected
            const dbUser = await User.findOne({
                where: { email: row.user_email }
            })

            expect(dbUser).to.be.undefined
        });
    });

    context("when school name provided does not exist", () => {
        beforeEach(async () => {
            row = { ...row, school_name: 'Non existing school' }
        })

        it("throws an error", async () => {
            const fn = () => processUserFromCSVRow(connection.manager, row, 1);

            expect(fn()).to.be.rejected
            const dbUser = await User.findOne({
                where: { email: row.user_email }
            })

            expect(dbUser).to.be.undefined
        });
    });

    context("when school role name provided does not exist", () => {
        beforeEach(async () => {
            row = { ...row, school_role_name: 'Non existing role' }
        })

        it("throws an error", async () => {
            const fn = () => processUserFromCSVRow(connection.manager, row, 1);

            expect(fn()).to.be.rejected
            const dbUser = await User.findOne({
                where: { email: row.user_email }
            })

            expect(dbUser).to.be.undefined
        });
    });

    context("when class name provided does not exist", () => {
        beforeEach(async () => {
            row = { ...row, class_name: 'Non existing class' }
        })

        it("throws an error", async () => {
            const fn = () => processUserFromCSVRow(connection.manager, row, 1);

            expect(fn()).to.be.rejected
            const dbUser = await User.findOne({
                where: { email: row.user_email }
            })

            expect(dbUser).to.be.undefined
        });
    });

    context("when all the data is correct", () => {
        let roleInfo = (role: Role) => { return role.role_id }
        let userInfo = (user: User) => { return user.user_id }

        it("creates the user and its respective links", async () => {
            await processUserFromCSVRow(connection.manager, row, 1);

            const dbUser = await User.findOneOrFail({
                where: { email: row.user_email }
            })

            expect(dbUser.user_id).to.eq(accountUUID(normalizedLowercaseTrimmed(row.user_email)))
            expect(dbUser.email).to.eq(row.user_email)
            expect(dbUser.phone).to.be.null
            expect(dbUser.given_name).to.eq(row.user_given_name)
            expect(dbUser.family_name).to.eq(row.user_family_name)
            expect(dbUser.date_of_birth).to.eq(row.user_date_of_birth)
            expect(dbUser.gender).to.eq(row.user_gender)

            const orgMembership = await OrganizationMembership.findOneOrFail({
                where: { user: dbUser, organization: organization }
            })
            expect(orgMembership.shortcode).to.eq(row.user_shortcode)
            const orgRoles = await orgMembership.roles || []
            expect(orgRoles.map(roleInfo)).to.deep.eq([role].map(roleInfo))

            const schoolMembership = await SchoolMembership.findOneOrFail({
                where: { user: dbUser, school: school }
            })
            const schoolRoles = await schoolMembership.roles || []
            expect(schoolRoles.map(roleInfo)).to.deep.eq([role].map(roleInfo))
        });

        context("and the role is not student neither teacher related", () => {
            it("does not assign the user to the class", async () => {
                await processUserFromCSVRow(connection.manager, row, 1);

                const students = await cls.students || []
                expect(students).to.be.empty
                const teachers = await cls.teachers || []
                expect(teachers).to.be.empty
            });
        });

        context("and the role is student related", () => {
            beforeEach(async () => {
                role = createRole("My Student Role", organization)
                await connection.manager.save(role)

                row = {
                    ...row,
                    organization_role_name: role.role_name || '',
                    school_role_name: role.role_name || '',
                }
            })

            it("assigns the user to the class as student", async () => {
                await processUserFromCSVRow(connection.manager, row, 1);

                const dbUser = await User.findOneOrFail({
                    where: { email: row.user_email }
                })

                const students = await cls.students || []
                expect(students.map(userInfo)).to.deep.eq([dbUser].map(userInfo))
                const teachers = await cls.teachers || []
                expect(teachers).to.be.empty
            });
        });

        context("and the role is teacher related", () => {
            beforeEach(async () => {
                role = createRole("My Teacher Role", organization)
                await connection.manager.save(role)

                row = {
                    ...row,
                    organization_role_name: role.role_name || '',
                    school_role_name: role.role_name || '',
                }
            })

            it("assigns the user to the class as teacher", async () => {
                await processUserFromCSVRow(connection.manager, row, 1);

                const dbUser = await User.findOneOrFail({
                    where: { email: row.user_email }
                })

                const students = await cls.students || []
                expect(students).to.be.empty
                const teachers = await cls.teachers || []
                expect(teachers.map(userInfo)).to.deep.eq([dbUser].map(userInfo))
            });
        });
    });
});