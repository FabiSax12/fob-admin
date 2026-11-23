/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	app(input) {
		return {
			name: "fob-admin",
			removal: input?.stage === "production" ? "retain" : "remove",
			protect: ["production"].includes(input?.stage),
			home: "aws",
		};
	},
	async run() {
		const table = new sst.aws.Dynamo("Data", {
			fields: { pk: "string", sk: "string", gsi1pk: "string", gsi1sk: "string" },
			primaryIndex: { hashKey: "pk", rangeKey: "sk" },
			globalIndexes: {
				gsi1: { hashKey: "gsi1pk", rangeKey: "gsi1sk" },
			},
		});

		const bucket = new sst.aws.Bucket("Scores", {
			cors: {
				allowOrigins: ["*"],
				allowMethods: ["GET", "PUT"],
				allowHeaders: ["*"],
			},
		});

		const secrets = {
			googleClientId: new sst.Secret("GoogleClientId"),
			googleClientSecret: new sst.Secret("GoogleClientSecret"),
			sessionSecret: new sst.Secret("SessionSecret"),
			bandCalendarRefreshToken: new sst.Secret("BandCalendarRefreshToken"),
		};

		const web = new sst.aws.TanStackStart("Web", {
			link: [table, bucket, ...Object.values(secrets)],
		});

		return { url: web.url };
	},
});
