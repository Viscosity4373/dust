import type { Context } from "@temporalio/activity";
import { Worker } from "@temporalio/worker";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";

import { getTemporalWorkerConnection } from "@connectors/lib/temporal";
import { ActivityInboundLogInterceptor } from "@connectors/lib/temporal_monitoring";
import logger from "@connectors/logger/logger";

import * as activities from "./activities";
import { GARBAGE_COLLECT_QUEUE_NAME, QUEUE_NAME } from "./config";
import * as gc_activities from "./gc_activities";
import * as incremental_activities from "./incremental_activities";

export async function runZendeskWorkers() {
  const { connection, namespace } = await getTemporalWorkerConnection();
  const syncWorker = await Worker.create({
    workflowsPath: require.resolve("./workflows"),
    activities: { ...activities, ...incremental_activities },
    taskQueue: QUEUE_NAME,
    connection,
    reuseV8Context: true,
    namespace,
    maxConcurrentActivityTaskExecutions: 16,
    interceptors: {
      activityInbound: [
        (ctx: Context) => {
          return new ActivityInboundLogInterceptor(ctx, logger);
        },
      ],
    },
    bundlerOptions: {
      webpackConfigHook: (config) => {
        const plugins = config.resolve?.plugins ?? [];
        config.resolve!.plugins = [...plugins, new TsconfigPathsPlugin({})];
        return config;
      },
    },
  });

  const gcWorker = await Worker.create({
    workflowsPath: require.resolve("./workflows"),
    activities: { ...activities, ...gc_activities },
    taskQueue: GARBAGE_COLLECT_QUEUE_NAME,
    connection,
    reuseV8Context: true,
    namespace,
    maxConcurrentActivityTaskExecutions: 16,
    interceptors: {
      activityInbound: [
        (ctx: Context) => {
          return new ActivityInboundLogInterceptor(ctx, logger);
        },
      ],
    },
    bundlerOptions: {
      webpackConfigHook: (config) => {
        const plugins = config.resolve?.plugins ?? [];
        config.resolve!.plugins = [...plugins, new TsconfigPathsPlugin({})];
        return config;
      },
    },
  });

  // the run is blocking, we need to launch both workers in parallel
  await Promise.all([syncWorker.run(), gcWorker.run()]);
}
