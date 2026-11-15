import { registerNode } from './nodes'

registerNode({
  type: 'callApi',
  label: 'Call API',
  description: 'Gọi thao tác CRUD của một entity',
  config: {
    entity: { type: 'entityRef', required: true },
    op: { type: 'enum', options: ['list', 'get', 'create', 'update', 'delete'], default: 'create' },
    idSource: { type: 'enum', options: ['values', 'param'], default: 'values' },
    saveAs: { type: 'string' },
  },
  hidden: (config) => (['get', 'update', 'delete'].includes(String(config.op)) ? [] : ['idSource']),
  validate: (config): Record<string, string> =>
    /^([A-Za-z][A-Za-z0-9_]*)?$/.test(String(config.saveAs ?? '')) ? {} : { saveAs: 'Chỉ gồm chữ, số, dấu gạch dưới' },
})

registerNode({
  type: 'condition',
  label: 'Condition',
  description: 'Rẽ nhánh đúng/sai theo giá trị',
  branches: true,
  config: {
    source: { type: 'enum', options: ['values', 'result'], default: 'values' },
    field: { type: 'string', required: true },
    operator: { type: 'enum', options: ['eq', 'neq', 'gt', 'lt', 'contains', 'empty'], default: 'eq' },
    value: { type: 'string' },
  },
  hidden: (config) => (config.operator === 'empty' ? ['value'] : []),
  validate: (config): Record<string, string> =>
    config.operator !== 'empty' && (config.value === undefined || config.value === '') ? { value: 'Bắt buộc' } : {},
})

registerNode({
  type: 'navigate',
  label: 'Navigate',
  description: 'Chuyển sang trang khác',
  config: { to: { type: 'route', required: true } },
})

registerNode({
  type: 'showMessage',
  label: 'Show message',
  description: 'Hiện thông báo',
  config: {
    kind: { type: 'enum', options: ['success', 'error', 'info'], default: 'success' },
    text: { type: 'string', required: true },
  },
})
