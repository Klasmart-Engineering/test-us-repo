import http from 'k6/http';
import { Options } from 'k6/options';
import loginSetup from './utils/loginSetup';
import endPointHomeRequest4 from './scripts/endPointHomeRequest4';

/*

Script that evaluates the endPoint:
https://kl2.loadtest.kidsloop.live/v1/schedules_time_view?end_at_le=1640746740&org_id=360b46fe-3579-42d4-9a39-dc48726d033f&start_at_ge=1639450800&time_zone_offset=-10800&view_type=full_view

*/

// command: k6 run -e VUS=1 -e DURATION=1m testEndPointLandingHome4.js
// For increase the VUS -> change the value of the variable: VUS
// For increase the duration -> change the value of the variable: DURATION

export const options: Options = {
    vus: __ENV.VUS ? parseInt(__ENV.VUS, 10) : 1,
    duration: __ENV.DURATION ?? '1m',
};

export function setup() {
    let data = {};
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

export default function(data: { [key: string]: { res: any, userId: string }}) {
    
    const jar = http.cookieJar();
    jar.set(process.env.COOKIE_URL as string, 'access', data.orgAdmin.res.cookies?.access[0].Value, {
        domain: process.env.COOKIE_DOMAIN,
    });
    jar.set(process.env.COOKIE_URL as string, 'refresh', data.orgAdmin.res.cookies?.refresh[0].Value, {
        domain: process.env.COOKIE_DOMAIN,
    });
    
    endPointHomeRequest4();
}