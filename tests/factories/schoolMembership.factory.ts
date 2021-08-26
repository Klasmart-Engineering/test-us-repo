import { Organization } from '../../src/entities/organization'
import { OrganizationMembership } from '../../src/entities/organizationMembership'
import { User } from '../../src/entities/user'
import validationConstants from '../../src/entities/validations/constants'
import { generateShortCode } from '../../src/utils/shortcode'
import { SchoolMembership } from '../../src/entities/schoolMembership'
import { School } from '../../src/entities/school'

export function createSchoolMembership({
    user,
    school,
}: {
    user: User
    school: School
}): SchoolMembership {
    const schoolMembership = new SchoolMembership()
    schoolMembership.school_id = school.school_id
    schoolMembership.school = Promise.resolve(school)
    schoolMembership.user_id = user.user_id
    schoolMembership.user = Promise.resolve(user)
    return schoolMembership
}