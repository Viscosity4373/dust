import type { LightWorkspaceType } from "@dust-tt/types";
import { assertNever } from "@dust-tt/types";
import type { Connection } from "auth0";

import { getAuth0ManagemementClient } from "@app/lib/api/auth0";
import config from "@app/lib/api/config";
import type { Authenticator } from "@app/lib/auth";
import type {
  IdpSpecificConnectionTypeDetails,
  SAMLConnectionTypeDetails,
} from "@app/pages/api/w/[wId]/enterprise-connection";

function makeEnterpriseConnectionName(workspaceId: string) {
  return `workspace-${workspaceId}`;
}

export function makeEnterpriseConnectionInitiateLoginUrl(workspaceId: string) {
  return `${config.getClientFacingUrl()}/api/auth/login?connection=${makeEnterpriseConnectionName(
    workspaceId
  )}`;
}

export function makeAudienceUri(owner: LightWorkspaceType) {
  return `${config.getAuth0AudienceUri()}:${makeEnterpriseConnectionName(owner.sId)}`;
}

export function makeSamlAcsUrl(owner: LightWorkspaceType) {
  return `https://${config.getAuth0TenantUrl()}/login/callback?connection=${makeEnterpriseConnectionName(owner.sId)}`;
}

export async function getEnterpriseConnectionForWorkspace(auth: Authenticator) {
  const owner = auth.getNonNullableWorkspace();

  const expectedConnectionName = makeEnterpriseConnectionName(owner.sId);

  const connections = await getAuth0ManagemementClient().connections.getAll({
    name: expectedConnectionName,
  });

  return connections.data.find((c) => c.name === expectedConnectionName);
}

type EnterpriseConnectionDetails =
  | IdpSpecificConnectionTypeDetails
  | SAMLConnectionTypeDetails;

export async function createEnterpriseConnection(
  auth: Authenticator,
  verifiedDomain: string,
  connectionDetails: EnterpriseConnectionDetails
): Promise<Connection> {
  const owner = auth.getNonNullableWorkspace();

  const { sId } = owner;
  const connection = await getAuth0ManagemementClient().connections.create({
    name: makeEnterpriseConnectionName(sId),
    display_name: makeEnterpriseConnectionName(sId),
    strategy: connectionDetails.strategy,
    options: {
      ...getCreateConnectionPayloadFromConnectionDetails(connectionDetails),
      domain_aliases: [verifiedDomain],
      scope: "email profile openid",
    },
    is_domain_connection: false,
    realms: [],
    enabled_clients: [config.getAuth0WebApplicationId()],
    metadata: {},
  });

  return connection.data;
}

export async function deleteEnterpriseConnection(auth: Authenticator) {
  const existingConnection = await getEnterpriseConnectionForWorkspace(auth);
  if (!existingConnection) {
    throw new Error("Enterprise connection not found.");
  }

  return getAuth0ManagemementClient().connections.delete({
    id: existingConnection.id,
  });
}

function getCreateConnectionPayloadFromConnectionDetails(
  connectionDetails: EnterpriseConnectionDetails
) {
  switch (connectionDetails.strategy) {
    case "okta":
      return {
        domain: connectionDetails.domain,
        strategy: connectionDetails.strategy,
        client_id: connectionDetails.clientId,
        client_secret: connectionDetails.clientSecret,
      };

    case "waad":
      return {
        tenant_domain: connectionDetails.domain,
        strategy: connectionDetails.strategy,
        client_id: connectionDetails.clientId,
        client_secret: connectionDetails.clientSecret,
        // We trust the email from WAAD enterprise connection.
        should_trust_email_verified_connection: "always_set_emails_as_verified",
      };

    case "samlp":
      return {
        strategy: connectionDetails.strategy,
        signingCert: connectionDetails.x509SignInCertificate,
        signInEndpoint: connectionDetails.signInUrl,
      };

    default:
      assertNever(connectionDetails);
  }
}
