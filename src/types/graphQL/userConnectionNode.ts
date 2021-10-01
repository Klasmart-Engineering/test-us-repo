import { Status } from '../../entities/status'
import { ContactInfo } from './contactInfo'
import { OrganizationSummaryNode } from './organizationSummaryNode'
import { RoleSummaryNode } from './roleSummaryNode'
import { SchoolSummaryNode } from './schoolSummaryNode'

export interface UserConnectionNode {
    id: string
    givenName?: string
    familyName?: string
    avatar?: string
    contactInfo: ContactInfo
    alternateContactInfo?: ContactInfo
    organizations: OrganizationSummaryNode[]
    roles: RoleSummaryNode[]
    schools: SchoolSummaryNode[]
    status: Status
    dateOfBirth?: string
    gender?: string
}
