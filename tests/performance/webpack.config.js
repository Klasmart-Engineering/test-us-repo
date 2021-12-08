const path = require(`path`);
const Dotenv = require(`dotenv-webpack`);
const { CleanWebpackPlugin } = require(`clean-webpack-plugin`);

module.exports = {
    mode: `production`,
    context: path.join(__dirname, `src`),
    entry: {
        sequentialLogin: `./sequentialLogin.ts`,
        parallelLogin: `./parallelLogin.ts`,
        createUserBasic: `./createUserBasic`,
        createUsersAllRoles: `./createUsersAllRoles`,
        create1kUsers: `./create1kUsers`,
        createUsersParallel: `./createUsersParallel`,
        parallelLanding: `./parallelLanding.ts`,
        getPaginatedUsers: `./getPaginatedUsers.ts`,
        getPaginatedUsersCursor: `./getPaginatedUsersCursor.ts`,
        getPaginatedUsersFilter: `./getPaginatedUsersFilters.ts`,
        getPaginatedUsersMixed: `./getPaginatedUsersMixed.ts`,
        scenario9ASchoolAdmin: `./Scenarios/Scenario9/scenario9ASchoolAdmin.ts`,
        scenario9BSchoolAdmin: `./Scenarios/Scenario9/scenario9BSchoolAdmin.ts`,
        getPaginatedUsersCloud: `./getPaginatedUsersCloud.ts`,
        getPaginatedUsersCursorCloud: `./getPaginatedUsersCursorCloud.ts`,
        getPaginatedUsersFiltersCloud: `./getPaginatedUsersFiltersCloud.ts`,
        getPaginatedUsersMixedCloud: `./getPaginatedUsersMixedCloud.ts`,

        parallelLandingSchedule: `./parallelLandingSchedule.ts`,
        create1kSchools: `./create1kschools.ts`
        

    },
    output: {
        path: path.join(__dirname, `dist`),
        libraryTarget: `commonjs`,
        filename: `[name].js`,
    },
    resolve: {
        extensions: [ `.ts`, `.js` ],
        modules: [
            path.resolve(__dirname, 'node_modules'),
            path.resolve(__dirname, '../node_modules'),
            'node_modules'
        ]
    },
    module: {
        rules: [
            {
                use: [{ loader: 'babel-loader' }, { loader: 'ts-loader' }],
                test: /\.ts$/,
            },
        ],
    },
    target: `web`,
    externals: /^(k6|https?:\/\/)(\/.*)?/,
    stats: {
        colors: true,
    },
    plugins: [ new CleanWebpackPlugin(), new Dotenv() ],
};