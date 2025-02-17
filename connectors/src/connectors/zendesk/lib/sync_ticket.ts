import type { ModelId } from "@dust-tt/types";
import { MIME_TYPES } from "@dust-tt/types";
import TurndownService from "turndown";

import type {
  ZendeskFetchedTicket,
  ZendeskFetchedTicketComment,
  ZendeskFetchedUser,
} from "@connectors/@types/node-zendesk";
import { filterCustomTags } from "@connectors/connectors/shared/tags";
import { getTicketInternalId } from "@connectors/connectors/zendesk/lib/id_conversions";
import {
  deleteDataSourceDocument,
  renderDocumentTitleAndContent,
  renderMarkdownSection,
  upsertDataSourceDocument,
} from "@connectors/lib/data_sources";
import logger from "@connectors/logger/logger";
import { ZendeskTicketResource } from "@connectors/resources/zendesk_resources";
import type { DataSourceConfig } from "@connectors/types/data_source_config";

const turndownService = new TurndownService();

function apiUrlToDocumentUrl(apiUrl: string): string {
  return apiUrl.replace("/api/v2/", "/").replace(".json", "");
}

export function extractMetadataFromDocumentUrl(ticketUrl: string): {
  brandSubdomain: string;
  ticketId: number;
} {
  // Format: https://${subdomain}.zendesk.com/tickets/${ticketId}.
  const match = ticketUrl.match(
    /^https:\/\/([^.]+)\.zendesk\.com\/tickets\/#?(\d+)/
  );
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid ticket URL: ${ticketUrl}`);
  }
  return {
    brandSubdomain: match[1],
    ticketId: parseInt(match[2], 10),
  };
}

/**
 * Deletes a ticket from the db and the data sources.
 */
export async function deleteTicket({
  connectorId,
  brandId,
  ticketId,
  dataSourceConfig,
  loggerArgs,
}: {
  connectorId: ModelId;
  brandId: number;
  ticketId: number;
  dataSourceConfig: DataSourceConfig;
  loggerArgs: Record<string, string | number | null>;
}): Promise<void> {
  logger.info(
    { ...loggerArgs, connectorId, ticketId },
    "[Zendesk] Deleting ticket."
  );
  await deleteDataSourceDocument(
    dataSourceConfig,
    getTicketInternalId({ connectorId, brandId, ticketId })
  );
  await ZendeskTicketResource.deleteByTicketId({
    connectorId,
    brandId,
    ticketId,
  });
}

/**
 * Syncs a ticket in the db and upserts it to the data sources.
 */
export async function syncTicket({
  connectorId,
  ticket,
  brandId,
  currentSyncDateMs,
  dataSourceConfig,
  loggerArgs,
  forceResync,
  comments,
  users,
}: {
  connectorId: ModelId;
  dataSourceConfig: DataSourceConfig;
  ticket: ZendeskFetchedTicket;
  brandId: number;
  currentSyncDateMs: number;
  loggerArgs: Record<string, string | number | null>;
  forceResync: boolean;
  comments: ZendeskFetchedTicketComment[];
  users: ZendeskFetchedUser[];
}) {
  let ticketInDb = await ZendeskTicketResource.fetchByTicketId({
    connectorId,
    brandId,
    ticketId: ticket.id,
  });

  const createdAtDate = new Date(ticket.created_at);
  const updatedAtDate = new Date(ticket.updated_at);

  const shouldPerformUpsertion =
    forceResync ||
    !ticketInDb ||
    !ticketInDb.lastUpsertedTs ||
    ticketInDb.lastUpsertedTs < updatedAtDate;

  // Tickets can be created without a subject using the API or by email,
  // if they were never attended in the Agent Workspace their subject is not populated.
  ticket.subject ||= "No subject";

  const ticketUrl = apiUrlToDocumentUrl(ticket.url);
  if (!ticketInDb) {
    ticketInDb = await ZendeskTicketResource.makeNew({
      blob: {
        subject: ticket.subject,
        url: ticketUrl,
        lastUpsertedTs: new Date(currentSyncDateMs),
        ticketUpdatedAt: updatedAtDate,
        ticketId: ticket.id,
        brandId,
        permission: "read",
        connectorId,
      },
    });
  } else {
    await ticketInDb.update({
      subject: ticket.subject,
      url: ticketUrl,
      lastUpsertedTs: new Date(currentSyncDateMs),
      ticketUpdatedAt: updatedAtDate,
      permission: "read",
    });
  }

  if (!shouldPerformUpsertion) {
    logger.info(
      {
        ...loggerArgs,
        connectorId,
        ticketId: ticket.id,
        ticketUpdatedAt: updatedAtDate,
        dataSourceLastUpsertedAt: ticketInDb?.lastUpsertedTs ?? null,
      },
      "[Zendesk] Ticket already up to date. Skipping sync."
    );
    return;
  }

  if (comments.length > 0) {
    logger.info(
      {
        ...loggerArgs,
        connectorId,
        ticketId: ticket.id,
        ticketUpdatedAt: updatedAtDate,
        dataSourceLastUpsertedAt: ticketInDb?.lastUpsertedTs ?? null,
      },
      "[Zendesk] Upserting ticket."
    );

    const ticketContent = `Conversation:\n${comments
      .map((comment) => {
        let author;
        try {
          author = users.find((user) => user.id === comment.author_id);
        } catch (e) {
          logger.warn(
            { connectorId, e, usersType: typeof users, ...loggerArgs },
            "[Zendesk] Error finding the author of a comment."
          );
          author = null;
        }
        return `[${comment?.created_at}] ${author ? `${author.name} (${author.email})` : "Unknown User"}:\n${(comment.plain_body || comment.body).replace(/[\u2028\u2029]/g, "")}`; // removing line and paragraph separators
      })
      .join("\n")}
`.trim();

    const ticketContentInMarkdown = turndownService.turndown(ticketContent);

    const renderedMarkdown = await renderMarkdownSection(
      dataSourceConfig,
      ticketContentInMarkdown
    );

    const metadata = {
      priority: ticket.priority,
      ticketType: ticket.type,
      channel: ticket.via?.channel,
      status: ticket.status,
      ...(ticket.group_id ? { groupId: ticket.group_id.toString() } : {}),
      ...(ticket.organization_id
        ? { organizationId: ticket.organization_id.toString() }
        : {}),
      ...(ticket.due_at
        ? { dueDate: `${new Date(ticket.due_at).toISOString()}` }
        : {}),
      satisfactionRating: ticket.satisfaction_rating.score,
      hasIncidents: ticket.has_incidents ? "Yes" : "No",
    };

    const documentContent = await renderDocumentTitleAndContent({
      dataSourceConfig,
      title: ticket.subject,
      content: renderedMarkdown,
      createdAt: createdAtDate,
      updatedAt: updatedAtDate,
      additionalPrefixes: {
        ...metadata,
        labels: ticket.tags.join(", ") || "none",
        customFields:
          ticket.custom_fields.map(({ value }) => value).join(", ") || "none",
      },
    });

    const documentId = getTicketInternalId({
      connectorId,
      brandId,
      ticketId: ticket.id,
    });

    const metadataAsTags = [];
    for (const [key, value] of Object.entries(metadata)) {
      metadataAsTags.push(`${key}:${value}`);
    }

    const parents = ticketInDb.getParentInternalIds(connectorId);
    await upsertDataSourceDocument({
      dataSourceConfig,
      documentId,
      documentContent,
      documentUrl: ticketUrl,
      timestampMs: updatedAtDate.getTime(),
      tags: [
        `title:${ticket.subject}`,
        `updatedAt:${updatedAtDate.getTime()}`,
        `createdAt:${createdAtDate.getTime()}`,
        ...metadataAsTags,
        ...ticket.custom_fields.map(({ id, value }) => `${id}:${value}`),
        ...filterCustomTags(ticket.tags, logger),
      ],
      parents,
      parentId: parents[1],
      loggerArgs: { ...loggerArgs, ticketId: ticket.id },
      upsertContext: { sync_type: "batch" },
      title: ticket.subject,
      mimeType: MIME_TYPES.ZENDESK.TICKET,
      async: true,
    });
    await ticketInDb.update({ lastUpsertedTs: new Date(currentSyncDateMs) });
  } else {
    logger.warn(
      { ...loggerArgs, connectorId, ticketId: ticket.id },
      "[Zendesk] Ticket has no content or comments. Skipping sync."
    );
  }
}
