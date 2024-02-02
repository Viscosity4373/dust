import type { ModelId } from "@dust-tt/types";

/**
 * From id to internalId
 */
export function getHelpCenterInternalId(
  connectorId: ModelId,
  helpCenterId: string
): string {
  return `intercom-help-center-${connectorId}-${helpCenterId}`;
}
export function getHelpCenterCollectionInternalId(
  connectorId: ModelId,
  collectionId: string
): string {
  return `intercom-collection-${connectorId}-${collectionId}`;
}
export function getHelpCenterArticleInternalId(
  connectorId: ModelId,
  articleId: string
): string {
  return `intercom-article-${connectorId}-${articleId}`;
}
export function getTeamInternalId(
  connectorId: ModelId,
  teamId: string
): string {
  return `intercom-team-${connectorId}-${teamId}`;
}

/**
 * From internalId to id
 */
function _getIdFromInternal(internalId: string, prefix: string): string | null {
  return internalId.startsWith(prefix) ? internalId.replace(prefix, "") : null;
}
export function getHelpCenterIdFromInternalId(
  connectorId: ModelId,
  internalId: string
): string | null {
  return _getIdFromInternal(internalId, `intercom-help-center-${connectorId}-`);
}
export function getHelpCenterCollectionIdFromInternalId(
  connectorId: ModelId,
  internalId: string
): string | null {
  return _getIdFromInternal(internalId, `intercom-collection-${connectorId}-`);
}
export function getHelpCenterArticleIdFromInternalId(
  connectorId: ModelId,
  internalId: string
): string | null {
  return _getIdFromInternal(internalId, `intercom-article-${connectorId}-`);
}
export function getTeamIdFromInternalId(
  connectorId: ModelId,
  internalId: string
): string | null {
  return _getIdFromInternal(internalId, `intercom-team-${connectorId}-`);
}
