import { check } from 'k6';
import http from 'k6/http';
import { meMembershipForCMS } from '../queries/cms';

const params = {
    headers: {
        'Content-Type': `application/json`,
    },
};

export default function () {

    const userPayload = JSON.stringify({
        variables: {},
        query: meMembershipForCMS(process.env.ORG_ID as string),
    });

    const res = http.post(process.env.SERVICE_URL as string, userPayload, params);

    check(res, {
        '"Get meMembershipForCMS" status is 200': () => res.status === 200,
        '"Get meMembershipForCMS" query returns data': (r) => JSON.parse(r.body as string).data !== undefined,
    });

}