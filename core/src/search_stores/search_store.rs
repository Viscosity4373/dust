use anyhow::Result;
use async_trait::async_trait;
use elasticsearch::{
    auth::Credentials,
    http::transport::{SingleNodeConnectionPool, TransportBuilder},
    Elasticsearch, IndexParts, SearchParts,
};
use serde_json::json;
use url::Url;

use crate::data_sources::node::Node;
use crate::{data_sources::data_source::Document, utils};
use tracing::{error, info};

#[derive(serde::Deserialize)]
pub struct NodesSearchOptions {
    limit: Option<usize>,
    offset: Option<usize>,
}

#[derive(serde::Deserialize)]
pub struct DatasourceViewFilter {
    data_source_id: String,
    view_filter: Vec<String>,
}

#[async_trait]
pub trait SearchStore {
    async fn search_nodes(
        &self,
        query: String,
        filter: Vec<DatasourceViewFilter>,
        options: Option<NodesSearchOptions>,
    ) -> Result<Vec<Node>>;
    async fn index_document(&self, document: &Document) -> Result<()>;
    fn clone_box(&self) -> Box<dyn SearchStore + Sync + Send>;
}

impl Default for NodesSearchOptions {
    fn default() -> Self {
        NodesSearchOptions {
            limit: Some(10),
            offset: Some(0),
        }
    }
}

impl Clone for Box<dyn SearchStore + Sync + Send> {
    fn clone(&self) -> Self {
        self.clone_box()
    }
}

#[derive(Clone)]
pub struct ElasticsearchSearchStore {
    pub client: Elasticsearch,
}

impl ElasticsearchSearchStore {
    pub async fn new(es_uri: &str, username: &str, password: &str) -> Result<Self> {
        let credentials = Credentials::Basic(username.to_string(), password.to_string());
        let u = Url::parse(es_uri)?;
        let conn_pool = SingleNodeConnectionPool::new(u);
        let mut transport_builder = TransportBuilder::new(conn_pool);
        transport_builder = transport_builder
            .auth(credentials)
            .disable_proxy()
            .cert_validation(elasticsearch::cert::CertificateValidation::None);
        let transport = transport_builder.build()?;
        let client = Elasticsearch::new(transport);
        Ok(Self { client })
    }
}

const NODES_INDEX_NAME: &str = "core.data_sources_nodes";

#[async_trait]
impl SearchStore for ElasticsearchSearchStore {
    async fn index_document(&self, document: &Document) -> Result<()> {
        let node = Node::from(document.clone());

        // todo(kw-search): fail on error
        let now = utils::now();
        match self
            .client
            .index(IndexParts::IndexId(NODES_INDEX_NAME, &document.document_id))
            .timeout("200ms")
            .body(node)
            .send()
            .await
        {
            Ok(_) => {
                info!(
                    duration = utils::now() - now,
                    document_id = document.document_id,
                    "[ElasticsearchSearchStore] Indexed document"
                );
                Ok(())
            }
            Err(e) => {
                error!(
                    error = %e,
                    duration = utils::now() - now,
                    document_id = document.document_id,
                    "[ElasticsearchSearchStore] Failed to index document"
                );
                Ok(())
            }
        }
    }

    async fn search_nodes(
        &self,
        query: String,
        filter: Vec<DatasourceViewFilter>,
        options: Option<NodesSearchOptions>,
    ) -> Result<Vec<Node>> {
        // First, collect all datasource_ids and their corresponding view_filters
        let mut filter_conditions = Vec::new();
        for f in filter {
            filter_conditions.push(json!({
                "bool": {
                    "must": [
                        { "term": { "data_source_id": f.data_source_id } },
                        { "terms": { "parents": f.view_filter } }
                    ]
                }
            }));
        }

        let options = options.unwrap_or_default();

        // then, search
        match self
            .client
            .search(SearchParts::Index(&[NODES_INDEX_NAME]))
            .from(options.offset.unwrap_or(0) as i64)
            .size(options.limit.unwrap_or(100) as i64)
            .body(json!({
                "query": {
                    "bool": {
                        "must": {
                            "match": {
                                "title.edge": query
                            }
                        },
                        "should": filter_conditions,
                        "minimum_should_match": 1
                    }
                }
            }))
            .send()
            .await
        {
            Ok(response) => {
                // get nodes from elasticsearch response in hits.hits
                let response_body = response.json::<serde_json::Value>().await?;
                let nodes: Vec<Node> = response_body["hits"]["hits"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|h| Node::from(h.get("_source").unwrap().clone()))
                    .collect();
                Ok(nodes)
            }
            Err(e) => Err(e.into()),
        }
    }

    fn clone_box(&self) -> Box<dyn SearchStore + Sync + Send> {
        Box::new(self.clone())
    }
}
