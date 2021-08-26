import { Organization } from '../../src/entities/organization'
import { OrganizationMembership } from '../../src/entities/organizationMembership'
import { User } from '../../src/entities/user'
import validationConstants from '../../src/entities/validations/constants'
import { generateShortCode } from '../../src/utils/shortcode'

export function createOrganizationMembership({
    user,
    organization,
}: {
    user: User
    organization: Organization
}): OrganizationMembership {
    const membership = new OrganizationMembership()
    membership.organization_id = organization.organization_id
    membership.organization = Promise.resolve(organization)
    membership.user_id = user.user_id
    membership.user = Promise.resolve(user)
    membership.shortcode = generateShortCode(
        user.user_id,
        validationConstants.SHORTCODE_MAX_LENGTH
    )
    return membership
}