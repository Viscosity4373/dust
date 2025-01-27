import type {
  ContentNodesViewType,
  DataSourceViewType,
  LightWorkspaceType,
} from "@dust-tt/types";
import type { PaginationState } from "@tanstack/react-table";
import { useMemo } from "react";
import type { Fetcher, KeyedMutator, SWRConfiguration } from "swr";

import {
  appendPaginationParams,
  fetcher,
  fetcherMultiple,
  fetcherWithBody,
  useSWRWithDefaults,
} from "@app/lib/swr/swr";
import type { GetDataSourceViewsResponseBody } from "@app/pages/api/w/[wId]/data_source_views";
import type { GetDataSourceViewContentNodes } from "@app/pages/api/w/[wId]/spaces/[spaceId]/data_source_views/[dsvId]/content-nodes";
import type { GetDataSourceConfigurationResponseBody } from "@app/pages/api/w/[wId]/spaces/[spaceId]/data_sources/[dsId]/configuration";

type DataSourceViewsAndInternalIds = {
  dataSourceView: DataSourceViewType;
  internalIds: string[];
};
type DataSourceViewsAndNodes = {
  dataSourceView: DataSourceViewType;
  nodes: GetDataSourceViewContentNodes["nodes"];
};

export function useDataSourceViews(
  owner: LightWorkspaceType,
  options = { disabled: false }
) {
  const { disabled } = options;
  const dataSourceViewsFetcher: Fetcher<GetDataSourceViewsResponseBody> =
    fetcher;
  const { data, error, mutate } = useSWRWithDefaults(
    `/api/w/${owner.sId}/data_source_views`,
    dataSourceViewsFetcher,
    { disabled }
  );

  return {
    dataSourceViews: useMemo(() => (data ? data.dataSourceViews : []), [data]),
    isDataSourceViewsLoading: disabled ? false : !error && !data,
    isDataSourceViewsError: disabled ? false : error,
    mutateDataSourceViews: mutate,
  };
}

export function useMultipleDataSourceViewsContentNodes({
  dataSourceViewsAndInternalIds,
  owner,
  viewType,
}: {
  dataSourceViewsAndInternalIds: DataSourceViewsAndInternalIds[];
  owner: LightWorkspaceType;
  viewType: ContentNodesViewType;
}): {
  dataSourceViewsAndNodes: DataSourceViewsAndNodes[];
  isNodesLoading: boolean;
  isNodesError: boolean;
} {
  const urlsAndOptions = dataSourceViewsAndInternalIds.map(
    ({ dataSourceView, internalIds }) => {
      const url = `/api/w/${owner.sId}/spaces/${dataSourceView.spaceId}/data_source_views/${dataSourceView.sId}/content-nodes`;
      const body = JSON.stringify({
        internalIds,
        viewType,
      });
      const options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      };
      return { url, options };
    }
  );

  const { data: results, error } = useSWRWithDefaults(
    urlsAndOptions,
    fetcherMultiple<GetDataSourceViewContentNodes>
  );
  const isNodesError = !!error;
  const isNodesLoading = !results?.every((r) => r.nodes);

  return useMemo(
    () => ({
      dataSourceViewsAndNodes: dataSourceViewsAndInternalIds.map(
        ({ dataSourceView }, i) => ({
          dataSourceView,
          nodes: results ? results[i].nodes : [],
        })
      ),
      isNodesError,
      isNodesLoading,
    }),
    [dataSourceViewsAndInternalIds, isNodesError, isNodesLoading, results]
  );
}

export function useDataSourceViewContentNodes({
  owner,
  dataSourceView,
  internalIds,
  parentId,
  pagination,
  viewType,
  disabled = false,
  swrOptions,
  showConnectorsNodes,
}: {
  owner: LightWorkspaceType;
  dataSourceView?: DataSourceViewType;
  internalIds?: string[];
  parentId?: string;
  pagination?: PaginationState;
  viewType?: ContentNodesViewType;
  disabled?: boolean;
  swrOptions?: SWRConfiguration;
  // TODO(20250126, nodes-core): Remove this after project end
  showConnectorsNodes?: boolean;
}): {
  isNodesError: boolean;
  isNodesLoading: boolean;
  isNodesValidating: boolean;
  mutate: KeyedMutator<GetDataSourceViewContentNodes>;
  mutateRegardlessOfQueryParams: KeyedMutator<GetDataSourceViewContentNodes>;
  nodes: GetDataSourceViewContentNodes["nodes"];
  totalNodesCount: number;
} {
  const params = new URLSearchParams();
  appendPaginationParams(params, pagination);

  if (showConnectorsNodes) {
    params.set("connNodes", "true");
  }

  const url = dataSourceView
    ? `/api/w/${owner.sId}/spaces/${dataSourceView.spaceId}/data_source_views/${dataSourceView.sId}/content-nodes?${params}`
    : null;

  const body = {
    internalIds,
    parentId,
    viewType,
  };

  const fetchKey = JSON.stringify([url + "?" + params.toString(), body]);

  const { data, error, mutate, isValidating, mutateRegardlessOfQueryParams } =
    useSWRWithDefaults(
      fetchKey,
      async () => {
        if (!url) {
          return undefined;
        }

        return fetcherWithBody([
          url,
          { internalIds, parentId, viewType },
          "POST",
        ]);
      },
      {
        ...swrOptions,
        disabled: disabled || !viewType,
      }
    );

  return {
    isNodesError: !!error,
    isNodesLoading: !error && !data,
    isNodesValidating: isValidating,
    mutate,
    mutateRegardlessOfQueryParams,
    nodes: useMemo(() => (data ? data.nodes : []), [data]),
    totalNodesCount: data ? data.total : 0,
  };
}

export function useDataSourceViewConnectorConfiguration({
  dataSourceView,
  owner,
}: {
  dataSourceView: DataSourceViewType | null;
  owner: LightWorkspaceType;
}) {
  const dataSourceViewDocumentFetcher: Fetcher<GetDataSourceConfigurationResponseBody> =
    fetcher;
  const disabled = !dataSourceView;

  const { data, error, mutate } = useSWRWithDefaults(
    disabled
      ? null
      : `/api/w/${owner.sId}/spaces/${dataSourceView.spaceId}/data_sources/${dataSourceView.dataSource.sId}/configuration`,
    dataSourceViewDocumentFetcher
  );

  return {
    configuration: data ? data.configuration : null,
    mutateConfiguration: mutate,
    isConfigurationLoading: !disabled && !error && !data,
    isConfigurationError: error,
  };
}
