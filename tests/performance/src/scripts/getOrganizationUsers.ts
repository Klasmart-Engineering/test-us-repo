import { check } from 'k6';
import http from 'k6/http';
import { UserPayload } from '../interfaces/users';
import { getPaginatedOrganizationUsers } from '../queries/users';
import { Filter } from '../interfaces/filters';


const params = {
    headers: {
        'Content-Type': `application/json`,
    },
};

export default function (
    payload?: UserPayload,
    loginData?: { res: any, userId: string },
    filters?: Array<Filter> | null,
    cursor?: string
) {
    const filterData = filters ? 
        [{ OR: [ ...filters ] }] : [];

    if (loginData) {
        const jar = http.cookieJar();
            jar.set(process.env.COOKIE_URL as string, 'access', loginData.res.cookies?.access[0].Value, {
            domain: process.env.COOKIE_DOMAIN,
        });
        jar.set(process.env.COOKIE_URL as string, 'refresh', loginData.res.cookies?.refresh[0].Value, {
            domain: process.env.COOKIE_DOMAIN,
        });
    }

    const userPayload = JSON.stringify({
        variables: {
            direction: 'FORWARD',
            count: payload?.count || 10,
            order: 'ASC',
            orderBy: payload?.orderBy || 'givenName',
            cursor: cursor || '',
            filter: {
                organizationId: {
                    value: process.env.ORG_ID,
                    operator: 'eq',
                },
                AND: [
                    {
                        OR: [
                            {
                                givenName: {
                                    operator: 'contains',
                                    value: payload?.givenName || payload?.search || '',
                                    caseInsensitive: true,
                                }
                            },
                            {
                                familyName: {
                                    operator: 'contains',
                                    value: payload?.familyName || payload?.search || '',
                                    caseInsensitive: true,
                                }
                            },
                            {
                                email: {
                                    operator: 'contains',
                                    value: payload?.email|| payload?.search || '',
                                    caseInsensitive: true,
                                }
                            },
                            {
                                phone: {
                                    operator: 'contains',
                                    value: payload?.phone || payload?.search || '',
                                    caseInsensitive: true,
                                }
                            },
                        ],
                    },
                    ...filterData,
                ]
            },
        },
        operationName: 'getOrganizationUsers',
        query: getPaginatedOrganizationUsers,
    });

    const res = http.post(process.env.SERVICE_URL as string, userPayload, params);

    check(res, {
        '"Get paginated organization users" status is 200': () => res.status === 200,
        '"Get paginated organization users" query returns data': (r) => JSON.parse(r.body as string).data?.usersConnection?.edges ?? false,
    });

    const data = JSON.parse(res.body as string).data;
    return data?.usersConnection?.pageInfo;
}