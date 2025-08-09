import registry from '..';
import MilvusDetailRenderer from './MilvusDetailRenderer';

registry.registerMessageType({
  type: ['milvus_qa_search', 'milvus_hybrid_search', 'milvus_product_search', 'milvus_tariff_search'],
  detailRenderer: MilvusDetailRenderer,
});
