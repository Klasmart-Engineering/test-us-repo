import DataLoader from 'dataloader'
import { AgeRange } from '../entities/ageRange'
import { Category } from '../entities/category'
import { Class } from '../entities/class'
import { Grade } from '../entities/grade'
import { Organization } from '../entities/organization'
import { OrganizationMembership } from '../entities/organizationMembership'
import { Permission } from '../entities/permission'
import { Program } from '../entities/program'
import { Role } from '../entities/role'
import { School } from '../entities/school'
import { SchoolMembership } from '../entities/schoolMembership'
import { Subcategory } from '../entities/subcategory'
import { User } from '../entities/user'
import {
    ageRangeNodeFields,
    mapAgeRangeToAgeRangeConnectionNode,
} from '../pagination/ageRangesConnection'
import {
    categoryConnectionNodeFields,
    mapCategoryToCategoryConnectionNode,
} from '../pagination/categoriesConnection'
import {
    coreClassConnectionNodeFields,
    CoreClassConnectionNode,
    mapClassToClassConnectionNode,
    classesConnectionSortingConfig,
    classesConnectionQuery,
} from '../pagination/classesConnection'
import {
    gradeSummaryNodeFields,
    mapGradeToGradeConnectionNode,
} from '../pagination/gradesConnection'
import {
    CoreOrganizationConnectionNode,
    mapOrganizationToOrganizationConnectionNode,
    organizationSummaryNodeFields,
} from '../pagination/organizationsConnection'
import {
    mapProgramToProgramConnectionNode,
    programSummaryNodeFields,
} from '../pagination/programsConnection'
import {
    mapSchoolMembershipToSchoolMembershipNode,
    schoolMembershipConnectionQuery,
    schoolMembershipsConnectionSortingConfig,
} from '../pagination/schoolMembershipsConnection'
import {
    mapSchoolToSchoolConnectionNode,
    schoolConnectionQuery,
    schoolsConnectionSortingConfig,
} from '../pagination/schoolsConnection'
import {
    mapSubcategoryToSubcategoryConnectionNode,
    subcategoryConnectionNodeFields,
} from '../pagination/subcategoriesConnection'
import {
    CoreUserConnectionNode,
    coreUserConnectionNodeFields,
    mapUserToUserConnectionNode,
    userConnectionSortingConfig,
    usersConnectionQuery,
} from '../pagination/usersConnection'
import { UserPermissions } from '../permissions/userPermissions'
import { AgeRangeConnectionNode } from '../types/graphQL/ageRange'
import { BrandingResult } from '../types/graphQL/branding'
import { CategoryConnectionNode } from '../types/graphQL/category'
import { ClassSummaryNode } from '../types/graphQL/classSummaryNode'
import { GradeSummaryNode } from '../types/graphQL/grade'
import { ProgramSummaryNode } from '../types/graphQL/program'
import {
    ISchoolsConnectionNode,
    SchoolSummaryNode,
} from '../types/graphQL/school'
import { SchoolMembershipConnectionNode } from '../types/graphQL/schoolMembership'
import { SubcategoryConnectionNode } from '../types/graphQL/subcategory'
import { UserSummaryNode } from '../types/graphQL/user'
import { Lazy } from '../utils/lazyLoading'
import { IPaginatedResponse } from '../utils/pagination/paginate'
import { IAgeRangeNodeDataLoader } from './ageRange'
import { ICategoryNodeDataLoader } from './category'
import {
    childConnectionLoader,
    IChildConnectionDataloaderKey,
    ICompositeIdChildConnectionDataloaderKey,
    multiKeyChildConnectionLoader,
} from './childConnectionLoader'
import {
    ageRangesForClasses,
    gradesForClasses,
    IClassesConnectionLoaders,
    IClassNodeDataLoaders,
    programsForClasses,
    schoolsForClasses,
    subjectsForClasses,
} from './classesConnection'
import { NodeDataLoader } from './genericNode'
import {
    fromGradeForGrades,
    IGradeNodeDataLoaders,
    IGradesConnectionLoaders,
    toGradeForGrades,
} from './gradesConnection'
import {
    brandingForOrganizations,
    IOrganizationLoaders,
    organizationForMemberships,
} from './organization'
import {
    IOrganizationNodeDataLoaders,
    IOrganizationsConnectionLoaders,
    ownersForOrgs,
} from './organizationsConnection'
import {
    ageRangesForPrograms,
    gradesForPrograms,
    IProgramNodeDataLoaders,
    IProgramsConnectionLoaders,
    subjectsForPrograms,
} from './programsConnection'

import {
    categoriesForSubjects,
    ISubjectNodeDataLoader,
    ISubjectsConnectionLoaders,
} from './subjectsConnection'
import {
    SubjectConnectionNode,
    SubjectSummaryNode,
} from '../types/graphQL/subject'
import {
    ISchoolLoaders,
    organizationsForSchools,
    SchoolNodeDataLoader,
    schoolsByIds,
} from './school'
import { ISubcategoryNodeDataLoader } from './subcategory'
import {
    IUserNodeDataLoaders,
    IUsersLoaders,
    orgMembershipsForUsers,
    schoolMembershipsForUsers,
    usersByIds,
} from './user'
import {
    IUsersConnectionLoaders,
    orgsForUsers,
    rolesForUsers,
    schoolsForUsers,
} from './usersConnection'
import {
    IPermissionNodeDataLoaders,
    mapPermissionToPermissionConnectionNode,
    permissionSummaryNodeFields,
} from '../pagination/permissionsConnection'
import { PermissionConnectionNode } from '../types/graphQL/permission'
import {
    IRoleNodeDataLoaders,
    mapRoleToRoleConnectionNode,
    roleConnectionNodeFields,
    roleConnectionQuery,
    rolesConnectionSortingConfig,
} from '../pagination/rolesConnection'
import { RoleConnectionNode, RoleSummaryNode } from '../types/graphQL/role'
import { Subject } from '../entities/subject'
import {
    mapSubjectToSubjectConnectionNode,
    subjectNodeFields,
} from '../pagination/subjectsConnection'
import { OrganizationMembershipConnectionNode } from '../types/graphQL/organizationMemberships'
import {
    mapOrganizationMembershipToOrganizationMembershipNode,
    organizationMembershipConnectionQuery,
    organizationMembershipsConnectionSortingConfig,
} from '../pagination/organizationMembershipsConnection'

export interface IDataLoaders {
    usersConnection?: IUsersConnectionLoaders
    programsConnection: IProgramsConnectionLoaders
    programNode: IProgramNodeDataLoaders
    gradesConnection: IGradesConnectionLoaders
    classesConnection: IClassesConnectionLoaders
    subjectsConnection: ISubjectsConnectionLoaders
    organizationsConnection: IOrganizationsConnectionLoaders
    user: IUsersLoaders
    userNode: IUserNodeDataLoaders
    organization: IOrganizationLoaders
    school: ISchoolLoaders
    classNode: IClassNodeDataLoaders
    roleNode: IRoleNodeDataLoaders
    gradeNode: IGradeNodeDataLoaders
    organizationNode: IOrganizationNodeDataLoaders
    permissionNode: IPermissionNodeDataLoaders
    subcategoryNode: ISubcategoryNodeDataLoader
    ageRangeNode: IAgeRangeNodeDataLoader
    subjectNode: ISubjectNodeDataLoader

    usersConnectionChild: Lazy<
        DataLoader<
            IChildConnectionDataloaderKey<User>,
            IPaginatedResponse<CoreUserConnectionNode>
        >
    >

    // Note that membership dataloaders are not supported on roles yet,
    // since membership tables do not have a single primary column which
    // the dataloader key interface expects.
    // The dataloader key interface and corresponding implementation
    // will need to be adapted to support composite keys.
    // Alternatively, the primaryColumn could potentially be inferred from
    // the SelectQueryBuilder.
    // Additional info: https://bitbucket.org/calmisland/kidsloop-user-service/pull-requests/716
    organizationMembershipsConnectionChild: Lazy<
        DataLoader<
            IChildConnectionDataloaderKey<OrganizationMembership>,
            IPaginatedResponse<OrganizationMembershipConnectionNode>
        >
    >
    schoolMembershipsConnectionChild: Lazy<
        DataLoader<
            IChildConnectionDataloaderKey<SchoolMembership>,
            IPaginatedResponse<SchoolMembershipConnectionNode>
        >
    >
    schoolsConnectionChild: Lazy<
        DataLoader<
            IChildConnectionDataloaderKey<School>,
            IPaginatedResponse<ISchoolsConnectionNode>
        >
    >
    rolesConnectionChild: Lazy<
        DataLoader<
            IChildConnectionDataloaderKey<Role>,
            IPaginatedResponse<RoleConnectionNode>
        >
    >
    classesConnectionChild: Lazy<
        DataLoader<
            IChildConnectionDataloaderKey<Class>,
            IPaginatedResponse<CoreClassConnectionNode>
        >
    >
    membershipRolesConnectionChild: Lazy<
        DataLoader<
            ICompositeIdChildConnectionDataloaderKey<Role>,
            IPaginatedResponse<RoleConnectionNode>
        >
    >
    categoryNode: ICategoryNodeDataLoader
    schoolNode: Lazy<NodeDataLoader<School, ISchoolsConnectionNode>>
}

export function createContextLazyLoaders(
    permissions: UserPermissions
): IDataLoaders {
    return {
        user: {
            user: new Lazy<DataLoader<string, User | Error>>(
                () => new DataLoader(usersByIds)
            ),
            orgMemberships: new Lazy<
                DataLoader<string, OrganizationMembership[]>
            >(() => new DataLoader(orgMembershipsForUsers)),
            schoolMemberships: new Lazy<DataLoader<string, SchoolMembership[]>>(
                () => new DataLoader(schoolMembershipsForUsers)
            ),
        },
        organization: {
            branding: new Lazy<DataLoader<string, BrandingResult | undefined>>(
                () => new DataLoader(brandingForOrganizations)
            ),
            organization: new Lazy<
                DataLoader<string, Organization | undefined>
            >(() => new DataLoader(organizationForMemberships)),
        },
        school: {
            organization: new Lazy<
                DataLoader<string, Organization | undefined>
            >(() => new DataLoader(organizationsForSchools)),
            schoolById: new Lazy<DataLoader<string, School | undefined>>(
                () => new DataLoader(schoolsByIds)
            ),
        },
        usersConnectionChild: new Lazy(
            () =>
                new DataLoader((items) => {
                    return childConnectionLoader(
                        items,
                        usersConnectionQuery,
                        mapUserToUserConnectionNode,
                        userConnectionSortingConfig,
                        { permissions, entity: 'user' }
                    )
                })
        ),
        organizationMembershipsConnectionChild: new Lazy(
            () =>
                new DataLoader((items) => {
                    return childConnectionLoader(
                        items,
                        organizationMembershipConnectionQuery,
                        mapOrganizationMembershipToOrganizationMembershipNode,
                        organizationMembershipsConnectionSortingConfig,
                        { permissions, entity: 'organizationMembership' }
                    )
                })
        ),
        schoolsConnectionChild: new Lazy(
            () =>
                new DataLoader((items) => {
                    return childConnectionLoader(
                        items,
                        schoolConnectionQuery,
                        mapSchoolToSchoolConnectionNode,
                        schoolsConnectionSortingConfig,
                        { permissions, entity: 'school' }
                    )
                })
        ),
        schoolMembershipsConnectionChild: new Lazy(
            () =>
                new DataLoader((items) => {
                    return childConnectionLoader(
                        items,
                        schoolMembershipConnectionQuery,
                        mapSchoolMembershipToSchoolMembershipNode,
                        schoolMembershipsConnectionSortingConfig,
                        { permissions, entity: 'schoolMembership' }
                    )
                })
        ),
        rolesConnectionChild: new Lazy(
            () =>
                new DataLoader((items) => {
                    return childConnectionLoader(
                        items,
                        (scope, filter) => {
                            roleConnectionQuery(scope, filter)
                            return Promise.resolve(scope)
                        },
                        mapRoleToRoleConnectionNode,
                        rolesConnectionSortingConfig,
                        { permissions, entity: 'role' }
                    )
                })
        ),
        classesConnectionChild: new Lazy(
            () =>
                new DataLoader((items) => {
                    return childConnectionLoader(
                        items,
                        classesConnectionQuery,
                        mapClassToClassConnectionNode,
                        classesConnectionSortingConfig,
                        { permissions, entity: 'class' }
                    )
                })
        ),
        membershipRolesConnectionChild: new Lazy(
            () =>
                new DataLoader((items) => {
                    return multiKeyChildConnectionLoader(
                        items,
                        (scope, filter) => {
                            roleConnectionQuery(scope, filter)
                            return Promise.resolve(scope)
                        },
                        mapRoleToRoleConnectionNode,
                        rolesConnectionSortingConfig,
                        { permissions, entity: 'role' }
                    )
                })
        ),
        userNode: {
            node: new Lazy<NodeDataLoader<User, CoreUserConnectionNode>>(
                () =>
                    new NodeDataLoader(
                        User,
                        'UserConnectionNode',
                        mapUserToUserConnectionNode,
                        coreUserConnectionNodeFields
                    )
            ),
            organizations: new Lazy(
                () => new DataLoader((keys) => orgsForUsers(keys))
            ),
            schools: new Lazy(
                () => new DataLoader((keys) => schoolsForUsers(keys))
            ),
            roles: new Lazy(
                () => new DataLoader((keys) => rolesForUsers(keys))
            ),
        },
        subcategoryNode: {
            node: new Lazy<
                NodeDataLoader<Subcategory, SubcategoryConnectionNode>
            >(
                () =>
                    new NodeDataLoader(
                        Subcategory,
                        'SubcategoryConnectionNode',
                        mapSubcategoryToSubcategoryConnectionNode,
                        subcategoryConnectionNodeFields
                    )
            ),
        },
        programsConnection: {
            ageRanges: new Lazy<DataLoader<string, AgeRangeConnectionNode[]>>(
                () => new DataLoader(ageRangesForPrograms)
            ),
            grades: new Lazy<DataLoader<string, GradeSummaryNode[]>>(
                () => new DataLoader(gradesForPrograms)
            ),
            subjects: new Lazy<DataLoader<string, SubjectSummaryNode[]>>(
                () => new DataLoader(subjectsForPrograms)
            ),
        },
        programNode: {
            node: new Lazy<NodeDataLoader<Program, ProgramSummaryNode>>(
                () =>
                    new NodeDataLoader(
                        Program,
                        'ProgramConnectionNode',
                        mapProgramToProgramConnectionNode,
                        programSummaryNodeFields
                    )
            ),
        },
        organizationsConnection: {
            owners: new Lazy<DataLoader<string, UserSummaryNode[]>>(
                () => new DataLoader(ownersForOrgs)
            ),
        },
        organizationNode: {
            node: new Lazy<
                NodeDataLoader<Organization, CoreOrganizationConnectionNode>
            >(
                () =>
                    new NodeDataLoader(
                        Organization,
                        'OrganizationConnectionNode',
                        mapOrganizationToOrganizationConnectionNode,
                        organizationSummaryNodeFields
                    )
            ),
        },
        schoolNode: new Lazy<SchoolNodeDataLoader>(
            () => new SchoolNodeDataLoader()
        ),
        classesConnection: {
            schools: new Lazy<DataLoader<string, SchoolSummaryNode[]>>(
                () => new DataLoader(schoolsForClasses)
            ),
            ageRanges: new Lazy<DataLoader<string, AgeRangeConnectionNode[]>>(
                () => new DataLoader(ageRangesForClasses)
            ),
            grades: new Lazy<DataLoader<string, GradeSummaryNode[]>>(
                () => new DataLoader(gradesForClasses)
            ),
            subjects: new Lazy<DataLoader<string, SubjectSummaryNode[]>>(
                () => new DataLoader(subjectsForClasses)
            ),
            programs: new Lazy<DataLoader<string, ProgramSummaryNode[]>>(
                () => new DataLoader(programsForClasses)
            ),
        },
        classNode: {
            node: new Lazy<NodeDataLoader<Class, ClassSummaryNode>>(
                () =>
                    new NodeDataLoader(
                        Class,
                        'ClassConnectionNode',
                        mapClassToClassConnectionNode,
                        coreClassConnectionNodeFields
                    )
            ),
        },
        roleNode: {
            node: new Lazy<NodeDataLoader<Role, RoleSummaryNode>>(
                () =>
                    new NodeDataLoader(
                        Role,
                        'RoleConnectionNode',
                        mapRoleToRoleConnectionNode,
                        roleConnectionNodeFields
                    )
            ),
        },
        gradesConnection: {
            fromGrade: new Lazy<
                DataLoader<string, GradeSummaryNode | undefined>
            >(() => new DataLoader(fromGradeForGrades)),
            toGrade: new Lazy<DataLoader<string, GradeSummaryNode | undefined>>(
                () => new DataLoader(toGradeForGrades)
            ),
        },
        gradeNode: {
            node: new Lazy<NodeDataLoader<Grade, GradeSummaryNode>>(
                () =>
                    new NodeDataLoader(
                        Grade,
                        'GradeConnectionNode',
                        mapGradeToGradeConnectionNode,
                        gradeSummaryNodeFields
                    )
            ),
        },
        permissionNode: {
            node: new Lazy<
                NodeDataLoader<Permission, PermissionConnectionNode>
            >(
                () =>
                    new NodeDataLoader(
                        Permission,
                        'PermissionConnectionNode',
                        mapPermissionToPermissionConnectionNode,
                        permissionSummaryNodeFields
                    )
            ),
        },
        categoryNode: {
            node: new Lazy<NodeDataLoader<Category, CategoryConnectionNode>>(
                () =>
                    new NodeDataLoader(
                        Category,
                        'CategoryConnectionNode',
                        mapCategoryToCategoryConnectionNode,
                        categoryConnectionNodeFields
                    )
            ),
        },
        ageRangeNode: {
            node: new Lazy<NodeDataLoader<AgeRange, AgeRangeConnectionNode>>(
                () =>
                    new NodeDataLoader(
                        AgeRange,
                        'AgeRangeConnectionNode',
                        mapAgeRangeToAgeRangeConnectionNode,
                        ageRangeNodeFields
                    )
            ),
        },
        subjectsConnection: {
            categories: new Lazy<DataLoader<string, CategoryConnectionNode[]>>(
                () => new DataLoader(categoriesForSubjects)
            ),
        },
        subjectNode: {
            node: new Lazy<NodeDataLoader<Subject, SubjectConnectionNode>>(
                () =>
                    new NodeDataLoader(
                        Subject,
                        'SubjectConnectionNode',
                        mapSubjectToSubjectConnectionNode,
                        subjectNodeFields
                    )
            ),
        },
    }
}
