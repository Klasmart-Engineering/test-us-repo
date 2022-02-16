import { Options } from "k6/options";
import { loginSetupV2 as loginSetup } from './utils/loginSetupV2';
import getUsers from "./scripts/getOrganizationUsers";
import { sleep } from "k6";

export const options: Options = {
    scenarios: {
        teacher00: {
            executor: 'ramping-vus',
            exec: 'teacher00',
            startTime: '0s',
            gracefulStop: '5s',
            stages: [
                // Ramp up               
                {
                    duration: '20s',
                    target: 2
                },
                // Hold
                {
                    duration: '2m',
                    target: 4
                },
                // Ramp down
                {
                    duration: '20s',
                    target: 0
                },
            ],
        },
        teacher01: {
            executor: 'ramping-vus',
            exec: 'teacher01',
            startTime: '0s',
            gracefulStop: '5s',
            stages: [
                // Ramp up               
                {
                    duration: '20s',
                    target: 2
                },
                // Hold
                {
                    duration: '2m',
                    target: 4
                },
                // Ramp down
                {
                    duration: '20s',
                    target: 0
                },
            ],
        },
        teacher02: {
            executor: 'ramping-vus',
            exec: 'teacher02',
            startTime: '0s',
            gracefulStop: '5s',
            stages: [
                // Ramp up               
                {
                    duration: '20s',
                    target: 2
                },
                // Hold
                {
                    duration: '2m',
                    target: 4
                },
                // Ramp down
                {
                    duration: '20s',
                    target: 0
                },
            ],
        },
        teacher03: {
            executor: 'ramping-vus',
            exec: 'teacher03',
            startTime: '0s',
            gracefulStop: '5s',
            stages: [
                // Ramp up               
                {
                    duration: '20s',
                    target: 2
                },
                // Hold
                {
                    duration: '2m',
                    target: 4
                },
                // Ramp down
                {
                    duration: '20s',
                    target: 0
                },
            ],
        },
        teacher04: {
            executor: 'ramping-vus',
            exec: 'teacher04',
            startTime: '0s',
            gracefulStop: '5s',
            stages: [
                // Ramp up               
                {
                    duration: '20s',
                    target: 2
                },
                // Hold
                {
                    duration: '2m',
                    target: 4
                },
                // Ramp down
                {
                    duration: '20s',
                    target: 0
                },
            ],
        },
        teacher05: {
            executor: 'ramping-vus',
            exec: 'teacher05',
            startTime: '0s',
            gracefulStop: '5s',
            stages: [
                // Ramp up               
                {
                    duration: '20s',
                    target: 2
                },
                // Hold
                {
                    duration: '0s',
                    target: 4
                },
                // Ramp down
                {
                    duration: '20s',
                    target: 0
                },
            ],
        },
        orgAdmin: {
            executor: 'ramping-vus',
            exec: 'orgAdmin',
            startTime: '0s',
            gracefulStop: '5s',
            stages: [
                // Ramp up               
                {
                    duration: '20s',
                    target: 2
                },
                // Hold
                {
                    duration: '0s',
                    target: 4
                },
                // Ramp down
                {
                    duration: '20s',
                    target: 0
                },
            ],
        },
    }
}

export function setup() {
    let i = 0;
    const l = 9;
    let data = {};

    for (i; i < l; i++) {
        const prefix = ('0' + i).slice(-2);
        const teacherLoginPayload = {
            deviceId: "webpage",
            deviceName: "k6",
            email: `${process.env.TEACHER_USERNAME}${prefix}@${process.env.EMAIL_DOMAIN}`,
            pw: process.env.PW as string,
        };
        
        const teacherLoginData = loginSetup(teacherLoginPayload);
        data = { 
            ...data, 
            [`teacher${prefix}`]: teacherLoginData,
        };
    }

    const orgAdminLoginPayload = {
        deviceId: "webpage",
        deviceName: "k6",
        email: process.env.EMAIL_ORG_ADMIN_1 as string,
        pw: process.env.PW as string,
    };
    
    const orgAdminLoginData = loginSetup(orgAdminLoginPayload);
    data = { 
        ...data, 
        [`orgAdmin`]: orgAdminLoginData,
    };    

    return data;
}

/* Filter options
{organizationUserStatus: {operator: "eq", value: "inactive"}}
{roleId: { operator: 'eq', value: process.env.ROLE_ID_STUDENT, }}
{schoolId: {operator: "eq", value: "7b11aaae-8e8b-4370-b8a7-6bb069088967"}}
{email: {operator: "contains", value: "edgardo"}}
*/

export function teacher00(data: { [key: string]: { res: any, userId: string }}) {
    getUsers({ count: 10 }, data.teacher00, [{ organizationUserStatus: {
        operator: 'eq',
        value: 'active',
    }}]);

    sleep(5);

    getUsers({ count: 50 }, data.teacher00, [{ organizationUserStatus: {
        operator: 'eq',
        value: 'active',
    }}]);
}

export function teacher01(data: { [key: string]: { res: any, userId: string }}) {
    getUsers({ count: 10 }, data.teacher01, [{ organizationUserStatus: {
        operator: 'eq',
        value: 'inactive',
    }}]);
}

export function teacher02(data: { [key: string]: { res: any, userId: string }}) {
    getUsers({ count: 10 }, data.teacher02, [{ roleId: {
        operator: 'eq',
        value: process.env.ROLE_ID_STUDENT as string,
    }}]);
}

export function teacher03(data: { [key: string]: { res: any, userId: string }}) {
    getUsers({ count: 10 }, data.teacher03, [{ roleId: {
        operator: 'eq',
        value: process.env.ROLE_ID_STUDENT as string,
    }}]);
}

export function teacher04(data: { [key: string]: { res: any, userId: string }}) {
    getUsers({ count: 10 }, data.teacher04, [
        { 
            roleId: {
                operator: 'eq',
                value: process.env.ROLE_ID_STUDENT as string,
            },
            email: {
                operator: "contains", 
                value: "edgardo"
            }
        }
    ]);
}

export function teacher05(data: { [key: string]: { res: any, userId: string }}) {
   getUsers({ count: 10 }, data.teacher05, [{email: {operator: "contains", value: "edgardo"}}]);
}

export function teacher06(data: { [key: string]: { res: any, userId: string }}) {
    getUsers({ count: 10 }, data.teacher05, [{schoolId: {operator: "eq", value: "7b11aaae-8e8b-4370-b8a7-6bb069088967"}}]);
 }

export function orgAdmin(data: { [key: string]: { res: any, userId: string }}) {
    getUsers({ count: 10 }, data.orgAdmin, [{ roleId: {
        operator: 'eq',
        value: process.env.ROLE_ID_STUDENT as string,
    }}]);
}