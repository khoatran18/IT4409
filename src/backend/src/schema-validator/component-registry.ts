export interface ComponentRule {
  /** Prop bắt buộc: phải có và không rỗng */
  required?: string[];
  /** Cần ít nhất một trong các prop này */
  oneOf?: string[];
  /** Prop trỏ tới tên entity */
  entityProps?: string[];
  /** Giá trị mặc định điền ở bước normalize */
  defaults?: Record<string, unknown>;
}

/** Danh sách component đã biết; thêm component mới chỉ cần thêm một dòng ở đây. */
export const COMPONENT_REGISTRY: Record<string, ComponentRule> = {
  Text: { defaults: { content: 'Text' } },
  Heading: { defaults: { text: 'Tiêu đề', level: 2 } },
  Button: { defaults: { text: 'Button', variant: 'primary', disabled: false } },
  Input: { defaults: { type: 'text' } },
  Select: { oneOf: ['options', 'entity'], entityProps: ['entity'] },
  Checkbox: {},
  DatePicker: {},
  Form: {
    required: ['entity'],
    entityProps: ['entity'],
    defaults: { mode: 'create', submitText: 'Lưu' },
  },
  Table: {
    required: ['entity', 'columns'],
    entityProps: ['entity'],
    defaults: { pageSize: 10, actions: ['edit', 'delete'] },
  },
  Card: {},
  Container: { defaults: { direction: 'column', gap: 16 } },
  Modal: {},
};

/** Cột có sẵn ở mọi entity ngoài field người dùng khai báo */
export const SYSTEM_FIELDS = ['id', 'createdAt', 'updatedAt'] as const;

/** Tên field người dùng không được dùng vì server tự quản lý */
export const RESERVED_FIELD_NAMES = [
  'id',
  'createdAt',
  'updatedAt',
  'ownerId',
] as const;

/** Tên entity sẽ trùng với bảng/model UserApp tự sinh (auth, tuần 4) */
export const RESERVED_ENTITY_NAMES = ['User', 'RefreshToken'] as const;
