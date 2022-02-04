import { sleep } from 'k6';
import http from 'k6/http';
import contentsFolder from './scripts/contentsFolder';
import createNewContentPlan from './scripts/createNewContentPlan';
import getCmsMemberships from './scripts/getCmsMemberships';
import getCmsMemberships2 from './scripts/getCmsMemberships2';
import meQueryBasic from './scripts/meQueryBasic';
import userSettings from './scripts/userSettings';
import { loginSetupV2 as loginSetup } from './utils/loginSetupV2';

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
    
    userSettings();
    sleep(0.1);
    getCmsMemberships();
    sleep(0.1);
    getCmsMemberships2();
    sleep(0.1);
    meQueryBasic()
    sleep(20);
    createNewContentPlan();
    contentsFolder();
}