import http from "k6/http";
import randomNumber from './randomNumber';

const prefixLimit: number = !isNaN(parseInt(__ENV.PREFIX_LIMIT, 10)) ? parseInt(__ENV.PREFIX_LIMIT) : 9;

export default function(data: { [key: string]: { res: any, userId: string }}) {
    const jar = http.cookieJar();
    const random = ('0' + randomNumber(prefixLimit)).slice(-2);
    const accessCookie = data[`teacher${random}`].res.cookies?.access[0].Value;
    const refreshCookie = data[`teacher${random}`].res.cookies?.refresh[0].Value;

    jar.set(process.env.COOKIE_URL as string, 'access', accessCookie, {
        domain: process.env.COOKIE_DOMAIN,
    });
    jar.set(process.env.COOKIE_URL as string, 'refresh', refreshCookie, {
        domain: process.env.COOKIE_DOMAIN,
    });
}
