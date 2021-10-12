import gql from 'graphql-tag'
import { Model } from '../model'
import { ApolloServerExpressConfig } from 'apollo-server-express'
import { ownersForOrgs } from '../loaders/organizationsConnection'
import Dataloader from 'dataloader'
import { Context } from '../main'
import { Organization } from '../entities/organization'
import { OrganizationMembership } from '../entities/organizationMembership'
import { OrganizationConnectionNode } from '../types/graphQL/organizationConnectionNode'
import { loadNodeDataLoader } from '../loaders/genericNode'
import {
    mapOrganizationToOrganizationConnectionNode,
    ORGANIZATION_NODE_COLUMNS,
} from '../pagination/organizationsConnection'

const typeDefs = gql`
    scalar HexColor
    scalar Url

    extend type Mutation {
        organization(
            organization_id: ID!
            organization_name: String
            address1: String
            address2: String
            phone: String
            shortCode: String
        ): Organization
        uploadOrganizationsFromCSV(file: Upload!): File
            @isMIMEType(mimetype: "text/csv")
        renameDuplicateOrganizations: Boolean @isAdmin
        setBranding(
            organizationId: ID!
            iconImage: Upload
            primaryColor: HexColor
        ): Branding
        deleteBrandingImage(
            organizationId: ID!
            type: BrandingImageTag!
        ): Boolean
        deleteBrandingColor(organizationId: ID!): Boolean
    }
    extend type Query {
        organization(organization_id: ID!): Organization
        organizations(organization_ids: [ID!]): [Organization]
            @isAdmin(entity: "organization")
        organizationsConnection(
            direction: ConnectionDirection!
            directionArgs: ConnectionsDirectionArgs
            filter: OrganizationFilter
            sort: OrganizationSortInput
        ): OrganizationsConnectionResponse @isAdmin(entity: "organization")
        organizationNode(id: ID!): OrganizationConnectionNode
            @isAdmin(entity: "organization")
    }
    type Organization {
        organization_id: ID!

        #properties
        organization_name: String
        address1: String
        address2: String
        phone: String
        shortCode: String
        status: Status

        branding: Branding

        #connections

        """
        'owner' is the User that created this Organization
        """
        owner: User @deprecated(reason: "Use 'organization_ownerships'.")
        primary_contact: User
        roles: [Role]
        memberships: [OrganizationMembership]
        teachers: [OrganizationMembership]
        students: [OrganizationMembership]
        schools: [School]
        classes: [Class] @deprecated(reason: "Use 'getClasses'.")
        getClasses: [Class]
        ageRanges: [AgeRange!]
        grades: [Grade!]
        categories: [Category!]
        subcategories: [Subcategory!]
        subjects: [Subject!]
        programs: [Program!]

        #query
        membersWithPermission(
            permission_name: String!
            search_query: String
        ): [OrganizationMembership]
        findMembers(search_query: String!): [OrganizationMembership]

        #mutations
        set(
            organization_name: String
            address1: String
            address2: String
            phone: String
            shortCode: String
        ): Organization
        setPrimaryContact(user_id: ID!): User
        addUser(user_id: ID!, shortcode: String): OrganizationMembership
        inviteUser(
            email: String
            phone: String
            given_name: String!
            family_name: String!
            date_of_birth: String
            username: String
            gender: String!
            shortcode: String
            organization_role_ids: [ID!]!
            school_ids: [ID!]
            school_role_ids: [ID!]
            alternate_email: String
            alternate_phone: String
        ): MembershipUpdate
        editMembership(
            user_id: ID!
            given_name: String!
            family_name: String!
            # email and phone are deprecated. Use User.set instead.
            email: String
            phone: String
            date_of_birth: String
            username: String
            gender: String!
            shortcode: String!
            organization_role_ids: [ID!]!
            school_ids: [ID!]
            school_role_ids: [ID!]
            alternate_email: String
            alternate_phone: String
        ): MembershipUpdate
        createRole(role_name: String!, role_description: String!): Role
        createSchool(school_name: String, shortcode: String): School
        createClass(class_name: String, shortcode: String): Class
        createOrUpdateAgeRanges(age_ranges: [AgeRangeDetail]!): [AgeRange]
        createOrUpdateGrades(grades: [GradeDetail]!): [Grade]
        createOrUpdateCategories(categories: [CategoryDetail]!): [Category]
        createOrUpdateSubcategories(
            subcategories: [SubcategoryDetail]!
        ): [Subcategory]
        createOrUpdateSubjects(subjects: [SubjectDetail]!): [Subject]
        createOrUpdatePrograms(programs: [ProgramDetail]!): [Program]
        delete(_: Int): Boolean
    }
    type OrganizationMembership {
        #properties
        user_id: ID!
        organization_id: ID!
        shortcode: String
        join_timestamp: Date
        status: Status

        #connections
        organization: Organization
        user: User
        roles: [Role]
        classes: [Class]
            @deprecated(
                reason: "Use User.classesStudying and User.classesTeaching"
            )
        schoolMemberships(permission_name: String): [SchoolMembership]

        #query
        checkAllowed(permission_name: ID!): Boolean
        classesTeaching: [Class]

        #mutations
        addRole(role_id: ID!): Role
        addRoles(role_ids: [ID!]!): [Role]
        removeRole(role_id: ID!): OrganizationMembership
        leave(_: Int): Boolean
    }
    type OrganizationOwnership {
        #properties
        user_id: ID!
        organization_id: ID!
        status: Status

        #connections
        organization: Organization
        user: User
    }

    type Branding {
        iconImageURL: Url
        primaryColor: HexColor
    }

    enum BrandingImageTag {
        ICON
    }

    # Organization connection related definitions

    enum OrganizationSortBy {
        name
    }

    input OrganizationSortInput {
        field: [OrganizationSortBy!]!
        order: SortOrder!
    }

    input OrganizationFilter {
        # table columns
        id: UUIDFilter
        name: StringFilter
        phone: StringFilter
        shortCode: StringFilter
        status: StringFilter

        # joined columns
        ownerUserId: UUIDFilter

        AND: [OrganizationFilter!]
        OR: [OrganizationFilter!]
    }

    type OrganizationsConnectionResponse implements iConnectionResponse {
        totalCount: Int
        pageInfo: ConnectionPageInfo
        edges: [OrganizationsConnectionEdge]
    }

    type OrganizationsConnectionEdge implements iConnectionEdge {
        cursor: String
        node: OrganizationConnectionNode
    }

    type OrganizationContactInfo {
        address1: String
        address2: String
        phone: String
    }

    type UserSummaryNode {
        id: String
    }

    type OrganizationConnectionNode {
        id: ID!
        name: String
        contactInfo: OrganizationContactInfo
        shortCode: String
        status: Status

        # connections
        owners: [UserSummaryNode]
        branding: Branding
    }
`
export default function getDefault(
    model: Model,
    context?: Context
): ApolloServerExpressConfig {
    return {
        typeDefs: [typeDefs],
        resolvers: {
            OrganizationConnectionNode: {
                owners: async (
                    organization: OrganizationConnectionNode,
                    args: Record<string, unknown>,
                    ctx: Context,
                    info
                ) => {
                    return info.path.prev?.key === 'organizationNode'
                        ? ctx.loaders.organizationNode.owners.load(
                              organization.id
                          )
                        : ctx.loaders.organizationsConnection?.owners?.load(
                              organization.id
                          )
                },
                branding: async (
                    organization: OrganizationConnectionNode,
                    args: Record<string, unknown>,
                    ctx: Context
                ) => ctx.loaders.organization?.branding.load(organization.id),
            },
            Mutation: {
                organization: (_parent, args, _context, _info) =>
                    model.setOrganization(args),
                uploadOrganizationsFromCSV: (_parent, args, ctx, info) =>
                    model.uploadOrganizationsFromCSV(args, ctx, info),
                renameDuplicateOrganizations: (_parent, args, ctx, info) =>
                    model.renameDuplicateOrganizations(args, ctx, info),
                setBranding: (_parent, args, ctx, info) =>
                    model.setBranding(args, ctx, info),
                deleteBrandingImage: (_parent, args, ctx, info) =>
                    model.deleteBrandingImage(args, ctx, info),
                deleteBrandingColor: (_parent, args, ctx, info) =>
                    model.deleteBrandingColor(args, ctx, info),
            },
            Query: {
                organizations: (_parent, args, _context, _info) =>
                    model.getOrganizations(args),
                organization: (_parent, { organization_id }, _context, _info) =>
                    model.getOrganization(organization_id),
                organizationsConnection: (
                    _parent,
                    args,
                    ctx: Context,
                    info
                ) => {
                    if (ctx.loaders.organizationsConnection === undefined) {
                        ctx.loaders.organizationsConnection = {
                            owners: new Dataloader((keys) =>
                                ownersForOrgs(keys)
                            ),
                        }
                    }

                    return model.organizationsConnection(ctx, info, args)
                },
                organizationNode: (_parent, args, ctx: Context) => {
                    ctx.loaders.organizationNode.node = loadNodeDataLoader(
                        args.scope,
                        ctx.loaders.organizationNode.node,
                        Organization,
                        'OrganizationConnectionNode',
                        mapOrganizationToOrganizationConnectionNode,
                        ORGANIZATION_NODE_COLUMNS
                    )

                    return ctx.loaders.organizationNode.node.load(args.id)
                },
            },
            Organization: {
                branding: (org: Organization, args, ctx: Context, _info) => {
                    return ctx.loaders.organization.branding.load(
                        org.organization_id
                    )
                },
            },
            OrganizationMembership: {
                organization: (
                    membership: OrganizationMembership,
                    args,
                    ctx: Context,
                    _info
                ) => {
                    return ctx.loaders.organization.organization.load(
                        membership.organization_id
                    )
                },
                user: (
                    membership: OrganizationMembership,
                    args,
                    ctx: Context,
                    _info
                ) => {
                    return ctx.loaders.user.user.load(membership.user_id)
                },
            },
        },
    }
}
