import faker from "faker";
import { Role } from "../../src/entities/role";

export function createRole() {
    const role = new Role();

    role.role_name = faker.random.word();

    return role;
}
