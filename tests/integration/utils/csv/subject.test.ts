import { use, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { Connection, getManager } from "typeorm";
import { Organization } from "../../../../src/entities/organization";
import { Category } from "../../../../src/entities/category";
import { Subject } from "../../../../src/entities/subject";
import { Model } from "../../../../src/model";
import { SubjectRow } from "../../../../src/types/csv/subjectRow";
import { createServer } from "../../../../src/utils/createServer";
import { processSubjectFromCSVRow } from "../../../../src/utils/csv/subject";
import { createOrganization } from "../../../factories/organization.factory";
import { ApolloServerTestClient, createTestClient } from "../../../utils/createTestClient";
import { createTestConnection } from "../../../utils/testConnection";
import  CategoriesInitializer from "../../../../src/initializers/categories";
import  SubcategoriesInitializer  from "../../../../src/initializers/subcategories";
import { CSVError } from "../../../../src/types/csv/csvError";


describe("processSubjectFromCSVRow", () => {
    let connection: Connection;
    let testClient: ApolloServerTestClient;
    let row: SubjectRow;
    let organization: Organization;
    let fileErrors: CSVError[];

    before(async () => {
        connection = await createTestConnection();
        const server = createServer(new Model(connection));
        testClient = createTestClient(server);
    });

    after(async () => {
        await connection?.close();
    });

    beforeEach(async () => {
        await SubcategoriesInitializer.run()
        await CategoriesInitializer.run()
        organization = createOrganization();
        organization.organization_name = 'Company 1';
        await connection.manager.save(organization);

        row = {
            organization_name: 'Company 1',
            subject_name: 'Wacking',
            category_name: 'Gross Motor Skills'
        }

    });

    context("when the organization name is not provided", () => {
        beforeEach(() => {
            row = { ...row, organization_name: '' }
        })

        it("throws an error", async () => {
            const fn = () => processSubjectFromCSVRow(connection.manager, row, 1, fileErrors);

            expect(fn()).to.throw
            const subject = await Subject.findOne({
                where: {
                    name: row.subject_name,
                    status: 'active',
                    system: false,
                    organization: organization,
                }
            })

            expect(subject).to.be.undefined
        });
    });

    context("when the subject name is not provided", () => {
        beforeEach(() => {
            row = { ...row, subject_name: '' }
        })

        it("throws an error", async () => {
            const fn = () => processSubjectFromCSVRow(connection.manager, row, 1, fileErrors);

            expect(fn()).to.throw
            const subject = await Subject.findOne({
                where: {
                    name: row.subject_name,
                    status: 'active',
                    system: false,
                    organization: organization,
                }
            })

            expect(subject).to.be.undefined
        });
    });

    context("when the category name is not provided", () => {
        beforeEach(() => {
            row = { ...row, category_name: '' }
        })

        it("succeeds with the 'None Specified' category", async () => {
            await processSubjectFromCSVRow(connection.manager, row, 1, fileErrors);

            const subject = await Subject.findOne({
                where: {
                    name: row.subject_name,
                    status: 'active',
                    system: false,
                    organization: organization,
                }
            })
            const organizationInSubject = await subject?.organization;

            expect(subject).to.exist;
            const categories = await subject?.categories

            expect(subject?.name).eq(row.subject_name);
            expect(subject?.system).eq(false);
            expect(subject?.status).eq('active');
            expect(categories).to.exist
            expect(categories?.length).to.equal(1)
            let category = categories? categories[0] : undefined
            expect(category?.name).to.equal('None Specified')
            expect(organizationInSubject?.organization_name).eq(row.organization_name);
        });
    });

    context("when the provided organization doesn't exists", () => {
        beforeEach(() => {
            row = { ...row, organization_name: 'Company 10' }
        })

        it("throws an error", async () => {
            const fn = () => processSubjectFromCSVRow(connection.manager, row, 1, fileErrors);

            expect(fn()).to.throw
            const subject = await Subject.findOne({
                where: {
                    name: row.subject_name,
                    status: 'active',
                    system: false,
                    organization: organization,
                }
            })

            expect(subject).to.be.undefined
        });
    });

    context("when the provided category name doesn't exists", () => {
        beforeEach(() => {
            row = { ...row, category_name: 'a non existant category' }
        })

        it("throws an error", async () => {
            const fn = () => processSubjectFromCSVRow(connection.manager, row, 1, fileErrors);

            expect(fn()).to.throw
            const subject = await Subject.findOne({
                where: {
                    name: row.subject_name,
                    status: 'active',
                    system: false,
                    organization: organization,
                }
            })

            expect(subject).to.be.undefined
        });
    });

    context("when the provided category already exists in the current subject", () => {
        beforeEach(async () => {
            let categories: Category[] = [];
            const categoryFound = await Category.findOneOrFail(
                {
                    where: {
                        name: row.category_name
                    }
                }
            );
            const subject = new Subject();

            categories.push(categoryFound)
            subject.name = row.subject_name;
            subject.organization = Promise.resolve(organization);
            subject.categories = Promise.resolve(categories);
            await connection.manager.save(subject);
        })

        it("throws an error", async () => {
            const fn = () => processSubjectFromCSVRow(connection.manager, row, 1, fileErrors);

            expect(fn()).to.throw
        });
    });

    context("when all data provided is valid", () => {
        it("creates the subjects with its relations", async () => {
            await processSubjectFromCSVRow(connection.manager, row, 1, fileErrors);

            const subject = await Subject.findOneOrFail({
                where: {
                    name: row.subject_name,
                    status: 'active',
                    system: false,
                }
            });

            const organizationInSubject = await subject.organization;

            expect(subject).to.exist;
            expect(subject.name).eq(row.subject_name);
            expect(subject.system).eq(false);
            expect(subject.status).eq('active');
            expect(organizationInSubject?.organization_name).eq(row.organization_name);
        });
    });
});