import { Organization } from '../entities/organization'
import { OrganizationMembership } from '../entities/organizationMembership'
import { Role } from '../entities/role'
import { User } from '../entities/user'
import { Context } from '../main'
import { mapOrganizationToOrganizationConnectionNode } from '../pagination/organizationsConnection'
import { PermissionName } from '../permissions/permissionNames'
import { APIError } from '../types/errors/apiError'
import {
    AddUsersToOrganizationInput,
    CreateOrganizationInput,
    OrganizationsMutationResult,
    RemoveUsersFromOrganizationInput,
} from '../types/graphQL/organization'
import {
    createExistentEntityAttributeAPIError,
    createUserAlreadyOwnsOrgAPIError,
} from '../utils/resolvers/errors'
import { config } from '../config/config'
import {
    formatShortCode,
    generateShortCode,
    newValidateShortCode,
    validateShortCode,
} from '../utils/shortcode'
import {
    RemoveMembershipMutation,
    EntityMap,
    AddMembershipMutation,
    ProcessedResult,
    validateActiveAndNoDuplicates,
    filterInvalidInputs,
    CreateMutation,
    validateNoDuplicate,
} from '../utils/mutations/commonStructure'
import { getMap } from '../utils/resolvers/entityMaps'
import {
    flagExistentOrganizationMembership,
    flagNonExistent,
    flagNonExistentOrganizationMembership,
} from '../utils/resolvers/inputValidation'
import clean from '../utils/clean'
import { ObjMap } from '../utils/stringUtils'
import { OrganizationOwnership } from '../entities/organizationOwnership'
import { v4 as uuid_v4 } from 'uuid'
import { In } from 'typeorm'
import { Status } from '../entities/status'

export interface EntityMapCreateOrganization extends EntityMap<Organization> {
    users: Map<string, User>
    conflictingNameOrgIds: ObjMap<{ name: string }, string>
    conflictingShortcodeOrgIds: ObjMap<{ shortcode: string }, string>
    userOwnedOrg: ObjMap<{ userId: string }, string>
    adminRole: Role
}

export class CreateOrganizations extends CreateMutation<
    Organization,
    CreateOrganizationInput,
    OrganizationsMutationResult,
    EntityMapCreateOrganization,
    OrganizationOwnership | OrganizationMembership
> {
    protected readonly EntityType = Organization
    protected inputTypeName = 'CreateOrganizationInput'
    protected output: OrganizationsMutationResult = { organizations: [] }

    normalize(input: CreateOrganizationInput[]) {
        for (const inputElement of input) {
            if (inputElement.shortcode === undefined) {
                inputElement.shortcode = generateShortCode()
            } else {
                inputElement.shortcode = clean.shortcode(inputElement.shortcode)
            }
        }
        return input
    }

    async generateEntityMaps(
        input: CreateOrganizationInput[]
    ): Promise<EntityMapCreateOrganization> {
        const usersMap = getMap.user(
            input.map((i) => i.userId),
            ['organization_ownerships']
        )

        const names = input.map(({ organizationName }) => organizationName)
        const conflictingNameOrgIdsMap = Organization.find({
            select: ['organization_id', 'organization_name'],
            where: { organization_name: In(names) },
        }).then(
            (res) =>
                new ObjMap(
                    res.map((r) => {
                        return {
                            key: { name: r.organization_name! },
                            value: r.organization_id,
                        }
                    })
                )
        )

        const validShortcodes = input
            .map(({ shortcode }) => shortcode)
            .filter((shortcode) => validateShortCode(shortcode))
        const conflictingShortcodeOrgIdsMap = Organization.find({
            select: ['organization_id', 'shortCode'],
            where: { shortCode: In(validShortcodes) },
        }).then(
            (res) =>
                new ObjMap(
                    res.map((r) => {
                        return {
                            key: { shortcode: r.shortCode! },
                            value: r.organization_id,
                        }
                    })
                )
        )

        const adminRole = Role.findOneOrFail({
            where: {
                role_name: 'Organization Admin',
                system_role: true,
                organization: { organization_id: null },
                status: Status.ACTIVE,
            },
        })

        const userOwnedOrgMap = new ObjMap<{ userId: string }, string>()
        for (const [userId, user] of (await usersMap).entries()) {
            // eslint-disable-next-line no-await-in-loop
            const ownerships = await user.organization_ownerships
            for (const { organization_id } of ownerships || []) {
                userOwnedOrgMap.set({ userId }, organization_id)
            }
        }

        return {
            users: await usersMap,
            conflictingNameOrgIds: await conflictingNameOrgIdsMap,
            conflictingShortcodeOrgIds: await conflictingShortcodeOrgIdsMap,
            userOwnedOrg: userOwnedOrgMap,
            adminRole: await adminRole,
        }
    }

    async authorize(): Promise<void> {
        this.permissions.rejectIfNotAdmin()
    }

    validationOverAllInputs(inputs: CreateOrganizationInput[]) {
        const duplicateUserErrors = validateNoDuplicate(
            inputs.map((i) => i.userId),
            'CreateOrganizationInput',
            'userId'
        ) // user can only be the owner of one organization
        const duplicateNameErrors = validateNoDuplicate(
            inputs.map((i) => i.organizationName),
            'CreateOrganizationInput',
            'organizationName'
        )
        const duplicateShortcodeErrors = validateNoDuplicate(
            inputs.map((i) => i.shortcode!),
            'CreateOrganizationInput',
            'shortcode'
        )
        return filterInvalidInputs(inputs, [
            duplicateUserErrors,
            duplicateNameErrors,
            duplicateShortcodeErrors,
        ])
    }

    validate(
        index: number,
        _: undefined,
        currentInput: CreateOrganizationInput,
        maps: EntityMapCreateOrganization
    ): APIError[] {
        const errors: APIError[] = []
        const { userId, organizationName, shortcode } = currentInput

        const users = flagNonExistent(User, index, [userId], maps.users)
        errors.push(...users.errors)

        const conflictingNameOrgId = maps.conflictingNameOrgIds?.get({
            name: organizationName,
        })
        if (conflictingNameOrgId) {
            errors.push(
                createExistentEntityAttributeAPIError(
                    'Organization',
                    conflictingNameOrgId,
                    'name',
                    organizationName,
                    index
                )
            )
        }

        if (shortcode) {
            const conflictingShortcodeOrgId = maps.conflictingShortcodeOrgIds?.get(
                { shortcode: shortcode }
            )
            if (conflictingShortcodeOrgId) {
                errors.push(
                    createExistentEntityAttributeAPIError(
                        'Organization',
                        conflictingShortcodeOrgId,
                        'shortcode',
                        shortcode,
                        index
                    )
                )
            }
        }

        const shortCodeErrors = newValidateShortCode(
            'Organization',
            shortcode,
            index
        )
        errors.push(...shortCodeErrors)

        const conflictingUserOrgId = maps.userOwnedOrg.get({ userId })
        if (conflictingUserOrgId) {
            errors.push(
                createUserAlreadyOwnsOrgAPIError(
                    userId,
                    conflictingUserOrgId,
                    index
                )
            )
        }

        return errors
    }

    process(
        currentInput: CreateOrganizationInput,
        maps: EntityMapCreateOrganization
    ): {
        outputEntity: Organization
        modifiedEntity: (OrganizationMembership | OrganizationOwnership)[]
    } {
        const {
            userId,
            organizationName,
            address1,
            address2,
            phone,
            shortcode,
        } = currentInput
        const userPromise = Promise.resolve(maps.users.get(userId)!)
        const outputEntity = new Organization()
        outputEntity.organization_id = uuid_v4()
        outputEntity.organization_name = organizationName
        outputEntity.address1 = address1
        outputEntity.address2 = address2
        outputEntity.phone = phone
        outputEntity.shortCode = shortcode
        outputEntity.primary_contact = userPromise

        const orgMembership = new OrganizationMembership()
        orgMembership.user = userPromise
        orgMembership.user_id = userId
        orgMembership.organization = Promise.resolve(outputEntity)
        orgMembership.organization_id = outputEntity.organization_id
        orgMembership.roles = Promise.resolve([maps.adminRole])
        outputEntity.memberships = Promise.resolve([orgMembership])

        const orgOwnership = new OrganizationOwnership()
        orgOwnership.user_id = userId
        orgOwnership.organization_id = outputEntity.organization_id

        return { outputEntity, modifiedEntity: [orgMembership, orgOwnership] }
    }

    async buildOutput(outputEntity: Organization): Promise<void> {
        this.output.organizations.push(
            mapOrganizationToOrganizationConnectionNode(outputEntity)
        )
    }
}

interface RemoveUsersFromOrganizationsEntityMap
    extends EntityMap<Organization> {
    mainEntity: Map<string, Organization>
    users: Map<string, User>
    memberships: ObjMap<
        { organizationId: string; userId: string },
        OrganizationMembership
    >
}
interface AddUsersToOrganizationsEntityMap
    extends RemoveUsersFromOrganizationsEntityMap {
    roles: Map<string, Role>
}

export class AddUsersToOrganizations extends AddMembershipMutation<
    Organization,
    AddUsersToOrganizationInput,
    OrganizationsMutationResult,
    AddUsersToOrganizationsEntityMap,
    OrganizationMembership
> {
    protected readonly EntityType = Organization
    protected inputTypeName = 'AddUsersToOrganizationInput'
    protected output: OrganizationsMutationResult = { organizations: [] }
    protected mainEntityIds: string[]

    constructor(
        input: AddUsersToOrganizationInput[],
        permissions: Context['permissions']
    ) {
        super(input, permissions)
        this.mainEntityIds = input.map((val) => val.organizationId)
    }

    generateEntityMaps = (
        input: AddUsersToOrganizationInput[]
    ): Promise<AddUsersToOrganizationsEntityMap> =>
        generateAddRemoveOrgUsersMap(this.mainEntityIds, input)

    protected authorize(): Promise<void> {
        return this.permissions.rejectIfNotAllowed(
            { organization_ids: this.mainEntityIds },
            PermissionName.send_invitation_40882
        )
    }

    protected validationOverAllInputs(
        inputs: AddUsersToOrganizationInput[],
        entityMaps: AddUsersToOrganizationsEntityMap
    ): {
        validInputs: { index: number; input: AddUsersToOrganizationInput }[]
        apiErrors: APIError[]
    } {
        return filterInvalidInputs(
            inputs,
            validateActiveAndNoDuplicates(
                inputs,
                entityMaps,
                inputs.map((val) => val.organizationId),
                this.EntityType.name,
                this.inputTypeName
            )
        )
    }

    protected validate(
        index: number,
        _currentEntity: Organization,
        currentInput: AddUsersToOrganizationInput,
        maps: AddUsersToOrganizationsEntityMap
    ): APIError[] {
        const errors: APIError[] = []
        const { organizationId, organizationRoleIds, userIds } = currentInput

        const users = flagNonExistent(User, index, userIds, maps.users)
        errors.push(...users.errors)

        const roles = flagNonExistent(
            Role,
            index,
            organizationRoleIds,
            maps.roles
        )
        errors.push(...roles.errors)

        if (!users.values.length) return errors
        const memberships = flagExistentOrganizationMembership(
            index,
            organizationId,
            users.values.map((u) => u.user_id),
            maps.memberships
        )
        errors.push(...memberships.errors)

        return errors
    }

    protected process(
        currentInput: AddUsersToOrganizationInput,
        maps: AddUsersToOrganizationsEntityMap,
        index: number
    ): ProcessedResult<Organization, OrganizationMembership> {
        const currentEntity = maps.mainEntity.get(this.mainEntityIds[index])!

        // Retrieval
        const { organizationId, organizationRoleIds, userIds } = currentInput
        const roles = organizationRoleIds.map(
            (ori) => maps.roles.get(ori) as Role
        )
        const shortcode = formatShortCode(currentInput.shortcode)

        // Create new memberships in organisation
        const memberships: OrganizationMembership[] = []
        for (const userId of userIds) {
            const user = maps.users.get(userId) as User
            const membership = new OrganizationMembership()
            membership.organization_id = organizationId
            membership.roles = Promise.resolve(roles)
            membership.organization = Promise.resolve(currentEntity)
            membership.user_id = userId
            membership.user = Promise.resolve(user)
            membership.shortcode =
                shortcode ||
                generateShortCode(userId, config.limits.SHORTCODE_MAX_LENGTH)
            memberships.push(membership)
        }
        return { outputEntity: currentEntity, modifiedEntity: memberships }
    }

    protected buildOutput = async (
        currentEntity: Organization
    ): Promise<void> => addOrgToOutput(currentEntity, this.output)
}

export class RemoveUsersFromOrganizations extends RemoveMembershipMutation<
    Organization,
    RemoveUsersFromOrganizationInput,
    OrganizationsMutationResult,
    RemoveUsersFromOrganizationsEntityMap,
    OrganizationMembership
> {
    protected readonly EntityType = Organization
    protected readonly MembershipType = OrganizationMembership
    protected inputTypeName = 'RemoveUsersFromOrganizationInput'
    protected output: OrganizationsMutationResult = { organizations: [] }
    protected mainEntityIds: string[]
    protected readonly saveIds: Record<string, string>[]

    constructor(
        input: RemoveUsersFromOrganizationInput[],
        permissions: Context['permissions']
    ) {
        super(input, permissions)
        this.mainEntityIds = input.map((val) => val.organizationId)
        this.saveIds = input.flatMap((i) =>
            i.userIds.map((user_id) => {
                return {
                    user_id,
                    organization_id: i.organizationId,
                }
            })
        )
    }

    generateEntityMaps = (
        input: RemoveUsersFromOrganizationInput[]
    ): Promise<RemoveUsersFromOrganizationsEntityMap> =>
        generateAddRemoveOrgUsersMap(this.mainEntityIds, input)

    normalize(inputs: RemoveUsersFromOrganizationInput[]) {
        for (const input of inputs) {
            if (input.status === undefined) {
                input.status = Status.INACTIVE
            }
        }
        return inputs
    }

    async authorize(input: RemoveUsersFromOrganizationInput[]): Promise<void> {
        const [
            hasDeletePermission,
            hasDeactivatePermission,
        ] = await Promise.all([
            this.permissions.allowed(
                { organization_ids: this.mainEntityIds },
                PermissionName.delete_users_40440
            ),
            this.permissions.allowed(
                { organization_ids: this.mainEntityIds },
                PermissionName.deactivate_user_40883
            ),
        ])

        const deleteOrgIds = input
            .filter((i) => i.status == Status.DELETED)
            .map((i) => i.organizationId)

        if (!hasDeletePermission && deleteOrgIds.length > 0) {
            throw new Error(
                `User must have ${PermissionName.delete_users_40440} to use the delete status on organizations ${deleteOrgIds}`
            )
        }

        const inactiveOrgIds = input
            .filter(
                (i) => i.status === Status.INACTIVE || i.status === undefined
            )
            .map((i) => i.organizationId)

        if (!hasDeactivatePermission && inactiveOrgIds.length > 0) {
            throw new Error(
                `User must have ${PermissionName.deactivate_user_40883} to use the inactive status on organizaton ${inactiveOrgIds}`
            )
        }
    }

    protected validationOverAllInputs(
        inputs: RemoveUsersFromOrganizationInput[],
        entityMaps: RemoveUsersFromOrganizationsEntityMap
    ): {
        validInputs: {
            index: number
            input: RemoveUsersFromOrganizationInput
        }[]
        apiErrors: APIError[]
    } {
        return filterInvalidInputs(
            inputs,
            validateActiveAndNoDuplicates(
                inputs,
                entityMaps,
                inputs.map((val) => val.organizationId),
                this.EntityType.name,
                this.inputTypeName
            )
        )
    }

    protected validate(
        index: number,
        _currentEntity: Organization,
        currentInput: RemoveUsersFromOrganizationInput,
        maps: RemoveUsersFromOrganizationsEntityMap
    ): APIError[] {
        const errors: APIError[] = []
        const { organizationId, userIds } = currentInput

        const users = flagNonExistent(User, index, userIds, maps.users)
        errors.push(...users.errors)

        if (!users.values.length) return errors
        const memberships = flagNonExistentOrganizationMembership(
            index,
            organizationId,
            users.values.map((u) => u.user_id),
            maps.memberships
        )
        errors.push(...memberships.errors)

        return errors
    }

    process(
        currentInput: RemoveUsersFromOrganizationInput,
        maps: RemoveUsersFromOrganizationsEntityMap,
        index: number
    ) {
        const currentEntity = maps.mainEntity.get(this.mainEntityIds[index])!
        const { organizationId, userIds } = currentInput
        const memberships: OrganizationMembership[] = []
        for (const userId of userIds) {
            const membership = maps.memberships.get({ organizationId, userId })!
            // todo: should we refactor this so partialEntity has no defualt status
            Object.assign(membership, this.partialEntity)
            membership.status = currentInput.status!
            memberships.push(membership)
        }

        return { outputEntity: currentEntity, others: memberships }
    }

    protected buildOutput = async (
        currentEntity: Organization
    ): Promise<void> => addOrgToOutput(currentEntity, this.output)
}

async function generateAddRemoveOrgUsersMap(
    organizationIds: string[],
    input: {
        userIds: string[]
        organizationRoleIds?: string[]
    }[]
): Promise<AddUsersToOrganizationsEntityMap> {
    const orgMap = getMap.organization(organizationIds)
    const userMap = getMap.user(input.flatMap((i) => i.userIds))

    const orgRoleIds = input
        .flatMap((i) => i.organizationRoleIds)
        .filter((rid): rid is string => rid !== undefined)
    const roleMap = getMap.role(orgRoleIds)

    const membershipMap = getMap.membership.organization(
        organizationIds,
        input.flatMap((i) => i.userIds)
    )

    return {
        mainEntity: await orgMap,
        users: await userMap,
        roles: await roleMap,
        memberships: await membershipMap,
    }
}

function addOrgToOutput(
    organization: Organization,
    output: OrganizationsMutationResult
): void {
    output.organizations.push(
        mapOrganizationToOrganizationConnectionNode(organization)
    )
}
