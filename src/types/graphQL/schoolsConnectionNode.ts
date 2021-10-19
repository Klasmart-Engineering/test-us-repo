import { Status } from '../../entities/status'
import { IPaginatedResponse } from '../../utils/pagination/paginate'
import { UserConnectionNode } from './userConnectionNode'

export interface ISchoolsConnectionNode {
    id: string
    name: string
    status: Status
    shortCode?: string
    organizationId: string

    usersConnection?: IPaginatedResponse<UserConnectionNode>
}
