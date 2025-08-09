import registry from '..';
import MySqlDetailRenderer from './MySqlDetailRenderer';
import { ToolIconCode } from '../common/icons';

registry.registerMessageType({
  type: [
    'execute_sql',
    'list_tables',
    'describe_table',
    'show_databases',
    'show_create_table',
    'show_index',
    'show_variables',
    'show_status',
    'mysql_query',
  ],
  detailRenderer: MySqlDetailRenderer,
  icon: ToolIconCode,
});
