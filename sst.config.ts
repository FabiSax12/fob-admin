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
			// A musician replacing a part PDF by mistake can be undone from an older version.
			versioning: true,
		});

		new aws.s3.BucketLifecycleConfiguration("ScoresLifecycle", {
			bucket: bucket.name,
			rules: [
				{
					id: "expire-staged-uploads",
					status: "Enabled",
					filter: { prefix: "staging/" },
					expiration: { days: 1 },
					// Versioning keeps deleted staged files as noncurrent versions; purge them too.
					noncurrentVersionExpiration: { noncurrentDays: 1 },
				},
				{
					id: "expire-replaced-versions",
					status: "Enabled",
					filter: {},
					noncurrentVersionExpiration: { noncurrentDays: 30 },
					expiration: { expiredObjectDeleteMarker: true },
				},
			],
		});

		const secrets = {
			googleClientId: new sst.Secret("GoogleClientId"),
			googleClientSecret: new sst.Secret("GoogleClientSecret"),
			sessionSecret: new sst.Secret("SessionSecret"),
			bandCalendarRefreshToken: new sst.Secret("BandCalendarRefreshToken"),
			/** Public origin of the app, e.g. https://fob.example.com. Used as the OAuth redirect base. */
			publicUrl: new sst.Secret("PublicUrl"),
		};

		/** Async publish effects: Google Calendar sync and one setlist PDF per musician. */
		const publishEffects = new sst.aws.Function("PublishEffects", {
			handler: "functions/publish-effects.handler",
			link: [
				table,
				bucket,
				secrets.googleClientId,
				secrets.googleClientSecret,
				secrets.bandCalendarRefreshToken,
				secrets.publicUrl,
			],
			timeout: "5 minutes",
			memory: "1024 MB",
			runtime: "nodejs22.x",
		});

		const web = new sst.aws.TanStackStart("Web", {
			link: [table, bucket, publishEffects, ...Object.values(secrets)],
		});

		return { url: web.url };
	},
});
