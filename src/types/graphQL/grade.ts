import { Status } from '../../entities/status'

export interface GradeConnectionNode {
    id: string
    name?: string
    status: Status
    system: boolean
    fromGrade: GradeSummaryNode
    toGrade: GradeSummaryNode
}

export interface GradeSummaryNode {
    id: string
    name?: string
    status: Status
    system: boolean
}